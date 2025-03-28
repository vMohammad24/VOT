import type { GuildMember } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

export default {
	description: "Shows the current song",
	requireChannel: true,
	guildOnly: true,
	aliases: ["np"],
	execute: async ({ interaction, guild, player, handler }) => {
		if (!player)
			return {
				content: "I am not connected to any voice channel!",
				ephemeral: true,
			};
		if (!player.queue.current)
			return {
				content: "Nothing is currently getting played.",
				ephemeral: true,
			};
		const { current } = player.queue;
		const { title, uri } = current;
		return {
			embeds: [
				await new VOTEmbed()
					.setTitle("Now Playing")
					.setDescription(`[${title}](${uri})`)
					.setThumbnail(current.thumbnail ?? null)
					.setFooter({
						text: `Requested by ${(current.requester as GuildMember).displayName}`,
						iconURL: (current.requester as GuildMember).displayAvatarURL(),
					})
					.setTimestamp()
					.dominant(),
			],
			ephemeral: true,
		};
	},
} as ICommand;
