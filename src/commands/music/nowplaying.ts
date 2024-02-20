import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Shows the current song",
    requireChannel: true,
    guildOnly: true,
    execute: async ({ interaction, channel, message, player }) => {
        return {
            content: "This command is currently disabled",
            ephemeral: true
        }
    }
} as ICommand