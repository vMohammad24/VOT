import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { pagination } from "../../util/pagination";

export default {
	description: "Shows the queue",
	needsPlayer: true,
	aliases: ["q"],
	execute: async ({ player, interaction, message, member }) => {
		if (!player)
			return {
				content: "Notihg is currently being played",
				ephemeral: true,
			};
		const queue = player.queue;
		if (!queue.current)
			return {
				content: "No song is currently playing",
				ephemeral: true,
			};
		const queueWithCurrent = [queue.current, ...queue];
		const pages = await Promise.all(
			queueWithCurrent.map(async (track, i) => {
				if (!track) {
					return {
						page: new EmbedBuilder()
							.setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
							.setDescription("No track found")
							.setColor("DarkRed")
							.setFooter({
								text: "Unknown",
								iconURL: member.displayAvatarURL(),
							}),
						name: "No track found",
					};
				}

				return {
					page: await new VOTEmbed()
						.setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
						.setDescription(`[${track.title}](${track.uri})`)
						.setColor("Green")
						.setThumbnail(track.thumbnail!)
						.setFooter({
							text: `Requested by ${track.requester ? (track.requester as any).displayName : "Unknown"}`,
							iconURL: ((track.requester as any) || member).displayAvatarURL(),
						})
						.dominant(),
					name: track.title,
				};
			}),
		);
		await pagination({
			pages,
			type: "select",
			interaction,
			message,
			name: "Select a track",
		});
	},
} as ICommand;
