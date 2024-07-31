import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { closeTicket } from "../../util/tickets";

export default {
    name: "close",
    description: "Close a ticket",
    execute: async ({ handler, member, channel }) => {
        const ticket = await closeTicket(channel as GuildTextBasedChannel, member);
        if (!ticket) return;
        if (ticket.error) {
            const embed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription(ticket.error)
                .setColor('Red')
            return { embeds: [embed] }
        }
        if (ticket.embeds) {
            return { embeds: ticket.embeds };
        }
        return ticket;
    }
} as ICommand