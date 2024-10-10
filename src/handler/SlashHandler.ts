import { inspect } from 'bun';
import {
	ApplicationCommandOptionType,
	type Client,
	EmbedBuilder,
	Events,
	InteractionReplyOptions,
	PermissionsBitField,
	Routes,
} from 'discord.js';
import { nanoid } from 'nanoid/non-secure';
import CommandHandler from '.';
import commandHandler from '..';
import { getEmoji } from '../util/emojis';
import type ICommand from './interfaces/ICommand';
import { IContextCommand } from './interfaces/IContextCommand';
import type SlashHandler from './interfaces/ISlashHandler';

function isICommand(cmd: ICommand | IContextCommand): cmd is ICommand {
	return (cmd as ICommand).category !== undefined;
}
export default class SlashCommandHandler {
	public commands: (ICommand | IContextCommand)[] = [];
	private handler: CommandHandler;
	constructor({ client, commands }: SlashHandler, handler: CommandHandler) {
		this.commands = commands;
		this.handler = handler;
		this.initCommands(client);
		this.initListener(client);
	}

	private filterObject<T extends object, U extends object>(obj: T, allowedKeys: (keyof U)[]): Partial<U> {
		const result = {} as Partial<U>;
		for (const key in obj) {
			if (allowedKeys.includes(key as unknown as keyof U)) {
				result[key as unknown as keyof U] = obj[key] as unknown as U[keyof U];
			}
		}
		return result;
	}

	public async initCommands(client: Client) {
		const commands = this.commands.filter(isICommand).filter(a => a.category != null).map((cmd: ICommand) => {
			let perms: bigint | null = 0n;
			if (!cmd.options) cmd.options = [];
			if (cmd.perms && cmd.perms != 'dev') {
				for (const perm of cmd.perms) {
					for (const [key, value] of Object.entries(PermissionsBitField.Flags)) {
						if (key == perm && typeof perms === 'bigint') {
							perms = perms | value;
						}
					}
				}
			} else {
				perms = null;
			}
			const uInstall = {
				contexts: [] as number[],
				integration_types: [] as number[],
			};

			if (!cmd.type) cmd.type = 'guildOnly';

			if (cmd.type == 'installable' || cmd.type == 'all') {
				uInstall.contexts.push(2);
				uInstall.integration_types.push(1);
				cmd.options?.push({
					name: 'silent',
					description: "ephemeral's the response",
					type: ApplicationCommandOptionType.Boolean,
					required: false,
				});
			}
			if (cmd.type == 'guildOnly' || cmd.type == 'all') {
				uInstall.contexts.push(0);
				uInstall.integration_types.push(0);
			}

			if (cmd.type == 'dmOnly') {
				uInstall.contexts.push(1);
				uInstall.integration_types.push(0);
			}
			const command = this.filterObject({ ...cmd, default_member_permissions: perms?.toString(), ...uInstall }, [
				'integration_types',
				'contexts',
				'name',
				'description',
				'options',
				'default_member_permissions',
				'dmPermission',
			]);
			command.name = cmd.name?.toLowerCase();
			return command;
		});
		const contextCommands = this.commands!.filter(a => (a as IContextCommand).context != null).map((c) => {
			const cmd = c as IContextCommand;
			const uInstall = {
				contexts: [] as number[],
				integration_types: [] as number[],
			};

			if (!cmd.context) cmd.context = 'guildOnly';

			if (cmd.context == 'installable' || cmd.context == 'all') {
				uInstall.contexts.push(2);
				uInstall.integration_types.push(1);
			}
			if (cmd.context == 'guildOnly' || cmd.context == 'all') {
				uInstall.contexts.push(0);
				uInstall.integration_types.push(0);
			}

			if (cmd.context == 'dmOnly') {
				uInstall.contexts.push(1);
				uInstall.integration_types.push(0);
			}
			const command = this.filterObject({ ...cmd, ...uInstall }, [
				'integration_types',
				'contexts',
				'name',
				'description',
			]);
			return command;
		});
		try {
			if (commandHandler.verbose)
				commandHandler.logger.info('Started refreshing application (/) commands.');
			const startTime = Date.now();
			const res = await client.rest.put(Routes.applicationCommands(client.user!.id), {
				body: JSON.parse(JSON.stringify(commands.concat(contextCommands), (_, v) => (typeof v === 'bigint' ? v.toString() : v))),
			});
			const endTime = Date.now();
			for (const command of (res as { id: string, name: string }[])) {
				const cmd = this.commands.find((c) => c.name?.toLowerCase() === command.name.toLowerCase());
				if (cmd) cmd.id = command.id;
			}
			commandHandler.logger.info(`Successfully reloaded (/) commands. Took ${endTime - startTime}ms`);
		} catch (error) {
			commandHandler.logger.error('Error refreshing (/) commands: ' + error);
		}
	}

