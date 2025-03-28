import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getUserByID } from "../../util/database";

export default {
	name: "balance",
	description: "Check your balance",
	aliases: ["bal"],
	type: "all",
	options: [
		{
			name: "user",
			description: "The user you want to check the balance of",
			type: ApplicationCommandOptionType.User,
			required: false,
		},
	],
	execute: async ({ user: author, args }) => {
		const userId = args.get("user") ? args.get("user").id : author.id;
		const pUser = await getUserByID(userId, {
			economy: true,
			name: true,
			id: true,
		});
		return {
			embeds: [
				new VOTEmbed()
					.setAuthor({ name: pUser.name!, iconURL: pUser.avatar || undefined })
					.setDescription(`<@${pUser.id}> has $${pUser.economy.balance}`)
					.setTimestamp(),
			],
		};
	},
} as ICommand;
