import { EmbedBuilder } from 'discord.js';
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
		const pages = queueWithCurrent.map((track, i) => {
			if (!track) {
				return {
					page: new EmbedBuilder()
						.setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
						.setDescription('No track found')
						.setColor('Red')
						.setFooter({
							text: 'Unknown',
							iconURL: member.displayAvatarURL(),
						}),
					name: 'No track found',
				};
			}

			return {
				page: new EmbedBuilder()
					.setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
					.setDescription(`[${track.title}](${track.uri})`)
					.setColor('Green')
					.setThumbnail(track.thumbnail!)
					.setFooter({
						text: `Requested by ${track.requester ? (track.requester as any).displayName : 'Unknown'}`,
						iconURL: ((track.requester as any) || member).displayAvatarURL(),
					}),
				name: track.title,
			};
		});
		await pagination({
			pages,
			type: 'select',
			interaction,
			message,
		});
	},
} as ICommand;
