import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Resumes the current playing song',
	execute: async ({ player, member }) => {
		if (player && member.voice && member.voice.channelId == player.voiceId) {
			if (player.playing)
				return {
					content: 'Song is already resumed',
					ephemeral: true,
				};
			player.pause(false);
			return {
				content: 'Resumed song',
				ephemeral: true,
			};
		}
		return {
			content: 'u aint no the same vc as me',
		};
	},
} as ICommand;
