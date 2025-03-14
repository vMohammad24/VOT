import { inspect } from 'bun';
import {
	ApplicationCommandOption,
	ApplicationCommandOptionType,
	type Client,
	ContextMenuCommandBuilder,
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

const merge = (a: any[], b: any[], predicate = (a: any, b: any) => a === b) => {
	const c = [...a];
	b.forEach((bItem) => {
		const existing = c.find((cItem) => predicate(bItem, cItem));
		if (!existing) {
			c.push(bItem);
			return;
		}
		for (const key in bItem) {
			if (Array.isArray(bItem[key]) && Array.isArray(existing[key])) {
				existing[key] = merge(existing[key], bItem[key], predicate);
			} else if (
				typeof bItem[key] === 'object' &&
				bItem[key] !== null &&
				typeof existing[key] === 'object' &&
				existing[key] !== null
			) {
				existing[key] = { ...existing[key], ...bItem[key] };
			} else {
				existing[key] = bItem[key];
			}
		}
	});
	return c;
}
export default class SlashCommandHandler {
	public commands: (ICommand | IContextCommand)[] = [];
	private handler: CommandHandler;
	private autocompletes: ICommand[] = [];
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
		const initCommands = new Map<string, ICommand>();
		this.commands
			.filter(isICommand)
			.filter((a) => a.category != null && !a.disabled)
			.forEach((cmd: ICommand) => {
				let perms: bigint | null = 0n;
				if (cmd.type == 'legacy') return;
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
				}
				if (cmd.type == 'guildOnly' || cmd.type == 'all') {
					uInstall.contexts.push(0);
					uInstall.integration_types.push(0);
				}
				if (cmd.type == 'dmOnly') {
					uInstall.contexts.push(1);
					uInstall.integration_types.push(0);
				}
				if (cmd.autocomplete && !cmd.disabled) this.autocompletes.push(cmd);

				const command = this.filterObject({ ...cmd, default_member_permissions: perms?.toString(), ...uInstall }, [
					'integration_types',
					'contexts',
					'name',
					'description',
					'options',
					'default_member_permissions',
					'dmPermission',
				]);
				command.name = cmd.name?.toLowerCase().split(" ").shift();

				if (cmd.advancedChoices === true && command.options) {
					const optionsWithChoices = command.options.filter((opt: any) => opt.choices && opt.choices.length > 0);

					if (optionsWithChoices.length > 0) {
						const baseOptions = command.options.filter((opt: any) => !opt.choices || opt.choices.length === 0);
						const newOptions: any[] = [];

						for (const choiceOption of optionsWithChoices) {
							for (const choice of choiceOption.choices) {
								const choiceName = choice.name.toLowerCase();

								if (choiceName.includes(' ')) {
									const parts = choiceName.split(' ');
									const groupName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 32) || 'group';
									const subName = parts.slice(1).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 32) || 'option';

									let group = newOptions.find(opt => opt.name === groupName &&
										opt.type === ApplicationCommandOptionType.SubcommandGroup);

									if (!group) {
										group = {
											name: groupName,
											description: `${groupName} options for ${cmd.name}`,
											type: ApplicationCommandOptionType.SubcommandGroup,
											options: []
										};
										newOptions.push(group);
									}

									group.options.push({
										name: subName,
										description: `${cmd.description} using ${choice.name}`,
										type: ApplicationCommandOptionType.Subcommand,
										_originalValue: choice.value,
										_optionName: choiceOption.name,
										options: baseOptions.map((opt: ApplicationCommandOption) => ({ ...opt }))
									});
								} else {
									const validName = choiceName.replace(/[^a-z0-9]/g, '').substring(0, 32) || 'option';

									newOptions.push({
										name: validName,
										description: `${cmd.description} using ${choice.name}`,
										type: ApplicationCommandOptionType.Subcommand,
										_originalValue: choice.value,
										_optionName: choiceOption.name,
										options: baseOptions.map((opt: ApplicationCommandOption) => ({ ...opt }))
									});
								}
							}
						}

						command.options = newOptions;
					}
				} else if (initCommands.has(command.name!)) {
					const oldCmd = initCommands.get(command.name!);
					command.options = merge(oldCmd!.options!, command.options!, (a, b) => a.name === b.name);
				}
				if (cmd.name!.includes(" ")) {
					const subCommands = cmd.name!.split(" ");
					// const cmdName = subCommands.shift()!;
					for (const subCommand of subCommands) {
						let oldOptions = merge(command.options || [], cmd.options || [], (a, b) => a.name === b.name)!.filter((o) => o.type != ApplicationCommandOptionType.Subcommand);
						command.options!.push({
							name: subCommand.trim(),
							description: cmd.description,
							type: ApplicationCommandOptionType.Subcommand,
							options: oldOptions as any[] || [],
						});
						command.options = command.options!.filter((o: ApplicationCommandOption) => o.type == ApplicationCommandOptionType.Subcommand);
					}
				}
				if (command.options?.length) {
					const unique = new Map<string, ApplicationCommandOption>();
					for (const opt of command.options) {
						unique.set(opt.name, opt);
					}
					if (unique.has(command.name)) unique.delete(command.name);
					command.options = unique.values().toArray();
				}
				initCommands.set(command.name!, command as any);

			});
		const contextCommands = this.commands!.filter((a) => (a as IContextCommand).context != null)
			.map((c) => {
				const cmd = c as IContextCommand;
				if (cmd.disabled) return null;
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
				// const command = this.filterObject({ ...cmd, ...uInstall }, [
				// 	'integration_types',
				// 	'contexts',
				// 	'name',
				// 	'description',
				// ]);
				return new ContextMenuCommandBuilder()
					.setName(cmd.name!)
					.setContexts(uInstall.contexts)
					.setIntegrationTypes(uInstall.integration_types)
					.setType(cmd.type)
					.toJSON();
			})
			.filter((a) => a != null);
		try {
			if (commandHandler.verbose) commandHandler.logger.info('Started refreshing application (/) commands.');
			const startTime = Date.now();
			const res = await client.rest.put(Routes.applicationCommands(client.user!.id), {
				body: JSON.parse(
					JSON.stringify([...initCommands.values(), ...contextCommands], (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
				),
			});
			const endTime = Date.now();
			for (const command of res as { id: string; name: string }[]) {
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
			this.commands.forEach(c => c.interactionHandler && c.interactionHandler(interaction));
			if (interaction.isCommand() || interaction.isContextMenuCommand()) {
				const command = this.commands.find((cmd) => {
					if (interaction.isContextMenuCommand()) return cmd.id! === interaction.commandId;
					const subCommand = interaction.options.getSubcommand(false);
					return cmd.name?.toLowerCase() === interaction.commandName.toLowerCase() || (subCommand && cmd.name?.toLowerCase() === `${interaction.commandName.toLowerCase()} ${subCommand}`);
				});
				if (!command) {
					const error = await this.handler.prisma.error.create({
						data: {
							channelId: interaction.channelId!,
							guildId: interaction.guildId || null,
							// fullJson,
						},
					});
					return await interaction.reply({
						content: `This command does not exist.\nFor further information please report this to the developers in the [discord server](https://discord.gg/X42fBGVRtR).\n-# ${error?.id}`,
						ephemeral: true,
					});
				}
				if (command.type == 'legacy') return;
				let result = {};
				let err;
				let errorId;
				try {
					result = await this.handler.executeCommand(command, interaction);
				} catch (error) {
					this.handler.logger.error(error);
					const id = nanoid(10);
					result = {
						embeds: [
							new EmbedBuilder()
								.setTitle(`${getEmoji('warn').toString()} Error`)
								.setDescription(
									`There was an error while executing this command, Please submit the id below to the developer in the [discord server](https://discord.gg/X42fBGVRtR).\n-# ${id}`,
								)
								.setColor('Red')
								.setTimestamp(),
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
					let attempts = 0;
					while (attempts < 3) {
						attempts++;
						try {
							if (interaction.deferred) {
								await interaction.editReply(r);
							} else if (interaction.replied) {
								await interaction.followUp(r);
							} else {
								await interaction.reply(r);
							}
							break;
						} catch (err) {
							if (attempts >= 3) {
								throw err;
							}
						}
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
			} else if (interaction.isAutocomplete()) {
				const cmd = this.autocompletes.find((a) => a.id === interaction.commandId);
				if (!cmd) return;
				try {
					await cmd.autocomplete!(interaction);
				} catch (error) {
					if (this.handler.verbose) this.handler.logger.error(error, 'Got an error while executing autocomplete for ' + cmd.name);
				}
			}
		});
	}
}
