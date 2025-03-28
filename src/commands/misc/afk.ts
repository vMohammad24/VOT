import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import { getUser } from "../../util/database";
import { timeElapsed } from "../../util/util";

export default {
	name: "afk",
	description: "Set your AFK status",
	options: [
		{
			name: "reason",
			description: "The reason for your AFK status",
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	messageHandler: async (message) => {
		const user = await getUser(message.author, {
			afkReason: true,
			afkSince: true,
		});
		const mentionedUsers = (
			await Promise.all(
				message.mentions.users
					.filter((user) => user.id !== message.author.id)
					.map(
						async (user) =>
							await getUser(user, {
								afkReason: true,
								afkSince: true,
								id: true,
							}),
					),
			)
		).filter((user) => user.afkReason && user.afkSince);
		if (mentionedUsers.length > 0) {
			message.reply({
				embeds: mentionedUsers.map((user) =>
					new EmbedBuilder().setDescription(
						`> <@${user.id}> has been AFK for *${timeElapsed(user.afkSince!, true)}*: **${user.afkReason}**`,
					),
				),
			});
		}
		if (user && user.afkSince && user.afkReason) {
			await commandHandler.prisma.user.update({
				where: { id: message.author.id },
				data: { afkReason: null, afkSince: null },
			});
			const msg = await message.reply({
				embeds: [
					new EmbedBuilder().setDescription(
						`> Welcome back! You've been AFK for *${timeElapsed(user.afkSince, true)}*`,
					),
				],
				allowedMentions: {},
			});
			setTimeout(() => {
				msg.delete().catch(() => {});
			}, 5000);
		}
	},
	execute: async ({ args, handler, user }) => {
		const reason = args.get("reason") ?? "AFK";
		await handler.prisma.user.update({
			where: { id: user.id },
			data: { afkReason: reason, afkSince: new Date() },
		});
		return {
			content: `> You're now AFK: ${reason}`,
			ephemeral: true,
		};
	},
} as ICommand;
