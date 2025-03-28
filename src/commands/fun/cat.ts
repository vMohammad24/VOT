import axios from "axios";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { redis } from "../..";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Get a random cat image/gif",
	name: "cat",
	options: [
		{
			name: "tag",
			description: "The tag you want to search for",
			type: ApplicationCommandOptionType.String,
			required: false,
			autocomplete: true,
		},
	],
	autocomplete: async (inter) => {
		const cached = await redis.get("catTags");
		const data = cached
			? JSON.parse(cached)
			: await (async () => {
					const res = await axios.get("https://cataas.com/api/tags", {
						headers: {
							"Content-Type": "application/json",
						},
					});
					return res.data;
				})();
		const search = inter.options.getString("tag");
		const tags = (data as string[])
			.filter((tag) => tag.length > 0)
			.filter((tag) => (search ? tag.includes(search) : true))
			.slice(0, 25);
		const options = tags.map((tag: string) => ({
			name: tag,
			value: tag,
		}));
		inter.respond(options);
	},
	type: "all",
	execute: async ({ args, interaction }) => {
		const tag = (args.get("tag") as string) || undefined;
		const reqUrl = `https://cataas.com/cat${tag ? "/" + encodeURIComponent(tag.split(" ")[0]) : ""}?html=true`;
		const res = await axios.get(reqUrl, {
			responseType: "json",
		});
		const { data } = res;
		const url = "https://cataas.com/cat/" + data._id;
		if (res.status !== 200) {
			return {
				content: "An error has occured",
				ephemeral: true,
			};
		}
		if (data.message) {
			return {
				content: data.message,
				ephemeral: true,
			};
		}
		const yes = data.mimetype.split("/")[1];
		const embed = new EmbedBuilder()
			.setTitle("Cat")
			.setImage(url + `.${yes}`)
			.setColor("Random")
			.setFooter({ text: `Powered by cataas.com` });
		if (tag && tag.split(" ").length > 1) {
			embed.setDescription(`Showing cats a with tag of "${tag.split(" ")[0]}"`);
		}
		return {
			embeds: [embed],
		};
	},
} as ICommand;
