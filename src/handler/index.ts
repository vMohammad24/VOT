import { Glob } from 'bun';
import {
	ChatInputCommandInteraction,
	Events,
	GuildMember,
	MessageEditOptions,
	type Interaction,
	type Message,
} from 'discord.js';
import path from 'path';
import PinoLogger from 'pino';
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
		const { commandsDir, listenersDir } = handler;
		this.prisma = handler.prisma;
		this.kazagumo = handler.kazagumo;
		this.client = handler.client;
		this.developers = handler.developers;
		this.prodMode = handler.prodMode;
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

			for await (const file of this.glob.scan({
				absolute: false,
				cwd: commandsDir,
			})) {
				const commandName = file.split('/').pop()!.split('.')[0];
				const categoryName = file.split('/').slice(-2, -1)[0];
				const command = await import(path.join(commandsDir, file));
				const modifiedData = Object.assign({}, command.default, {
					name: commandName,
					category: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
				});
				if (modifiedData.disabled) continue;
				handler.commands.push(modifiedData);
				if (modifiedData.init) await modifiedData.init(this);
				if (mHandler.verbose)
					this.logger.info(`Initialized command ${modifiedData.name} in ${modifiedData.category}`);
			}

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
		if ((cmd as ICommand).description) {
			const start = Date.now();
			const command = cmd as ICommand;
			if (command.disabled) return { content: 'This command is disabled', ephemeral: true };
			let commandContext: CommandContext;
			const getPlayer = (member: GuildMember) => {
				const start = Date.now();
				if (!member || !member.guild) return;
				if (!member.voice.channelId) return;
				const player = this.kazagumo.getPlayer(member.guild.id);
				if (player && player.voiceId !== member.voice.channelId) return;
				if (!player && command.needsPlayer)
					return this.kazagumo.createPlayer({
						guildId: member.guild.id,
						voiceId: member.voice.channelId,
						textId: member.voice.channelId,
						deaf: true,
					});
				this.logger.info(`Player creation took ${Date.now() - start}ms`);
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
				this.logger.info(`Interaction ${interaction.id} created in ${Date.now() - start}ms`);
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
				this.logger.info(`Message ${message.id} created in ${Date.now() - start}ms`);
			}
			const vStart = Date.now();
			const res = await Promise.all(this.validations.map(async (validation) => {
				const result = await validation(command, commandContext);
				return result;
			}));
			const failed = res.find((r) => r != true);
			if (failed) return failed;
			this.logger.info(`Validations took ${Date.now() - vStart}ms`);
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
			const result = await command.execute(commandContext);
			const end = Date.now();
			this.logger.info(`Total: ${end - start}ms\nExecution: ${end - eStart}ms`);
			return result;
		}

	}
}
