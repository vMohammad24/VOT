import {
	type ApplicationCommandOption,
	ApplicationCommandOptionType,
	type ApplicationCommandSubCommandData,
	type ApplicationCommandSubGroupData,
	EmbedBuilder,
	type User,
} from "discord.js";
import { getUser } from "../../util/database";
import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";

const optionTypeCache = new WeakMap<ApplicationCommandOption, string>();
const optionPropsCache = new WeakMap<
	ApplicationCommandOption,
	{ hasRequired: boolean; hasOptions: boolean }
>();

function isSubCommandGroup(
	option: ApplicationCommandOption,
): option is ApplicationCommandSubGroupData {
	let type = optionTypeCache.get(option);
	if (type === undefined) {
		type =
			option.type === ApplicationCommandOptionType.SubcommandGroup
				? "group"
				: "other";
		optionTypeCache.set(option, type);
	}
	return type === "group";
}

function isSubCommand(
	option: ApplicationCommandOption,
): option is ApplicationCommandSubCommandData {
	let type = optionTypeCache.get(option);
	if (type === undefined) {
		type =
			option.type === ApplicationCommandOptionType.Subcommand ? "cmd" : "other";
		optionTypeCache.set(option, type);
	}
	return type === "cmd";
}

function hasRequiredProperty(
	option: ApplicationCommandOption,
): option is ApplicationCommandOption & { required: boolean } {
	let props = optionPropsCache.get(option);
	if (!props) {
		props = {
			hasRequired: "required" in option,
			hasOptions: "options" in option && Array.isArray((option as any).options),
		};
		optionPropsCache.set(option, props);
	}
	return props.hasRequired;
}

function hasOptionsProperty(
	option: ApplicationCommandOption,
): option is ApplicationCommandOption & {
	options?: ApplicationCommandOption[];
} {
	let props = optionPropsCache.get(option);
	if (!props) {
		props = {
			hasRequired: "required" in option,
			hasOptions: "options" in option && Array.isArray((option as any).options),
		};
		optionPropsCache.set(option, props);
	}
	return props.hasOptions;
}

export class Argument<T> {
	constructor(public value: T) {}
}

export class ArgumentMap<T extends Record<string, any>> {
	private map = new Map<string, Argument<any>>();

	set<K extends keyof T>(key: K, value: T[K]) {
		this.map.set(key as string, new Argument(value));
	}

	get<K extends keyof T>(key: K): T[K] | undefined {
		const argument = this.map.get(key as string);
		return argument ? argument.value : undefined;
	}

	list() {
		return Array.from(this.map.values()).map((arg) => arg.value);
	}
}

async function parseMessageArgs(
	messageContent: string,
	cmd: ICommand,
	user: User,
): Promise<string[]> {
	if (!cmd.name) return [];

	const userData = await getUser(user, { prefix: true });
	const prefix = userData.prefix ?? ";";
	const prefixLength = prefix.length;

	if (!messageContent.startsWith(prefix)) return [];

	const commandParts = messageContent.slice(prefixLength).split(/\s+/);

	if (cmd.name.includes(" ")) {
		const parts = cmd.name.split(" ");
		const partsLength = parts.length;
		if (
			parts.join(" ").toLowerCase() ===
			commandParts.slice(0, partsLength).join(" ").toLowerCase()
		) {
			return commandParts.slice(partsLength);
		}
	}

	if (cmd.aliases?.some((alias) => alias.includes(" "))) {
		for (const alias of cmd.aliases) {
			if (!alias.includes(" ")) continue;

			const aliasParts = alias.split(" ");
			const aliasLength = aliasParts.length;
			if (
				aliasParts.join(" ").toLowerCase() ===
				commandParts.slice(0, aliasLength).join(" ").toLowerCase()
			) {
				return commandParts.slice(aliasLength);
			}
		}
	}

	const commandName = commandParts[0].toLowerCase();
	if (cmd.name?.toLowerCase() === commandName) {
		return commandParts.slice(1);
	}

	const hasMatchingAlias = cmd.aliases?.some(
		(a) => !a.includes(" ") && a.toLowerCase() === commandName,
	);
	if (hasMatchingAlias) {
		return commandParts.slice(1);
	}

	return [];
}

