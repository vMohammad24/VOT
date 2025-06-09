import { type Client, EmbedBuilder, Events, type Message } from "discord.js";
import type { Kazagumo } from "kazagumo";
import type CommandHandler from ".";
import { getGuild, getUserByID } from "../util/database";
import type ICommand from "./interfaces/ICommand";
import type LegacyHandler from "./interfaces/ILegacyHandler";

export const getPrefix = async (message: Message<boolean>) => {
	let prefix = null;
	const pUser = await getUserByID(message.author.id, { prefix: true });
	if (pUser?.prefix) {
		prefix = pUser.prefix;
	} else {
		if (message.guild) {
			const guild = await getGuild(message.guild, { prefix: true });
			if (guild) {
				prefix = guild.prefix;
			}
		}
	}
	return prefix;
};
export default class LegacyCommandHandler {
	public commands: ICommand[] = [];
	private handler: CommandHandler;

	constructor(
		{ client, commands, kazagumo, globalPrefix }: LegacyHandler,
		handler: CommandHandler,
	) {
		this.commands = commands;
		this.handler = handler;
		this.initListener(client, kazagumo, globalPrefix);
	}

	public initListener(client: Client, kazagumo: Kazagumo, gPrefix: string) {
		client.on(Events.MessageCreate, async (message) => {
			if (message.author.bot) return;

			this.commands.forEach((c) => c.messageHandler?.(message));

			const prefix = (await getPrefix(message)) ?? gPrefix;
			if (!message.content.startsWith(prefix)) {
				if (
					message.mentions.users.has(client.user?.id) &&
					!message.mentions.everyone &&
					!message.mentions.roles.size &&
					!message.mentions.repliedUser
				) {
					if (message.content.trim() === `<@${client.user?.id}>`) {
						message.reply({
							embeds: [
								new EmbedBuilder().setDescription(
									`Your prefix is \`${prefix}\``,
								),
							],
						});
					}
				}
				return;
			}

			const command = this.handler.commands
				?.filter((cmd) => "aliases" in cmd)
				.find((cmd) => {
					if (!cmd.name) return;
					const commandParts = message.content.slice(prefix.length).split(" ");

					if (cmd.name.includes(" ")) {
						const parts = cmd.name.split(" ");
						const cmdParts = commandParts.slice(0, parts.length);
						if (
							parts.join(" ").toLowerCase() === cmdParts.join(" ").toLowerCase()
						)
							return true;
					}

					if (cmd.aliases?.some((alias) => alias.includes(" "))) {
						for (const alias of cmd.aliases) {
							const aliasParts = alias.split(" ");
							const cmdParts = commandParts.slice(0, aliasParts.length);
							if (
								aliasParts.join(" ").toLowerCase() ===
								cmdParts.join(" ").toLowerCase()
							)
								return true;
						}
					}

					const commandName = commandParts[0];
					return (
						cmd.name?.toLowerCase() === commandName.toLowerCase() ||
						cmd.aliases?.some(
							(a) =>
								!a.includes(" ") &&
								a.toLowerCase() === commandName.toLowerCase(),
						)
					);
				}) as ICommand;
			if (!command) return;
			if (command.slashOnly) {
				const msg = await message.reply({
					content: "This command is only available as a slash command",
					allowedMentions: {},
				});
				return;
			}
			const execution = await this.handler.executeCommand(command, message);
			if (execution) {
				try {
					if (!execution.allowedMentions) {
						execution.allowedMentions = {
							parse: [],
							users: [],
							roles: [],
							repliedUser: false,
						};
					}
					const msg = await message.reply(execution);
					if (
						msg.embeds.length > 0 &&
						(msg.embeds[0].title === "Error" ||
							msg.embeds[0].color === 10038562)
					) {
						setTimeout(async () => {
							await Promise.all([msg.delete(), message.delete()]);
						}, 3000);
					}
				} catch (e) {
					try {
						const msg = await message.reply({
							allowedMentions: {
								parse: [],
								users: [],
								roles: [],
								repliedUser: false,
							},
							...execution,
						});
						if (
							msg.embeds.length > 0 &&
							(msg.embeds[0].title === "Error" ||
								msg.embeds[0].color === 10038562)
						) {
							setTimeout(async () => {
								await Promise.all([msg.delete(), message.delete()]);
							}, 3000);
						}
					} catch (error) {}
				}
			}
		});
	}

	public updateCommands() {
		if (this.handler.commands) {
			this.commands = this.handler.commands.filter(
				(cmd) => "aliases" in cmd,
			) as ICommand[];
		}
	}
}
