import { Glob } from 'bun';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	Events,
	GuildMember,
	MessageEditOptions,
	type Interaction,
	type Message,
} from 'discord.js';
import { nanoid } from 'nanoid/non-secure';
import path from 'path';
import PinoLogger from 'pino';
import { inspect } from 'util';
import commandHandler from '..';
import { cacheCommand, getCachedCommand } from '../util/database';
import { getEmoji } from '../util/emojis';
import type ICommand from './interfaces/ICommand';
import type { CommandContext } from './interfaces/ICommand';
import { IContextCommand } from './interfaces/IContextCommand';
import type LegacyHandler from './interfaces/ILegacyHandler';
import type SlashHandler from './interfaces/ISlashHandler';
import LegacyCommandHandler from './LegacyHandler';
import ListenerHandler from './ListenerHandler';
import SlashCommandHandler from './SlashHandler';
import { ArgumentMap } from './validations/5_args';
interface RequiredShits {
	commandsDir: string;
	contextCommandsDir: string;
	listenersDir: string;
	verbose?: boolean;
}

type ICommandHandler = LegacyHandler & SlashHandler & RequiredShits;
// same as the above but without some types so we can declare it in the constructor
interface IMCommandHandler extends Omit<LegacyHandler & SlashHandler & RequiredShits, 'categoryDirs' | 'commands'> { }

export default class CommandHandler {
	public prisma: ICommandHandler['prisma'];
	public kazagumo: ICommandHandler['kazagumo'];
	public client: ICommandHandler['client'];
	public developers: ICommandHandler['developers'];
	public commands: ICommandHandler['commands'] | undefined;
	public prodMode: ICommandHandler['prodMode'];
	public verbose: ICommandHandler['verbose'];
	private glob = new Glob('**/*.{ts,js}');
	private validations: Function[] = [];
	public logger = PinoLogger({
		name: import.meta.dirname.split('/')[import.meta.dirname.split('/').length - 3],
	});
	constructor(mHandler: IMCommandHandler) {
		const handler = mHandler as ICommandHandler;
		const { commandsDir, listenersDir, contextCommandsDir } = handler;
		this.prisma = handler.prisma;
		this.kazagumo = handler.kazagumo;
		this.client = handler.client;
		this.developers = handler.developers;
		this.prodMode = handler.prodMode;
		this.verbose = handler.verbose || false;
		handler.commands = [];
		handler.client.on(Events.ClientReady, async () => {
			this.validations = await (async () => {
				const validationDir = path.join(import.meta.dir, 'validations');
				const validationFiles = [];
				const glob = this.glob.scanSync({ cwd: validationDir });
				for await (const vFile of glob) {
					validationFiles.push(vFile);
				}
				const validations = await Promise.all(validationFiles.map(async (vFile) => {
					const validation = await import(path.join(validationDir, vFile));
					return validation.default;
				}));
				return validations;
			})();

			const start = Date.now();
			const commandPaths = [];
			const contextCommandPaths = [];
			const commandInits: Function[] = [];
			for (const file of this.glob.scanSync({
				absolute: false,
				cwd: commandsDir,
			})) {
				commandPaths.push(file);
			}
			for (const file of this.glob.scanSync({
				absolute: false,
				cwd: contextCommandsDir,
			})) {
				contextCommandPaths.push(file);
			}

			await Promise.all(commandPaths.map(async (file) => {
				const start = Date.now();
				const categoryName = file.split('/').slice(-2, -1)[0];
				const command = (await import(path.join(commandsDir, file))).default;
				const commandName = command.name || file.split('/').pop()!.split('.')[0];
				const modifiedData: ICommand = Object.assign({}, command, {
					name: commandName,
					category: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
					aliases: command.aliases || [],
				});
				// if (modifiedData.disabled) continue;
				handler.commands.push(modifiedData);
				if (modifiedData.init && !modifiedData.disabled) commandInits.push(modifiedData.init)//await modifiedData.init(this);
				if (mHandler.verbose)
					this.logger.info(`Initialized command ${modifiedData.name} in ${modifiedData.category} in ${Date.now() - start}ms`);
			}));
			await Promise.all(contextCommandPaths.map(async (file) => {
				const commandName = file.split('/').pop()!.split('.')[0];
				const command = (await import(path.join(contextCommandsDir, file))).default as IContextCommand;
				const modifiedData: IContextCommand = Object.assign({}, command, {
					name: command.name || commandName,
				});
				handler.commands.push(modifiedData);
				if (mHandler.verbose)
					this.logger.info(`Initialized Context Command ${modifiedData.name}`);
			}));
			Promise.all(commandInits.map((init) => {
				init(handler);
			}));
			const total = Date.now() - start;
			this.logger.info(`Initialized ${handler.commands.length} commands in ${total}ms`);
			const Ilegacy = handler as LegacyHandler;
			const Islash = handler as SlashHandler;
			const slash = new SlashCommandHandler(Islash, this);
			const legacy = new LegacyCommandHandler(Ilegacy, this);
			this.commands = handler.commands;
			// listener
			const listener = new ListenerHandler(this, listenersDir, this.glob);
		});
	}

