import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Skips the current song",
    needsPlayer: true,
    options: [
        {
            name: "amount",
            required: false,
            description: "The amount of songs to skip",
            type: ApplicationCommandOptionType.Integer
        }
    ],
    execute: async ({ player, member, args }) => {
        if (!player) return {
            content: "No player found",
            ephemeral: true
        }
        const amount = parseInt(args[0]) || 1;
        if (member.voice && member.voice.channelId == player.voiceId) {
            let skippedSongs = 0;
            for (let i = 0; i < amount; i++) {
                player.skip();
                skippedSongs++;
            }
            return {
                content: `Skipped ${skippedSongs} song(s)`,
                ephemeral: true
            }
        }
        return {
            content: "You are not in the same voice channel as the bot",
            ephemeral: true
        }
    }
} as ICommand