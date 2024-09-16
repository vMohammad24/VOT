import { EmbedBuilder, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export default {
	description: 'Shows the queue',
	needsPlayer: true,
	execute: async ({ player, interaction, message, member }) => {
		if (!player)
			return {
				content: 'Notihg is currently being played',
				ephemeral: true,
			};
		const queue = player.queue;
		if (!queue.current)
			return {
				content: 'No song is currently playing',
				ephemeral: true,
			};
		const queueWithCurrent = [queue.current, ...queue];
		const embeds = queueWithCurrent.map((track, i) => {
			const requester = track.requester as GuildMember;
			return {
				embed: new EmbedBuilder()
					.setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
					.setDescription(`[${track.title}](${track.uri})`)
					.setColor('Green')
					.setThumbnail(track.thumbnail!)
					.setFooter({
						text: `Requested by ${requester.displayName}`,
						iconURL: requester.displayAvatarURL(),
					}),
				name: track.title,
			}
		});
		await pagination({
			embeds,
			type: 'select',
			interaction,
			message
		});
	},
} as ICommand;
