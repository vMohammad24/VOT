import { ApplicationCommandOptionType, GuildMember, User } from 'discord.js';
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

// Custom argument parser that handles quotes and spaces
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

export default async function (command: ICommand, ctx: CommandContext): Promise<boolean | string> {
	const { args, interaction, message } = ctx;
	const { options } = command;
	if (!options) return true;
	if (options.length === 0) return true;

	// Parse the message arguments
	const messageArgs = message ? parseMessageArgs(message.content).slice(1) : [];

	let argIndex = 0; // Index for messageArgs
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		let argument: Argument<any> = new Argument(null);

		if (interaction) {
			// Handle interaction-based commands
			switch (option.type) {
				case ApplicationCommandOptionType.String:
					const strValue = interaction.options.getString(option.name, option.required) || null;
					argument = new Argument(strValue);
					if ((argument.value == null || argument.value.trim() === '') && option.required) {
						return `**Error:** Required string argument \`${option.name}\` is missing for command \`${command.name}\`.`;
					}
					break;

				case ApplicationCommandOptionType.Integer:
					const intValue = interaction.options.getInteger(option.name, option.required);
					argument = new Argument(intValue);
					if (argument.value == null && option.required) {
						return `**Error:** Required integer argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`;
					}
					break;

				case ApplicationCommandOptionType.Boolean:
					const boolValue = interaction.options.getBoolean(option.name, option.required);
					argument = new Argument(boolValue);
					if (argument.value == null && option.required) {
						return `**Error:** Required boolean argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`;
					}
					break;

				// Handle other interaction option types as needed

				default:
					// Handle other types or log a warning
					console.warn(`Unhandled option type ${option.type} for command ${command.name}`);
					break;
			}
		} else if (message) {
			// Handle message-based commands
			switch (option.type) {
				case ApplicationCommandOptionType.String:
					let st: string | null = null;
					let remainingOptions = options.slice(i + 1);
					let hasRequiredOptionsAfter = remainingOptions.some(opt => (opt as any).required);

					if (!hasRequiredOptionsAfter) {
						// No required options after; take the rest of the arguments
						st = messageArgs.slice(argIndex).join(' ') || null;
						argIndex = messageArgs.length; // Consume all remaining arguments
					} else {
						st = messageArgs[argIndex] || null;
						argIndex++; // Move to the next argument
					}
					argument = new Argument(st);
					if ((argument.value == null || argument.value.trim() === '') && option.required) {
						return `**Error:** Required string argument \`${option.name}\` is missing for command \`${command.name}\`.`;
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
						return `**Error:** Required integer argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`;
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
						return `**Error:** Required boolean argument \`${option.name}\` is missing or invalid for command \`${command.name}\`.`;
					}
					break;

				case ApplicationCommandOptionType.User:
					// For message-based commands, users are mentioned
					let userVal: GuildMember | User | null = null;
					if (message.mentions.users.size > 0) {
						userVal = message.mentions.users.at(argIndex) || null;
					}
					argument = new Argument(userVal);
					if (argument.value == null && option.required) {
						return `**Error:** Required user argument \`${option.name}\` is missing for command \`${command.name}\`.`;
					}
					// Since mentions are not in messageArgs, do not increment argIndex
					break;

				// Handle other message option types as needed

				default:
					// For types that are not handled, you can log a warning or handle accordingly
					console.warn(`Unhandled option type ${option.type} for command ${command.name}`);
					break;
			}
		}

		args.set(option.name, argument);
	}

	ctx.args = args;
	return true;
}
