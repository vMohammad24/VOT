import { ApplicationCommandOptionType } from "discord.js";
import TurnDownService from "turndown";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { searchBraveImages } from "../../util/brave";
import { getEmoji } from "../../util/emojis";
import { pagination } from "../../util/pagination";
import { isNullish } from "../../util/util";
const turndownService = new TurnDownService();

export default {
	description: "Search for images on the internet",
	aliases: ["img", "image", "imgs"],
	options: [
		{
			name: "query",
			description: "The query you want to search for",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: "all",
	execute: async ({ args, interaction, message }) => {
		const query = args.get("query") as string | undefined;
		if (!query)
			return {
				content: "Please provide a query to search for",
				ephemeral: true,
			};
		const brave = await searchBraveImages(query);
		const { results } = brave.data.body.response;
		if (!results || results.length == 0)
			return {
				content: "No results found",
				ephemeral: true,
			};
		await pagination({
			interaction,
			message,
			type: "select",
			name: "Select an image",
			pages: results
				.map((v) => {
					const description = turndownService.turndown(v.description || "");
					return {
						name: v.title.slice(0, 99) || "No title",
						description: description.slice(0, 99) || "No description",
						emoji: (
							getEmoji(v.meta_url.netloc.split(".")[0]) || "🔗"
						).toString(),
						page: new VOTEmbed()
							.setDescription(isNullish(description) ? null : description)
							.setURL(v.url)
							.setAuthor({
								iconURL: v.meta_url.favicon,
								name: v.meta_url.netloc,
							})
							.setImage(v.thumbnail ? v.thumbnail.original : null),
					};
				})
				.filter((v) => v != null)
				.slice(0, 25),
		});
	},
} as ICommand;
