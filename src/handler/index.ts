import { Glob } from 'bun';
import {
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	Events,
	GuildMember,
	MessageEditOptions,
	RESTJSONErrorCodes,
	type Interaction,
	type Message,
} from 'discord.js';
import { watch } from 'fs/promises';
import { nanoid } from 'nanoid/non-secure';
import path from 'path';
import PinoLogger, { Logger } from 'pino';
import { inspect } from 'util';
import commandHandler from '..';
import { getEmoji } from '../util/emojis';
import VOTEmbed from '../util/VOTEmbed';
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

const createCommand = async (commandContext: CommandContext, command: ICommand, validationTime: number) => {
	try {
		const cId = commandContext.cID || nanoid(10);
		await commandContext.handler.prisma.user.upsert({
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
						id: `cmd_${cId}`,
						guildId: commandContext.guild?.id,
						validationTime
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
							guild: (commandContext?.guild?.id) || null,
							channel: commandContext?.channel?.id || null,
							message: commandContext?.message?.id || null,
							interaction: commandContext?.interaction?.id || null,
						},
						id: `cmd_${cId}`,
						guildId: commandContext.guild?.id,
						validationTime
					},
				},
			},
			select: {
				commands: { orderBy: { createdAt: 'desc' } },
			},
		});
	} catch (e) { }
};
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
	public logger: Logger;
	private slashHandler: SlashCommandHandler | null = null;
	private legacyHandler: LegacyCommandHandler | null = null;
	private commandsDir: string = '';
	private contextCommandsDir: string = '';

	constructor(mHandler: IMCommandHandler) {
		const handler = mHandler as ICommandHandler;
		const { commandsDir, listenersDir, contextCommandsDir } = handler;
		this.commandsDir = commandsDir;
		this.contextCommandsDir = contextCommandsDir;
		this.prodMode = handler.prodMode;
		this.logger = PinoLogger({
			name: path.basename(path.resolve(import.meta.dir, '../../')),
			level: this.prodMode ? 'info' : 'debug',
		});
		this.prisma = handler.prisma;
		this.kazagumo = handler.kazagumo;
		this.client = handler.client;
		this.developers = handler.developers;
		this.verbose = handler.verbose || false;
		handler.commands = [];
		handler.client.once(Events.ClientReady, async () => {
			const time = Date.now();
			this.logger.debug('Fetching guilds...');
			this.client.guilds.cache.map(async (guild) => {
				const fetchedGuild = await guild.fetch();
				return fetchedGuild.members.fetch();
			}),
				this.logger.debug(`Fetched guilds in ${Date.now() - time}ms`);
			this.validations = await (async () => {
				const validationDir = path.join(import.meta.dir, 'validations');
				const validationFiles = [];
				const glob = this.glob.scanSync({ cwd: validationDir });
				for await (const vFile of glob) {
					validationFiles.push(vFile);
				}
				const validations = await Promise.all(
					validationFiles.map(async (vFile) => {
						const validation = await import(path.join(validationDir, vFile));
						return validation.default;
					}),
				);
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
			const loadCommand = async (file: string) => {
				const start = Date.now();
				const splitPath = file.split(path.sep);
				const categoryName = splitPath[splitPath.length - 2]?.replace(/\\/g, '/') || 'uncategorized';
				const fileName = file.split(path.sep).pop()!.split('.')[0];
				if (categoryName.startsWith('_') || fileName.startsWith('_')) return;

				const modulePath = path.join(commandsDir, file);


				delete require.cache[require.resolve(modulePath)];

				const command = (await import(modulePath)).default;
				const commandName = command.name || fileName;
				const old = handler.commands.find((c) => c.name === fileName);
				if (old) {
					this.logger.info(`Refreshing command ${commandName}`);
					const index = handler.commands.indexOf(old);
					handler.commands.splice(index, 1);
				}

				const modifiedData: ICommand = Object.assign({}, command, {
					name: commandName,
					category: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
					aliases: command.aliases || [],
				});

				handler.commands.push(modifiedData);
				if (modifiedData.init && !modifiedData.disabled) {
					commandInits.push(modifiedData.init);
				}
				if (mHandler.verbose) {
					this.logger.info(
						`Initialized command ${modifiedData.name} in ${modifiedData.category} in ${Date.now() - start}ms`,
					);
				}
				if (old === modifiedData) {
					this.logger.info(`Command ${commandName} is the same as the old one`);
				}
				return { new: modifiedData, old };
			};

			await Promise.all(
				commandPaths.map(async (file) => {
					return loadCommand(file);
				}),
			);
			await Promise.all(
				contextCommandPaths.map(async (file) => {
					const commandName = path.basename(file, path.extname(file));
					const command = (await import(path.join(contextCommandsDir, file))).default as IContextCommand;
					if (command.disabled) return;
					const modifiedData: IContextCommand = Object.assign({}, command, {
						name: command.name || commandName,
					});
					handler.commands.push(modifiedData);
					if (mHandler.verbose) this.logger.info(`Initialized Context Command ${modifiedData.name}`);
				}),
			);
			Promise.all(
				commandInits.map((init) => {
					init(handler);
				}),
			);
			const total = Date.now() - start;
			this.logger.info(`Initialized ${handler.commands.length} commands in ${total}ms`);
			const Ilegacy = handler as LegacyHandler;
			const Islash = handler as SlashHandler;
			this.slashHandler = new SlashCommandHandler(Islash, this);
			this.legacyHandler = new LegacyCommandHandler(Ilegacy, this);
			this.commands = handler.commands;
			const listener = new ListenerHandler(this, listenersDir, this.glob);

			if (!handler.prodMode) {
				this.setupFileWatcher(commandsDir, contextCommandsDir);
			}
		});
	}

	private async setupFileWatcher(commandsDir: string, contextCommandsDir: string) {
		try {
			const debounce = (func: Function, delay: number) => {
				let timeout: any;
				const fileLastChanged = new Map<string, number>();

				return (filename: string) => {
					const now = Date.now();
					const lastChanged = fileLastChanged.get(filename) || 0;
					if (now - lastChanged < delay) {
						clearTimeout(timeout);
					}

					fileLastChanged.set(filename, now);
					timeout = setTimeout(() => func(filename), delay);
				};
			};

			const handleCommandChange = debounce(async (filename: string) => {
				try {
					this.logger.info(`File change detected: ${filename}`);
					const fileInfo = path.parse(filename);

					if (fileInfo.ext === '.ts' || fileInfo.ext === '.js') {
						await this.reloadCommandByPath(filename);

						if (this.slashHandler) {
							await this.slashHandler.initCommands(this.client);
						}
					}
				} catch (ignored) {
				}
			}, 300);

			const handleContextCommandChange = debounce(async (filename: string) => {
				try {
					this.logger.info(`Context command file change detected: ${filename}`);
					const commandName = path.basename(filename, path.extname(filename));
					await this.reloadContextCommand(commandName);
					if (this.slashHandler) {
						await this.slashHandler.initCommands(this.client);
					}
				} catch (ignored) {

				}
			}, 300);

			const cmdWatcher = watch(commandsDir, {
				recursive: true,
			});

			this.logger.info("File watcher started for commands directory");

			(async () => {
				try {
					for await (const event of cmdWatcher) {
						if (event.filename) {
							handleCommandChange(event.filename);
						}
					}
				} catch (error) {
					this.logger.error(`Command watcher error: ${error}`);
					setTimeout(() => this.setupFileWatcher(commandsDir, contextCommandsDir), 5000);
				}
			})();

			const contextWatcher = watch(contextCommandsDir, {
				recursive: true,
			});

			this.logger.info("File watcher started for context commands directory");

			(async () => {
				try {
					for await (const event of contextWatcher) {
						if (event.filename) {
							handleContextCommandChange(event.filename);
						}
					}
				} catch (error) {
					this.logger.error(`Context command watcher error: ${error}`);
					setTimeout(() => this.setupFileWatcher(commandsDir, contextCommandsDir), 5000);
				}
			})();
		} catch (error) {
			this.logger.error(`Error setting up file watcher: ${error}`);

			setTimeout(() => this.setupFileWatcher(commandsDir, contextCommandsDir), 5000);
		}
	}

	private async reloadCommandByPath(filePath: string) {
		try {
			if (!this.commands) return null;

			const splitPath = filePath.split(path.sep);
			const categoryName = splitPath[splitPath.length - 2]?.replace(/\\/g, '/') || 'uncategorized';
			const fileName = splitPath[splitPath.length - 1].split('.')[0];

			if (categoryName.startsWith('_') || fileName.startsWith('_')) return null;

			const modulePath = path.join(this.commandsDir, filePath);

			const commandName = fileName;
			const oldCommandIndex = this.commands.findIndex(cmd =>
				cmd.name === commandName ||
				(cmd.name?.toLowerCase() === commandName.toLowerCase())
			);

			let oldCommand = null;
			if (oldCommandIndex !== -1) {
				oldCommand = this.commands[oldCommandIndex];
				this.commands.splice(oldCommandIndex, 1);
				this.logger.info(`Removed old command: ${oldCommand.name}`);
			}

			this.clearModuleCache(modulePath);

			let commandModule;
			try {
				commandModule = await import(modulePath);
			} catch (error) {
				this.logger.error(`Failed to import module at ${modulePath}: ${error}`);

				if (oldCommand) {
					this.commands.push(oldCommand);
					this.logger.info(`Restored old command: ${oldCommand.name} due to import failure`);
				}

				return null;
			}

			const commandData = commandModule.default;

			if (!commandData) {
				this.logger.warn(`Command in ${filePath} has no default export`);
				return null;
			}

			const modifiedData: ICommand = Object.assign({}, commandData, {
				name: commandData.name || fileName,
				category: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
				aliases: commandData.aliases || [],
			});

			this.commands.push(modifiedData);

			if (modifiedData.init && !modifiedData.disabled) {
				try {
					modifiedData.init(this);
				} catch (error) {
					this.logger.error(`Error in command init method: ${error}`);
				}
			}

			this.logger.info(`Successfully reloaded command: ${modifiedData.name}`);

			if (this.legacyHandler) {
				this.legacyHandler.updateCommands();
			}

			return modifiedData;
		} catch (error) {
			this.logger.error(`Failed to reload command from path ${filePath}: ${error}`);
			return null;
		}
	}


	private clearModuleCache(modulePath: string) {
		try {
			const normalizedPath = path.resolve(modulePath);

			if (require.cache && normalizedPath in require.cache) {
				delete require.cache[normalizedPath];
			}
		} catch (error) {
			this.logger.warn(`Error clearing module cache: ${error}`);
		}
	}

	private async reloadContextCommand(commandName: string) {
		try {
			if (!this.commands) return null;

			const filePath = path.join(this.contextCommandsDir, `${commandName}${path.extname(commandName) ? '' : '.ts'}`);


			const oldCommandIndex = this.commands.findIndex(cmd =>
				cmd.name === commandName ||
				(cmd.name?.toLowerCase() === commandName.toLowerCase())
			);

			let oldCommand = null;
			if (oldCommandIndex !== -1) {
				oldCommand = this.commands[oldCommandIndex];
				this.commands.splice(oldCommandIndex, 1);
				this.logger.info(`Removed old context command: ${oldCommand.name}`);
			}


			this.clearModuleCache(filePath);


			let commandModule;
			try {
				commandModule = await import(filePath);
			} catch (error) {
				this.logger.error(`Failed to import context command at ${filePath}: ${error}`);
				if (oldCommand) {
					this.commands.push(oldCommand);
				}

				return null;
			}

			const commandData = commandModule.default as IContextCommand;

			if (!commandData) {
				this.logger.warn(`Context command ${commandName} has no default export`);
				return null;
			}

			const modifiedData: IContextCommand = Object.assign({}, commandData, {
				name: commandData.name || commandName,
			});

			this.commands.push(modifiedData);
			this.logger.info(`Successfully reloaded context command: ${modifiedData.name}`);
			return modifiedData;
		} catch (error) {
			this.logger.error(`Failed to reload context command ${commandName}: ${error}`);
			return null;
		}
	}

	public async reloadCommand(commandName: string) {
		if (!this.commands) throw new Error('Commands not initialized');

		const command = this.commands.find((c) => c.name === commandName);
		if (!command) throw new Error('Command not found');

		try {
			if ('category' in command) {
				const filePath = path.join(command.category!.toLowerCase(), `${commandName}.ts`);
				const reloaded = await this.reloadCommandByPath(filePath);

				if (reloaded && this.slashHandler) {
					await this.slashHandler.initCommands(this.client);
				}

				return reloaded;
			} else {
				const reloaded = await this.reloadContextCommand(commandName);
				if (reloaded && this.slashHandler) {
					await this.slashHandler.initCommands(this.client);
				}

				return reloaded;
			}
		} catch (error) {
			this.logger.error(`Error in reloadCommand: ${error}`);
			throw error;
		}
	}

	public async executeCommand(cmd: ICommand | IContextCommand, ctx: Interaction | Message) {
		const cId = nanoid(5);

		try {
			if ('aliases' in cmd) {
				const start = Date.now();
				const command = cmd as ICommand;
				if (command.disabled) return;
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
							deaf: true,
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
						},
						cID: cId,
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
							if (!rMsg) return;
							await rMsg.edit(content as string | MessageEditOptions);
						},
						cID: cId,
					};
					contextTime = Date.now() - start;
				}
				const vStart = Date.now();
				for (const validation of this.validations) {
					const result = await validation(command, commandContext);
					if (result !== true) {
						validationTime = Date.now() - vStart;
						return result;
					}
				}
				validationTime = Date.now() - vStart;
				const eStart = Date.now();
				try {
					setTimeout(() => {
						if (ctx instanceof CommandInteraction) {
							if (!ctx.deferred && !ctx.replied) {
								ctx.deferReply();
							}
						}
					}, 2700);
				} catch (e) { }

				await createCommand(commandContext, command, validationTime);
				const result = await command.execute(commandContext);
				const executionTime = Date.now() - eStart;
				const total = Date.now() - start;
				if (commandHandler.verbose) {
					commandHandler.logger.info(
						`Executed command ${command.name} in ${total}ms (execution: ${executionTime}, context: ${contextTime}ms, player: ${playerTime || -1}ms, validation: ${validationTime}ms)`,
					);
				}
				let retries = 3;
				while (retries > 0) {
					try {
						return result;
					} catch (e: any) {
						this.logger.error(e);
						retries--;
					}
				}
			} else {
				const command = cmd as IContextCommand;
				const start = Date.now();
				if (command.disabled) return { content: 'This command is disabled', ephemeral: true };
				const startExecution = Date.now();
				const result = await command.execute(ctx as any);
				const executionTime = Date.now() - startExecution;
				const total = Date.now() - start;
				if (commandHandler.verbose) {
					commandHandler.logger.info(
						`Executed Context Command ${command.name} in ${total}ms (execution: ${executionTime}ms)`,
					);
				}
				return result;
			}
		} catch (e: any) {
			if ((e as any).code in RESTJSONErrorCodes) {
				if (e.code == 10005 || e.code == 40060) {

				}
				try {
					return {
						embeds: [
							new VOTEmbed()
								.setTitle('Error')
								.setDescription(`An error occurred: ${(e as any).message}`)
								.setColor('DarkRed')
								.setTimestamp(),
						],
						ephemeral: true,
					};
				} catch (e) {
					try {
						return {
							content: `An error occurred: ${(e as any).message}`,
							ephemeral: true,
						};
					} catch (e) {

					}
				}
			}
			this.logger.error(e);
			await this.prisma.error.create({
				data: {
					id: `error_${cId}`,
					channelId: ctx.channelId ?? ctx.channel?.id ?? null,
					guildId: ctx.guildId || ctx.guild?.id || null,
					fullJson: inspect(e) as any,
					command: {
						connect: {
							id: `cmd_${cId}`,
						},
					},
				},
			});
			return {
				embeds: [
					new EmbedBuilder()
						.setTitle(`${getEmoji('warn').toString()} Error`)
						.setDescription(
							`There was an error while executing this command, Please submit the id below to the developer in the [discord server](https://discord.gg/X42fBGVRtR).\n\n-# ${cId}`,
						)
						.setColor('Red')
						.setTimestamp(),
				],
				ephemeral: true,
			};
		}
	}
}
