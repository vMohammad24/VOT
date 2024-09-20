import {
	ApplicationCommandOptionType,
	GuildMember,
	Role,
	User,
	type CacheType,
	type CommandInteractionOption,
	type GuildBasedChannel,
} from 'discord.js';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

export class Argument<T> {
	constructor(public value: T) { }
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

export default async function (command: ICommand, ctx: CommandContext) {
	const { args, interaction, message, handler } = ctx;
	const { options } = command;
	if (!options) return true;
	const optionCount = options.length;
	if (optionCount === 0) return true;
	const messageArgs = message?.content?.split(' ').slice(1) || [];
	for (let i = 0; i < optionCount; i++) {
		const option = options[i];
		let argument: Argument<any> = new Argument(null);
		switch (option.type) {
			case ApplicationCommandOptionType.User:
				let member: GuildMember | User | null = null;
				if (interaction) {
					member = (interaction.options.getMember(option.name) ||
						interaction.options.getUser(option.name, option.required)) as GuildMember | User | null;
				} else if (message) {
					member = message.mentions.members?.first() || null;
				}
				argument = new Argument(member);
				break;
			case ApplicationCommandOptionType.Channel:
				let channel: GuildBasedChannel | null = null;
				if (interaction) {
					channel = (interaction.options.getChannel(option.name, option.required) as GuildBasedChannel) || null;
				} else if (message) {
					channel = (message.mentions.channels?.first() as GuildBasedChannel) || null || null;
				}
				argument = new Argument(channel);
				break;
			case ApplicationCommandOptionType.Role:
				let role: Role | null = null;
				if (interaction) {
					role = (interaction.options.getRole(option.name, option.required) as Role) || null;
				} else if (message) {
					role = (message.mentions.roles?.first() as Role) || null;
				}
				argument = new Argument(role);
				break;
			case ApplicationCommandOptionType.Integer:
				let int: number | null = null;
				if (interaction) {
					int = interaction.options.getInteger(option.name, option.required) || null;
				} else if (message) {
					int = parseInt(messageArgs[i]) || null;
				}
				argument = new Argument(int);
				break;
			case ApplicationCommandOptionType.String:
				let st: string | null = null;
				if (interaction) {
					st = interaction.options.getString(option.name, option.required) || null;
				} else if (message) {
					// if there's only 1 argument and its a string use every arg after it
					if (options.length === 1) {
						st = messageArgs.join(' ') || null;
					} else {
						if (messageArgs[i].includes('"') || messageArgs[i].includes("'")) {
							st = messageArgs.slice(i).join(' ') || null;
						} else {
							st = messageArgs[i] || null;
						}
					}
					// if (!options[i + 1]) {
					// 	st = messageArgs.slice(i).join(' ') || null;
					// } else {
					// 	st = messageArgs[i] || null;
					// }
				}
				argument = new Argument(st);
				break;
			case ApplicationCommandOptionType.Boolean:
				let bool: boolean | null = null;
				if (interaction) {
					bool = interaction.options.getBoolean(option.name, option.required) || null;
				} else if (message) {
					const msgArg = messageArgs[i];
					if (msgArg == 'true') {
						bool = true;
					} else if (msgArg == 'false') {
						bool = false;
					}
				}
				argument = new Argument(bool);
				break;
			case ApplicationCommandOptionType.Number:
				let num: number | null = null;
				if (interaction) {
					num = interaction.options.getInteger(option.name, option.required) || null;
				} else if (message) {
					num = parseInt(messageArgs[i]) || null;
				}
				argument = new Argument(num);
				break;
			case ApplicationCommandOptionType.Mentionable:
				let mentionable: CommandInteractionOption<CacheType>['member' | 'role' | 'user'] | null = null;
				if (interaction) {
					mentionable = interaction.options.getMentionable(option.name, option.required);
				} else if (message) {
					mentionable =
						message.mentions.members?.first() ||
						message.mentions.channels.first() ||
						message.mentions.roles.first() ||
						(null as any);
				}
				argument = new Argument(mentionable);
				break;
			case ApplicationCommandOptionType.Attachment:
				let attachment: CommandInteractionOption<CacheType>['attachment'] | null = null;
				if (interaction) {
					attachment = interaction.options.getAttachment(option.name, option.required);
				} else if (message) {
					attachment = message.attachments.first() || null;
				}
				argument = new Argument(attachment);
				break;
			case ApplicationCommandOptionType.Subcommand:
				let subCommand: string | null = null;
				if (interaction) {
					subCommand = interaction.options.getSubcommand((option as any).required) || null;
				} else if (message) {
					subCommand = messageArgs[i] || null;
				}
				argument = new Argument(subCommand);
				break;
			case ApplicationCommandOptionType.SubcommandGroup:
				let subCommandGroup: string | null = null;
				if (interaction) {
					subCommandGroup = interaction.options.getSubcommandGroup((option as any).required) || null;
					break;
				} else {
					subCommandGroup = messageArgs[i] || null;
				}
				argument = new Argument(subCommandGroup);
				break;
			default:
				handler.logger.warn(`Unable to parse arguments for command: ${command.name}, for option: ${option}`);
		}

		args.set(option.name, argument);
	}
	ctx.args = args;
	return true;
}
