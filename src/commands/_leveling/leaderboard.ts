import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Displays the leaderboard",
	aliases: ["lb"],
	execute: async ({ handler, guild }) => {
		const prismaMembers = await handler.prisma.member.findMany({
			where: {
				guildId: guild.id,
			},
			orderBy: {
				level: "desc",
			},
			take: 10,
			select: {
				user: {
					select: {
						name: true,
					},
				},
				level: true,
			},
		});
		const embed = new EmbedBuilder()
			.setTitle("Leaderboard")
			.setDescription(
				`**Top 10**\n\n${prismaMembers
					.map(
						(member, index) =>
							`**${index + 1}**. ${member.user.name}: ${member.level}`,
					)
					.join("\n")}`,
			)
			.setColor("Random");

		return {
			embeds: [embed],
		};
	},
} as ICommand;
