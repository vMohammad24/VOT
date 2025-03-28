import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Pauses the current playing song",
	needsPlayer: true,
	execute: async ({ player, member }) => {
		if (player && member.voice && member.voice.channelId == player.voiceId) {
			if (player.paused)
				return {
					content: "Song is already paused",
					ephemeral: true,
				};
			player.pause(true);
			return {
				content: "Paused song",
				ephemeral: true,
			};
		}
		return {
			content: "u aint no the same vc as me",
		};
	},
} as ICommand;
