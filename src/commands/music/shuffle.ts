import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Shuffles the queue",
	needsPlayer: true,
	execute: async ({ player }) => {
		if (!player) {
			return { content: "Notihg is currently being played", ephemeral: true };
		}
		player.queue.shuffle();
		return {
			content: "Shuffled the queue",
			ephemeral: true,
		};
	},
} as ICommand;