	public initListener(client: Client) {
		client.on(Events.InteractionCreate, async (interaction) => {
			// if(interaction.isContextMenuCommand()){
			// 	const command = this.commands.find((cmd) => cmd.name?.toLowerCase() === interaction.commandName.toLowerCase());
			// 	if (!command) {
			// 		return await interaction.reply({
			// 			content: `This command does not exist.\nFor further information please report this to the developers.`,
			// 			ephemeral: true,
			// 		});
			// 	}
			// 	let result = {};
			// 	try {
			// 		result = await this.handler.executeCommand(command, interaction);
			// 	} catch (error) {
			// 		this.handler.logger.error(error);
			// 		const id = Buffer.from(`${interaction.commandGuildId}.${randomId()}.${interaction.id}`).toString('base64');
			// 		this.handler.prisma.error.create({
			// 			data: {
			// 				id,
			// 				channelId: interaction.channelId!,
			// 				guildId: interaction.guildId || null,
			// 				fullJson: inspect(error) as any,
			// 			},
			// 		});
			// 		result = {
			// 			content: `There was an error while executing this command\n-# ${id}`,
			// 			ephemeral: true,
			// 		};
			// 	}
			// 	if (result) {
			// 		let r = result;
			// 		if (typeof interaction.options.get('silent', false)?.value === 'boolean') {
			// 			r = { ...(result as InteractionReplyOptions), ephemeral: true };
			// 		}
			// 		if (interaction.deferred) {
			// 			await interaction.editReply(r);
			// 		} else if (interaction.replied) {
			// 			await interaction.followUp(r);
			// 		} else {
			// 			await interaction.reply(r);
			// 		}
			// 	}
			// 	return;
			// }
			if (interaction.isCommand() || interaction.isContextMenuCommand()) {
				const command = this.commands.find((cmd) => cmd.name?.toLowerCase() === interaction.commandName.toLowerCase());
				if (!command) {
					const error = await this.handler.prisma.error.create({
						data: {
							channelId: interaction.channelId!,
							guildId: interaction.guildId || null,
							fullJson: interaction,
						},
					});
					return await interaction.reply({
						content: `This command does not exist.\nFor further information please report this to the developers.\n-# ${error?.id}`,
						ephemeral: true,
					});
				}
				let result = {};
				let err;
				let errorId;
				try {
					result = await this.handler.executeCommand(command, interaction);
				} catch (error) {
					this.handler.logger.error(error);
					const id = nanoid(10);
					result = {
						embeds: [new EmbedBuilder()
							.setTitle(`${getEmoji('warn').toString()} Error`)
							.setDescription(`There was an error while executing this command, Please submit the id below to the developer\n-# ${id}`)
							.setColor('Red')
							.setTimestamp()
						],
						ephemeral: true,
					};
					errorId = id;
					err = error;
				}
				if (result) {
					let r = result;
					if (typeof interaction.options.get('silent', false)?.value === 'boolean') {
						r = { ...(result as InteractionReplyOptions), ephemeral: true };
					}
					if (interaction.deferred) {
						await interaction.editReply(r);
					} else if (interaction.replied) {
						await interaction.followUp(r);
					} else {
						await interaction.reply(r);
					}
				}
				await this.handler.prisma.error.create({
					data: {
						id: errorId,
						channelId: interaction.channelId!,
						guildId: interaction.guildId || null,
						fullJson: inspect(err) as any,
					},
				});
			}
		});
	}
}
