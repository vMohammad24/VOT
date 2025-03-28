import axios from "axios";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Get a food picture",
	name: "food",
	options: [
		{
			name: "tag",
			description: "The tag you want to search for",
			type: ApplicationCommandOptionType.String,
			required: false,
			choices: [
				"biryani",
				"burger",
				"butter-chicken",
				"dessert",
				"dosa",
				"idly",
				"pasta",
				"pizza",
				"rice",
				"samosa",
			].map((a) => {
				return {
					name: a,
					value: a,
				};
			}),
		},
	],
	type: "all",
	execute: async ({ args }) => {
		const tag = (args.get("tag") as string) || undefined;
		const reqUrl = `https://foodish-api.com/api${tag ? "/images/" + tag : ""}`;
		const res = await axios.get(reqUrl);
		const url = res.data.image;
		if (!url) {
			return {
				content: "An error has occured",
				ephemeral: true,
			};
		}
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle("Food")
					.setImage(url)
					.setColor("Random")
					.setTimestamp()
					.setFooter({ text: "Powered by foodish" }),
			],
		};
	},
} as ICommand;
