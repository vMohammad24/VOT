import {
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
} from "@discordjs/builders";
import { ApplicationCommandOptionType, ButtonStyle } from "discord.js";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import { searchSaver } from "../../util/beatsaver";
import { type PaginationOptions, pagination } from "../../util/pagination";
import { getFrontEndURL } from "../../util/urls";

export default {
	name: "bsaber",
	description: "Get a beat saber map for the currently playing song",
	aliases: ["bs", "beatsaver", "beatsaber"],
	options: [
		{
			name: "song",
			required: false,
			description: "The song you want to search for",
			type: ApplicationCommandOptionType.String,
		},
	],
	type: "all",
	execute: async ({ interaction, player, message, member, args }) => {
		const songTitle =
			args.get("song") || (player ? player.queue.current?.title : null);
		if (!songTitle)
			return { content: "Couldn't retrive song", ephemeral: true };
		try {
			const res = await searchSaver(songTitle, "Relevance");
			if (typeof res === "string") return { content: res, ephemeral: true };
			if (res.length === 0)
				return { content: "No maps were found for this song", ephemeral: true };
			const items = res.map(async (map) => {
				// Log the map object to inspect its structure

				const latestVersion = map.versions[map.versions.length - 1];
				const mapName = map.name ?? "Unknown";
				const description = map.description.substring(0, 200);
				const uploaderName = map.uploader?.name ?? "Unknown uploader";
				const upvotes = map.stats?.upvotes?.toString() ?? "0";
				const downvotes = map.stats?.downvotes?.toString() ?? "0";
				const rating = map.stats?.score?.toString() ?? "N/A";
				const coverURL = latestVersion.coverURL ?? "";
				const oneClickURL = `${getFrontEndURL()}/beatsaber?id=${map.id}`;
				const previewURL = latestVersion.previewURL ?? "";
				const avatarURL = map.uploader?.avatar ?? "";
				// const preview = await axios.get(previewURL, { responseType: 'arraybuffer' });
				return {
					page: {
						embeds: [
							new EmbedBuilder()
								.setTitle(mapName)
								.setDescription(description === "" ? null : description)
								.setFields([
									{ name: "Upvotes", value: upvotes, inline: true },
									{ name: "Downvotes", value: downvotes, inline: true },
								])
								.setThumbnail(coverURL)
								.setFooter({
									text: `Mapped by ${uploaderName} • ${rating} rating`,
									iconURL: avatarURL,
								})
								.setTimestamp(new Date(map.updatedAt))
								.setColor([0, 255, 0]),
						],
						// attachments: preview ? [new AttachmentBuilder(Buffer.from(preview.data), { name: 'preview.mp3', description: `${mapName}'s preview` })] : [],
						components: [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								new ButtonBuilder()
									.setURL(oneClickURL)
									.setLabel("Download")
									.setStyle(ButtonStyle.Link),
							),
						],
					},
					name: mapName,
				};
			});
			await pagination({
				interaction: interaction,
				message: message,
				pages: (await Promise.all(items)) as PaginationOptions["pages"],
				type: "select",
				name: "Select a map",
			});
		} catch (error) {
			commandHandler.logger.error(error);
			return {
				content: "An error occurred while fetching the beat map.",
				ephemeral: true,
			};
		}
	},
} as ICommand;
