import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Seeks to a certain position in the current playing song",
    options: [{
        name: "position",
        description: "The position to seek to",
        type: ApplicationCommandOptionType.String,
        required: true
    }],
    needsPlayer: true,
    execute: async ({ args, member, player }) => {
        if (!player) {
            return { content: "No player found", ephemeral: true }
        }
        const to = args[0];
        if (!to) {
            return {
                content: "No position provided",
                ephemeral: true
            }
        }
        const parts = to.split(":");
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        if (isNaN(minutes) || isNaN(seconds)) {
            return { content: "Invalid input format. Expected numbers for minutes and seconds.", ephemeral: true };
        }
        const time = (minutes * 60000) + (seconds * 1000);
        await player!.seek(time);
        return {
            content: `Seeked to ${to}`,
            ephemeral: true
        }
    }
} as ICommand