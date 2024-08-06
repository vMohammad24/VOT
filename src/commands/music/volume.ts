import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Sets the volume of the player',
	needsPlayer: true,
	aliases: ['v', 'vol'],
	options: [
		{
			name: 'volume',
			description: 'The volume to set',
			type: ApplicationCommandOptionType.Integer,
			required: false,
		},
	],
	execute: async ({ player, member, args, interaction }) => {
		if (!player) {
			return {
				content: 'Nothing is currently playing',
				ephemeral: true,
			};
		}
		const volume = args.get('volume');
		if (isNaN(volume))
			return {
				content: 'Invalid volume',
				ephemeral: true,
			};
		interaction?.deferReply();
		await player.setVolume(volume);
		try {
			return {
				content: `Volume set to ${volume}`,
			};
		} catch {
			interaction?.editReply('Volume set to ' + volume);
		}
	},
} as ICommand;