	public async executeCommand(cmd: ICommand | IContextCommand, ctx: Interaction | Message) {
		try {
			if ('aliases' in cmd) {
				const start = Date.now();
				const command = cmd as ICommand;
				if (command.disabled) return { content: 'This command is disabled', ephemeral: true };
				let playerTime = undefined;
				let contextTime = undefined;
				let validationTime = undefined;
				let commandContext: CommandContext;
				const getPlayer = async (member: GuildMember) => {
					const start = Date.now();
					if (!member || !member.guild) return;
					if (!member.voice.channelId) return;
					let player = this.kazagumo.getPlayer(member.guild.id);
					if (player && player.voiceId !== member.voice.channelId) return;
					if (!player && command.needsPlayer)
						player = await this.kazagumo.createPlayer({
							guildId: member.guild.id,
							voiceId: member.voice.channelId,
							textId: member.voice.channelId,
							// deaf: true,
						});
					playerTime = Date.now() - start;
					return player;
				};
				if (ctx.applicationId) {
					const start = Date.now();
					const interaction = ctx as ChatInputCommandInteraction;
					commandContext = {
						interaction,
						user: interaction.user,
						channel: interaction.channel!,
						guild: interaction.guild!,
						handler: this,
						member: interaction.member! as GuildMember,
						args: new ArgumentMap(),
						message: null,
						player: (await getPlayer(interaction.member as GuildMember)) || undefined,
						editReply: async (content) => {
							await interaction.editReply(content);
						}
					};
					contextTime = Date.now() - start;
				} else {
					const start = Date.now();
					const message = ctx as Message;
					commandContext = {
						interaction: null,
						user: message.author,
						channel: message.channel,
						guild: message.guild!,
						handler: this,
						member: message.member!,
						args: new ArgumentMap(),
						message,
						player: (await getPlayer(message.member as GuildMember)) || undefined,
						editReply: async (content, rMsg) => {
							// get the replied message
							if (!rMsg) return;
							await rMsg.edit(content as string | MessageEditOptions);
						}
					};
					contextTime = Date.now() - start;
				}
				const vStart = Date.now();
				const validationResults = await Promise.all(this.validations.map(validation => validation(command, commandContext)));
				for (const result of validationResults) {
					if (result !== true) return result;
				}
				validationTime = Date.now() - vStart;
				this.prisma.user.upsert({
					where: {
						id: commandContext.user.id,
					},
					update: {
						name: commandContext.user.username,
						avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
						commands: {
							create: {
								commandId: command.name!,
								commandInfo: {
									args: (commandContext.args as any) || null,
									guild: (commandContext?.guild && commandContext.guild.id) || null,
									channel: commandContext?.channel?.id || null,
									message: commandContext?.message?.id || null,
									interaction: commandContext?.interaction?.id || null,
								},
							},
						},
					},
					create: {
						id: commandContext.user.id,
						name: commandContext.user.username,
						avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
						commands: {
							create: {
								commandId: command.name!,
								commandInfo: {
									args: (commandContext.args as any) || null,
									guild: commandContext?.guild?.id || null,
									channel: commandContext?.channel?.id || null,
									message: commandContext?.message?.id || null,
									interaction: commandContext?.interaction?.id || null,
								},
							},
						},
					},
				});
				const eStart = Date.now();
				if (command.shouldCache && commandContext.guild.id && commandContext.user.id) {
					const cachedCommand = await getCachedCommand(command.id!, JSON.stringify(commandContext.args), commandContext.user.id, commandContext.guild.id);
					if (cachedCommand) {
						return cachedCommand;
					}
				}
				const result = await command.execute(commandContext);
				const executionTime = Date.now() - eStart;
				if (command.shouldCache && commandContext.guild.id && commandContext.user.id && result) {
					await cacheCommand(command.id!, JSON.stringify(commandContext.args), commandContext.user.id, commandContext.guild.id, JSON.stringify(result));
				}
				const cacheTime = Date.now() - executionTime - eStart;
				const total = Date.now() - start;
				if (commandHandler.verbose) {
					commandHandler.logger.info(`Executed command ${command.name} in ${total}ms (execuntion: ${executionTime}, context: ${contextTime}ms, player: ${playerTime || -1}ms, validation: ${validationTime}ms) || cache: ${cacheTime}ms`);
				}
				return result;
			} else {
				const command = cmd as IContextCommand;
				const start = Date.now();
				if (command.disabled) return { content: 'This command is disabled', ephemeral: true };
				const startExecution = Date.now();
				const result = await command.execute(ctx as any);
				const executionTime = Date.now() - startExecution;
				const total = Date.now() - start;
				if (commandHandler.verbose) {
					commandHandler.logger.info(`Executed Context Command ${command.name} in ${total}ms (execution: ${executionTime}ms)`)
				}
				return result;
			}

		} catch (e) {
			this.logger.error(e);
			const id = nanoid(10);
			await this.prisma.error.create({
				data: {
					id,
					channelId: ctx.channelId ?? ctx.channel?.id ?? null,
					guildId: ctx.guildId || ctx.guild?.id || null,
					fullJson: inspect(e) as any,
				},
			});
			return {
				embeds: [new EmbedBuilder()
					.setTitle(`${getEmoji('warn').toString()} Error`)
					.setDescription(`There was an error while executing this command, Please submit the id below to the developer\n\n-# ${id}`)
					.setColor('Red')
					.setTimestamp()
				],
				ephemeral: true,
			};
		}
	}
}
