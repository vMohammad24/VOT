import { ApplicationCommandOptionType, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Purges messages from a channel",
    options: [{
        name: "amount",
        description: "The amount of messages to purge",
        type: ApplicationCommandOptionType.Integer,
        required: true
    }],
    perms: ["ManageMessages"],
    execute: async ({ channel, args, message }) => {
        const amount = parseInt(args[0]);
        if (!amount || isNaN(amount)) {
            return {
                content: "Invalid amount",
                ephemeral: true
            }
        }
        await message?.delete();
        const deletedMessages = await (channel as GuildTextBasedChannel).bulkDelete(amount, true);
        return {
            content: `Purged ${deletedMessages.size} messages`,
            ephemeral: true
        }
    },

} as ICommand