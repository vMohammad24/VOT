import { ApplicationCommandOptionType, type Client, Events, InteractionReplyOptions, PermissionsBitField, Routes } from 'discord.js';
import CommandHandler from '.';
import commandHandler from '..';
import type ICommand from './interfaces/ICommand';
import type SlashHandler from './interfaces/ISlashHandler';
export default class SlashCommandHandler {
	public commands: ICommand[] = [];
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
		const commands = this.commands.map((cmd) => {
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
		// client.application?.commands.set(commands);
		try {
			commandHandler.logger.info('Started refreshing application (/) commands.');
			await client.rest.put(Routes.applicationCommands(client.user!.id), {
				body: JSON.parse(JSON.stringify(commands, (_, v) => (typeof v === 'bigint' ? v.toString() : v))),
			});
			commandHandler.logger.info('Successfully reloaded application (/) commands.');
		} catch (error) {
			commandHandler.logger.error('Error refreshing application (/) commands: ' + error);
		}
	}

	public initListener(client: Client) {
		client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isCommand()) return;
			const command = this.commands.find((cmd) => cmd.name?.toLowerCase() === interaction.commandName.toLowerCase());
			if (!command) {
				const error = await this.handler.prisma.error.create({
					data: {
						channelId: interaction.channelId!,
						guildId: interaction.guildId || null,
						fullJson: interaction,
					}
				})
				return await interaction.reply({
					content: `This command does not exist.\nFor further information please report this to the developers.\n-# ${error?.id}`,
					ephemeral: true,
				});
			};
			let result = {};
			try {
				result = await this.handler.executeCommand(command, interaction);
			} catch (error) {
				this.handler.logger.error(error);
				const pError = await this.handler.prisma.error.create({
					data: {
						channelId: interaction.channelId!,
						guildId: interaction.guildId || null,
						fullJson: error as undefined,
					},
				});
				result = {
					content: `There was an error while executing this command\n-# ${pError?.id}`,
					ephemeral: true,
				};
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
		});
	}
}
