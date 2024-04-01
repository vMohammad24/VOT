import { Events, GuildMember, EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import type { IListener } from "../handler/listenres";
import { createTicket, closeTicket } from "../util/tickets";

export default {
    name: "Tickets Handler",
    execute: async ({ prisma, client }) => {

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton()) return;
            switch (interaction.customId) {
                case 'create_ticket':
                    const tick = await createTicket(prisma, interaction.member as GuildMember, "Ticket panel creation")
                    if (tick.error) {
                        const embed = new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription(tick.error)
                            .setColor('Red')
                        interaction.reply({ embeds: [embed], ephemeral: true })
                        return;
                    }
                    interaction.reply({ content: `Ticket created <#${tick.channel?.id}>`, ephemeral: true })
                    break;
                case 'close_ticket':
                    const ticket = await closeTicket(prisma, interaction.channel as GuildTextBasedChannel, interaction.member as GuildMember);
                    if (!ticket) return;
                    if (ticket.error) {
                        const embed = new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription(ticket.error)
                            .setColor('Red')
                        interaction.reply({ embeds: [embed], ephemeral: true })
                        return;
                    }
                    if (ticket.embeds) {
                        interaction.reply({ embeds: ticket.embeds, ephemeral: true })
                        return;
                    }
                    interaction.reply({ content: `Ticket closed`, ephemeral: true })
                    break;
            }
        })
    }
} as IListener;