function createErrorResponse(
	title: string,
	description: string,
	ephemeral = true,
) {
	return {
		ephemeral,
		embeds: [
			new EmbedBuilder()
				.setTitle(title)
				.setDescription(description)
				.setColor("DarkRed")
				.setTimestamp(),
		],
	};
}

export default async function (
	command: ICommand,
	ctx: CommandContext,
): Promise<boolean | any> {
	const { args, interaction, message, user } = ctx;
	const { options } = command;

	if (!options || options.length === 0) return true;

	const messageArgs = message
		? await parseMessageArgs(message.content.trim(), command, ctx.user)
		: [];
	let argIndex = 0;

	const validateInteractionOptions = async (
		options: ApplicationCommandOption[],
	) => {
		const optionsLength = options.length;

		for (let i = 0; i < optionsLength; i++) {
			const option = options[i];
			if (!option) continue;

			if (interaction) {
				if (command.advancedChoices) {
					try {
						const subcommandGroup =
							interaction.options.getSubcommandGroup(false);
						const subcommand = interaction.options.getSubcommand(false);

						if (subcommand) {
							if (!subcommandGroup) {
								for (const opt of command.options || []) {
									if (opt.name === subcommand && isSubCommand(opt)) {
										if ("_originalValue" in opt && "_optionName" in opt) {
											args.set(
												opt.name,
												interaction.options.get(opt.name)?.value,
											);
											break;
										}
									}
								}
							} else {
								for (const optGroup of command.options || []) {
									if (
										optGroup.name === subcommandGroup &&
										isSubCommandGroup(optGroup)
									) {
										if (hasOptionsProperty(optGroup)) {
											for (const subCmd of optGroup.options || []) {
												if (
													subCmd.name === subcommand &&
													isSubCommand(subCmd)
												) {
													if (
														"_originalValue" in subCmd &&
														"_optionName" in subCmd
													) {
														args.set(
															subCmd.name,
															interaction.options.get(subCmd.name)?.value,
														);
														break;
													}
												}
											}
										}
										break;
									}
								}
							}
						}
					} catch (e) {
						console.error("Error processing advanced choices:", e);
					}
				}
				let value: any = null;
				const required = hasRequiredProperty(option) ? option.required : false;
				const optionName = option.name;
				const optionType = option.type;

				switch (optionType) {
					case ApplicationCommandOptionType.String:
						value = interaction.options.getString(optionName, required);
						break;
					case ApplicationCommandOptionType.Integer:
						value = interaction.options.getInteger(optionName, required);
						break;
					case ApplicationCommandOptionType.Boolean:
						value = interaction.options.getBoolean(optionName, required);
						break;
					case ApplicationCommandOptionType.User:
						value = interaction.options.getUser(optionName, required);
						break;
					case ApplicationCommandOptionType.Channel:
						value = interaction.options.getChannel(optionName, required);
						break;
					case ApplicationCommandOptionType.Role:
						value = interaction.options.getRole(optionName, required);
						break;
					case ApplicationCommandOptionType.Mentionable:
						value = interaction.options.getMentionable(optionName, required);
						break;
					case ApplicationCommandOptionType.Number:
						value = interaction.options.getNumber(optionName, required);
						break;
					case ApplicationCommandOptionType.Attachment:
						value = interaction.options.getAttachment(optionName, required);
						break;
					case ApplicationCommandOptionType.Subcommand:
					case ApplicationCommandOptionType.SubcommandGroup: {
						const subCommandName = interaction.options.getSubcommand(false);
						const subCommandGroup =
							interaction.options.getSubcommandGroup(false);

						let subOptions: ApplicationCommandOption[] | undefined = undefined;

						if (hasOptionsProperty(option)) {
							subOptions = option.options?.filter((opt) => !isSubCommand(opt));
						}

						if (subCommandName && subCommandGroup) {
							const foundGroup = command.options?.find(
								(group) =>
									group.name === subCommandGroup && isSubCommandGroup(group),
							);

							if (foundGroup && hasOptionsProperty(foundGroup)) {
								const foundCommand = foundGroup.options?.find(
									(cmd): cmd is ApplicationCommandSubCommandData =>
										cmd.name === subCommandName && isSubCommand(cmd),
								);

								if (foundCommand && hasOptionsProperty(foundCommand)) {
									subOptions = foundCommand.options;
								}
							}
						} else if (subCommandName) {
							const foundCommand = command.options?.find(
								(cmd): cmd is ApplicationCommandSubCommandData =>
									cmd.name === subCommandName && isSubCommand(cmd),
							);

							if (foundCommand && hasOptionsProperty(foundCommand)) {
								subOptions = foundCommand.options;
							}
						}

						if (subOptions) return await validateInteractionOptions(subOptions);
						break;
					}
					default:
						return createErrorResponse(
							"Error",
							`Unknown option type \`${optionType}\` for command \`${command.name}\`.\n\nPlease contact the bot developer to fix this issue.`,
						);
				}

				if (
					optionType !== ApplicationCommandOptionType.Subcommand &&
					optionType !== ApplicationCommandOptionType.SubcommandGroup &&
					value === null &&
					required
				) {
					return createErrorResponse(
						"Error",
						`> Required argument \`${optionName}\` is missing for command \`${command.name}\`.`,
					);
				}

				args.set(optionName, value);
			} else if (message) {
				let value: any = null;
				const required = hasRequiredProperty(option) ? option.required : false;
				const optionName = option.name;
				const optionType = option.type;

				switch (optionType) {
					case ApplicationCommandOptionType.String: {
						const remainingOptions = options.slice(i + 1);
						const hasRequiredOptionsAfter = remainingOptions.some(
							(opt) => hasRequiredProperty(opt) && (opt as any).required,
						);

						if (!hasRequiredOptionsAfter && argIndex < messageArgs.length) {
							value = messageArgs.slice(argIndex).join(" ") || null;
							argIndex = messageArgs.length;
						} else {
							value = messageArgs[argIndex] || null;
							if (value !== null) argIndex++;
						}
						break;
					}

					case ApplicationCommandOptionType.Integer: {
						const intArg = messageArgs[argIndex];
						if (intArg !== undefined) {
							const parsedInt = Number.parseInt(intArg, 10);
							value = !Number.isNaN(parsedInt) ? parsedInt : null;
							argIndex++;
						}
						break;
					}

					case ApplicationCommandOptionType.Boolean: {
						const boolArg = messageArgs[argIndex]?.toLowerCase();
						if (boolArg !== undefined) {
							value =
								boolArg === "true" ? true : boolArg === "false" ? false : null;
							argIndex++;
						}
						break;
					}

					case ApplicationCommandOptionType.User: {
						const userArg = messageArgs[argIndex];

						if (userArg) {
							const userIdMatch = userArg.match(/^<@!?(\d+)>$/);

							if (userIdMatch) {
								const userId = userIdMatch[1];
								value =
									(await message.guild?.members
										.fetch(userId)
										.catch(() => null)) || null;
							} else if (/^\d+$/.test(userArg)) {
								value =
									(await message.guild?.members
										.fetch(userArg)
										.catch(() => null)) || null;
							} else {
								const members = await message.guild?.members.fetch({
									query: userArg,
									limit: 1,
								});
								value = members?.first() || null;
							}
							argIndex++;
						} else if (message.mentions.users.size > 0) {
							value = message.mentions.members?.first() || null;
						}
						break;
					}

					case ApplicationCommandOptionType.Channel: {
						const channelArg = messageArgs[argIndex];

						if (channelArg) {
							const channelIdMatch = channelArg.match(/^<#(\d+)>$/);

							if (channelIdMatch) {
								value =
									message.guild?.channels.cache.get(channelIdMatch[1]) || null;
							} else if (/^\d+$/.test(channelArg)) {
								value = message.guild?.channels.cache.get(channelArg) || null;
							} else {
								value =
									message.guild?.channels.cache.find(
										(ch) => ch.name === channelArg,
									) || null;
							}
							argIndex++;
						} else if (message.mentions.channels.size > 0) {
							value = message.mentions.channels.first() || null;
						}
						break;
					}

					case ApplicationCommandOptionType.Role: {
						const roleArg = messageArgs[argIndex];

						if (roleArg) {
							const roleIdMatch = roleArg.match(/^<@&(\d+)>$/);

							if (roleIdMatch) {
								value = message.guild?.roles.cache.get(roleIdMatch[1]) || null;
							} else if (/^\d+$/.test(roleArg)) {
								value = message.guild?.roles.cache.get(roleArg) || null;
							} else {
								value =
									message.guild?.roles.cache
										.filter(
											(role) =>
												role.name
													.toLowerCase()
													.includes(roleArg.toLowerCase()) ||
												role.name
													.toLowerCase()
													.startsWith(roleArg.toLowerCase()),
										)
										.sort((a, b) => a.name.length - b.name.length)
										.first() || null;
							}
							argIndex++;
						} else if (message.mentions.roles.size > 0) {
							value = message.mentions.roles.first() || null;
						}
						break;
					}

					case ApplicationCommandOptionType.Mentionable: {
						const mentionableArg = messageArgs[argIndex];

						if (mentionableArg) {
							const userIdMatch = mentionableArg.match(/^<@!?(\d+)>$/);
							const roleIdMatch = mentionableArg.match(/^<@&(\d+)>$/);

							if (userIdMatch) {
								value =
									(await message.guild?.members
										.fetch(userIdMatch[1])
										.catch(() => null)) || null;
							} else if (roleIdMatch) {
								value = message.guild?.roles.cache.get(roleIdMatch[1]) || null;
							} else if (/^\d+$/.test(mentionableArg)) {
								value =
									(await message.guild?.members
										.fetch(mentionableArg)
										.catch(
											() =>
												message.guild?.roles.cache.get(mentionableArg) || null,
										)) || null;
							} else {
								value =
									message.guild?.members.cache.find(
										(member) =>
											member.displayName === mentionableArg ||
											member.user.username === mentionableArg,
									) ||
									message.guild?.roles.cache.find(
										(role) => role.name === mentionableArg,
									) ||
									null;
							}
							argIndex++;
						} else if (
							message.mentions.members?.size ||
							message.mentions.roles.size
						) {
							value =
								message.mentions.members?.first() ||
								message.mentions.roles.first() ||
								null;
						}
						break;
					}

					case ApplicationCommandOptionType.Number: {
						const numArg = messageArgs[argIndex];
						if (numArg !== undefined) {
							const parsedNum = Number.parseFloat(numArg);
							value = !Number.isNaN(parsedNum) ? parsedNum : null;
							argIndex++;
						}
						break;
					}

					case ApplicationCommandOptionType.Attachment:
						value = message.attachments.first() || null;
						if (!value) {
							if (message.embeds.length > 0) {
								value = message.embeds[0].image || null;
							}
							const urlArg = messageArgs[argIndex];
							if (
								urlArg &&
								(urlArg.startsWith("http://") || urlArg.startsWith("https://"))
							) {
								value = { url: urlArg, name: "attachment.png" };
								argIndex++;
							} else if (message.reference?.messageId) {
								const referencedMessage = await message.fetchReference();
								if (referencedMessage.attachments.size > 0) {
									value = referencedMessage.attachments.first();
								} else {
									value =
										referencedMessage.embeds[0].image ||
										referencedMessage.embeds[0].thumbnail ||
										null;
								}
							}
						}
						break;
				}

				if (value === null && required) {
					return createErrorResponse(
						"Error",
						`> Required argument \`${optionName}\` is missing for command \`${command.name}\`.`,
					);
				}

				args.set(optionName, value);
			}
		}
	};

	const result = await validateInteractionOptions(options);
	if (result !== undefined) {
		return result;
	}

	ctx.args = args;
	return true;
}
