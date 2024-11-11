import { ApplicationCommandOptionType, Channel, EmbedBuilder, GuildMember, Role, User } from 'discord.js';
import minimist from 'minimist';
import { getUser } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

export class Argument<T> {
	constructor(public value: T) {}
}

export class ArgumentMap<T> {
	private map = new Map<string, Argument<T>>();

	set(key: string, value: T) {
		this.map.set(key, new Argument(value));
	}

	get(key: string): T | undefined {
		return (this.map.get(key)?.value as any).value;
	}
}

function parseMessageArgs(messageContent: string): string[] {
	const args = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';
	for (let i = 0; i < messageContent.length; i++) {
		const char = messageContent[i];
		if (char === '"' || char === "'") {
			if (inQuotes && char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
			} else if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else {
				currentArg += char;
			}
		} else if (char === ' ' && !inQuotes) {
			if (currentArg.length > 0) {
				args.push(currentArg);
				currentArg = '';
			}
		} else {
			currentArg += char;
		}
	}
	if (currentArg.length > 0) {
		args.push(currentArg);
	}
	return args;
}

export default async function (command: ICommand, ctx: CommandContext): Promise<boolean | any> {
	const { args, interaction, message, user } = ctx;
	const { options } = command;
	if (!options) return true;
	if (options.length === 0) return true;
	const pUser = await getUser(user, {
		ArgumentMode: true,
	});
	const messageArgs = message ? parseMessageArgs(message.content).slice(1) : [];

	let argIndex = 0;
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		if (!option) continue;
		let argument: Argument<any> = new Argument(null);
		if (interaction) {
			switch (option.type) {
				case ApplicationCommandOptionType.String:
					const strValue = interaction.options.getString(option.name, option.required) || null;
					argument = new Argument(strValue);
					if ((argument.value == null || argument.value.trim() === '') && 'required' in option && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required string argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Integer:
					const intValue = interaction.options.getInteger(option.name, option.required);
					argument = new Argument(intValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required integer argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Boolean:
					const boolValue = interaction.options.getBoolean(option.name, option.required);
					argument = new Argument(boolValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required boolean argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.User:
					const userValue = interaction.options.getUser(option.name, option.required);
					argument = new Argument(userValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required user argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Channel:
					const channelValue = interaction.options.getChannel(option.name, option.required);
					argument = new Argument(channelValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required channel argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Role:
					const roleValue = interaction.options.getRole(option.name, option.required);
					argument = new Argument(roleValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required role argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Mentionable:
					const mentionableValue = interaction.options.getMentionable(option.name, option.required);
					argument = new Argument(mentionableValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required mentionable argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Number:
					const numberValue = interaction.options.getNumber(option.name, option.required);
					argument = new Argument(numberValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required number argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;

				case ApplicationCommandOptionType.Attachment:
					const attachmentValue = interaction.options.getAttachment(option.name, option.required);
					argument = new Argument(attachmentValue);
					if (argument.value == null && option.required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(
										`Required attachment argument \`${option.name}\` is missing for command \`${command.name}\`.`,
									)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}
					break;
				case ApplicationCommandOptionType.Subcommand:
				case ApplicationCommandOptionType.SubcommandGroup:
					break;
				default:
					return {
						embeds: [
							new EmbedBuilder()
								.setTitle('Error')
								.setDescription(
									`Unknown option type \`${(option as any).type}\` for command \`${command.name}\`.\n\nPlease contact the bot developer to fix this issue.`,
								)
								.setColor('DarkRed')
								.setTimestamp(),
						],
					};
			}
			args.set(option.name, argument);
		} else if (message) {
			let argumentMode: 'Advanced' | 'Normal' = pUser.ArgumentMode;
			const regexDetection = /--\w+/;
			if (regexDetection.test(message.content)) {
				argumentMode = 'Advanced';
			}
			switch (argumentMode) {
				case 'Normal':
					switch (option.type) {
						case ApplicationCommandOptionType.String:
							let st: string | null = null;
							let remainingOptions = options.slice(i + 1);
							let hasRequiredOptionsAfter = remainingOptions.some((opt) => (opt as any).required);

							if (!hasRequiredOptionsAfter) {
								st = messageArgs.slice(argIndex).join(' ') || null;
								argIndex = messageArgs.length;
							} else {
								st = messageArgs[argIndex] || null;
								argIndex++;
							}
							argument = new Argument(st);

							if ((argument.value == null || argument.value.trim() === '') && 'required' in option && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required string argument \`${option.name}\` is missing for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Integer:
							let intVal: number | null = null;
							let intArg = messageArgs[argIndex];
							if (intArg !== undefined) {
								intVal = parseInt(intArg, 10);
								if (isNaN(intVal)) {
									intVal = null;
								}
								argIndex++;
							}
							argument = new Argument(intVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required integer argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Boolean:
							let boolVal: boolean | null = null;
							let boolArg = messageArgs[argIndex];
							if (boolArg !== undefined) {
								if (boolArg.toLowerCase() === 'true') {
									boolVal = true;
								} else if (boolArg.toLowerCase() === 'false') {
									boolVal = false;
								} else {
									boolVal = null;
								}
								argIndex++;
							}
							argument = new Argument(boolVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required boolean argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.User:
							let userArg = messageArgs[argIndex];
							let userVal: GuildMember | User | string | null = null;

							if (userArg) {
								const userIdMatch = userArg.match(/^<@!?(\d+)>$/);
								if (userIdMatch) {
									const userId = userIdMatch[1];
									userVal = (await message.guild?.members.fetch(userId).catch(() => null)) || null;
								} else if (/^\d+$/.test(userArg)) {
									userVal = (await message.guild?.members.fetch(userArg).catch(() => null)) || null;
								} else {
									const members = await message.guild?.members.fetch({ query: userArg, limit: 1 });
									userVal = members?.first() || null;
								}
							} else if (message.mentions.users.size > 0) {
								userVal = message.mentions.members?.first() || null;
							}

							argument = new Argument(userVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required user argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							argIndex++;
							break;

						case ApplicationCommandOptionType.Channel:
							let channelArg = messageArgs[argIndex];
							let channelVal: Channel | null = null;

							if (channelArg) {
								const channelIdMatch = channelArg.match(/^<#(\d+)>$/);
								if (channelIdMatch) {
									const channelId = channelIdMatch[1];
									channelVal = message.guild?.channels.cache.get(channelId) || null;
								} else if (/^\d+$/.test(channelArg)) {
									channelVal = message.guild?.channels.cache.get(channelArg) || null;
								} else {
									channelVal = message.guild?.channels.cache.find((ch) => ch.name === channelArg) || null;
								}
							} else if (message.mentions.channels.size > 0) {
								channelVal = message.mentions.channels.first() || null;
							}

							argument = new Argument(channelVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required channel argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							argIndex++;
							break;

						case ApplicationCommandOptionType.Role:
							let roleArg = messageArgs[argIndex];
							let roleVal: Role | null = null;

							if (roleArg) {
								const roleIdMatch = roleArg.match(/^<@&(\d+)>$/);
								if (roleIdMatch) {
									const roleId = roleIdMatch[1];
									roleVal = message.guild?.roles.cache.get(roleId) || null;
								} else if (/^\d+$/.test(roleArg)) {
									roleVal = message.guild?.roles.cache.get(roleArg) || null;
								} else {
									roleVal = message.guild?.roles.cache.find((role) => role.name === roleArg) || null;
								}
							} else if (message.mentions.roles.size > 0) {
								roleVal = message.mentions.roles.first() || null;
							}

							argument = new Argument(roleVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required role argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							argIndex++;
							break;

						case ApplicationCommandOptionType.Mentionable:
							let mentionableArg = messageArgs[argIndex];
							let mentionableVal: GuildMember | Role | null = null;

							if (mentionableArg) {
								const userIdMatch = mentionableArg.match(/^<@!?(\d+)>$/);
								const roleIdMatch = mentionableArg.match(/^<@&(\d+)>$/);
								if (userIdMatch) {
									const userId = userIdMatch[1];
									mentionableVal = (await message.guild?.members.fetch(userId).catch(() => null)) || null;
								} else if (roleIdMatch) {
									const roleId = roleIdMatch[1];
									mentionableVal = message.guild?.roles.cache.get(roleId) || null;
								} else if (/^\d+$/.test(mentionableArg)) {
									mentionableVal =
										(await message.guild?.members.fetch(mentionableArg).catch(() => null)) ||
										message.guild?.roles.cache.get(mentionableArg) ||
										null;
								} else {
									mentionableVal =
										message.guild?.members.cache.find(
											(member) => member.displayName === mentionableArg || member.user.username === mentionableArg,
										) ||
										message.guild?.roles.cache.find((role) => role.name === mentionableArg) ||
										null;
								}
							} else if (message.mentions.members?.size || message.mentions.roles.size) {
								mentionableVal = message.mentions.members?.first() || message.mentions.roles.first() || null;
							}

							argument = new Argument(mentionableVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required mentionable argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							argIndex++;
							break;

						case ApplicationCommandOptionType.Number:
							let numVal: number | null = null;
							let numArg = messageArgs[argIndex];
							if (numArg !== undefined) {
								numVal = parseFloat(numArg);
								if (isNaN(numVal)) {
									numVal = null;
								}
								argIndex++;
							}
							argument = new Argument(numVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required number argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Attachment:
							const attachmentVal = message.attachments.first() || null;
							argument = new Argument(attachmentVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required attachment argument \`${option.name}\` is missing for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						default:
							break;
					}
					args.set(option.name, argument);
					break;

				case 'Advanced':
					const rawArgs = message ? message.content.split(' ').slice(1) : [];
					const parsedArgs = minimist(rawArgs);
					const optionName = option.name;

					let argValue = parsedArgs[optionName];

					if (argValue === undefined && (option as any).required) {
						return {
							embeds: [
								new EmbedBuilder()
									.setTitle('Error')
									.setDescription(`Required argument \`${option.name}\` is missing for command \`${command.name}\`.`)
									.setColor('DarkRed')
									.setTimestamp(),
							],
						};
					}

					switch (option.type) {
						case ApplicationCommandOptionType.String:
							argument = new Argument(typeof argValue === 'string' ? argValue : null);
							if ((argument.value == null || argument.value.trim() === '') && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required string argument \`${option.name}\` is missing or empty for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Integer:
							const intVal = parseInt(argValue, 10);
							argument = new Argument(!isNaN(intVal) ? intVal : null);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required integer argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Boolean:
							if (typeof argValue === 'boolean') {
								argument = new Argument(argValue);
							} else if (typeof argValue === 'string') {
								if (argValue.toLowerCase() === 'true') {
									argument = new Argument(true);
								} else if (argValue.toLowerCase() === 'false') {
									argument = new Argument(false);
								} else {
									argument = new Argument(null);
								}
							} else {
								argument = new Argument(null);
							}
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required boolean argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.User:
							let userVal: GuildMember | User | null = null;
							if (argValue) {
								const userArg = argValue.toString();
								const userIdMatch = userArg.match(/^<@!?(\d+)>$/);
								if (userIdMatch) {
									const userId = userIdMatch[1];
									userVal = (await message.guild?.members.fetch(userId).catch(() => null)) || null;
								} else if (/^\d+$/.test(userArg)) {
									userVal = (await message.guild?.members.fetch(userArg).catch(() => null)) || null;
								} else {
									const members = await message.guild?.members.fetch({ query: userArg, limit: 1 });
									userVal = members?.first() || null;
								}
							}

							argument = new Argument(userVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required user argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Channel:
							let channelVal: Channel | null = null;
							if (argValue) {
								const channelArg = argValue.toString();
								const channelIdMatch = channelArg.match(/^<#(\d+)>$/);
								if (channelIdMatch) {
									const channelId = channelIdMatch[1];
									channelVal = message.guild?.channels.cache.get(channelId) || null;
								} else if (/^\d+$/.test(channelArg)) {
									channelVal = message.guild?.channels.cache.get(channelArg) || null;
								} else {
									channelVal = message.guild?.channels.cache.find((ch) => ch.name === channelArg) || null;
								}
							}

							argument = new Argument(channelVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required channel argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Role:
							let roleVal: Role | null = null;
							if (argValue) {
								const roleArg = argValue.toString();
								const roleIdMatch = roleArg.match(/^<@&(\d+)>$/);
								if (roleIdMatch) {
									const roleId = roleIdMatch[1];
									roleVal = message.guild?.roles.cache.get(roleId) || null;
								} else if (/^\d+$/.test(roleArg)) {
									roleVal = message.guild?.roles.cache.get(roleArg) || null;
								} else {
									roleVal = message.guild?.roles.cache.find((role) => role.name === roleArg) || null;
								}
							}

							argument = new Argument(roleVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required role argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Mentionable:
							let mentionableVal: GuildMember | Role | null = null;
							if (argValue) {
								const mentionableArg = argValue.toString();
								const userIdMatch = mentionableArg.match(/^<@!?(\d+)>$/);
								const roleIdMatch = mentionableArg.match(/^<@&(\d+)>$/);
								if (userIdMatch) {
									const userId = userIdMatch[1];
									mentionableVal = (await message.guild?.members.fetch(userId).catch(() => null)) || null;
								} else if (roleIdMatch) {
									const roleId = roleIdMatch[1];
									mentionableVal = message.guild?.roles.cache.get(roleId) || null;
								} else if (/^\d+$/.test(mentionableArg)) {
									mentionableVal =
										(await message.guild?.members.fetch(mentionableArg).catch(() => null)) ||
										message.guild?.roles.cache.get(mentionableArg) ||
										null;
								} else {
									mentionableVal =
										message.guild?.members.cache.find(
											(member) => member.displayName === mentionableArg || member.user.username === mentionableArg,
										) ||
										message.guild?.roles.cache.find((role) => role.name === mentionableArg) ||
										null;
								}
							}

							argument = new Argument(mentionableVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required mentionable argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Number:
							const numVal = parseFloat(argValue);
							argument = new Argument(!isNaN(numVal) ? numVal : null);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required number argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						case ApplicationCommandOptionType.Attachment:
							const attachmentVal = message.attachments.first() || null;
							argument = new Argument(attachmentVal);
							if (argument.value == null && option.required) {
								return {
									embeds: [
										new EmbedBuilder()
											.setTitle('Error')
											.setDescription(
												`Required attachment argument \`${option.name}\` is missing for command \`${command.name}\`.`,
											)
											.setColor('DarkRed')
											.setTimestamp(),
									],
								};
							}
							break;

						default:
							break;
					}
					args.set(option.name, argument);
					break;

				default:
					break;
			}
		}
	}

	ctx.args = args;
	return true;
}
