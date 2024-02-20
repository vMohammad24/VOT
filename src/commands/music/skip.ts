import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Skips the current song",
    needsPlayer: true,
    execute: async ({ player, member }) => {
        if (!player) return {
            content: "No player found",
            ephemeral: true
        }
        if (member.voice && member.voice.channelId == player.voiceId) {
            player.skip();
            return {
                content: "Skipped song",
                ephemeral: true
            }
        }
        return {
            content: "You are not in the same voice channel as the bot",
            ephemeral: true
        }
    }
} as ICommand