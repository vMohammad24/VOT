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
		if (volume < 1 || volume > 100) {
			return {
				content: 'Volume must be between 1 and 100',
				ephemeral: true,
			};
		}
		await player.setVolume(volume);
		return {
			content: `Volume set to ${volume}`,
		};
	},
} as ICommand;
