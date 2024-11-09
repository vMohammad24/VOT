import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Skips the current song',
	needsPlayer: true,
	options: [
		{
			name: 'amount',
			required: false,
			description: 'The amount of songs to skip',
			type: ApplicationCommandOptionType.Integer,
		},
	],
	aliases: ['sk'],
	execute: async ({ player, member, args }) => {
		if (!player)
			return {
				content: 'Notihg is currently being played',
				ephemeral: true,
			};
		const amount = args.get('amount') || 1;
		if (member.voice && member.voice.channelId == player.voiceId) {
			let skippedSongs = 0;
			for (let i = 0; i < amount - 1; i++) {
				if (player.queue.length > 0) {
					player.queue.shift();
					skippedSongs++;
				} else {
					break;
				}
			}
			player.skip();
			skippedSongs++;
			return {
				content: `Skipped ${skippedSongs} song(s)`,
				ephemeral: true,
			};
		}
		return {
			content: 'You are not in the same voice channel as the bot',
			ephemeral: true,
		};
	},
} as ICommand;
