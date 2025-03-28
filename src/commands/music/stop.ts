import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Clears the queue",
	// needsPlayer: true,
	aliases: ["dc", "disconnect", "s", "leave"],
	execute: async ({ player, member }) => {
		if (!player) {
			return {
				content: "Nothing is currently playing",
				ephemeral: true,
			};
		}
		if (member.voice.channelId !== player.voiceId) {
			return {
				content: "You are not in the same voice channel as me",
				ephemeral: true,
			};
		}
		await player.destroy();
		return {
			content: "Disconnected",
			ephemeral: true,
		};
	},
} as ICommand;
