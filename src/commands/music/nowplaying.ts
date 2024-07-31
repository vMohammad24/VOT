import type ICommand from "../../handler/interfaces/ICommand";
import { getPanel } from "../../util/music";

export default {
    description: "Shows the current song",
    requireChannel: true,
    guildOnly: true,
    aliases: ["np"],
    execute: async ({ interaction, guild, player, handler }) => {
        const msg = await getPanel(handler.kazagumo, guild);
        if (!msg) return {
            content: "There is no player in this guild.",
            ephemeral: true
        }
        return {
            content: `you can go to ${msg.url} to manage the player.`,
            ephemeral: true
        }
    }
} as ICommand