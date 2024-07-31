import { Events, GuildMember, EmbedBuilder, type GuildTextBasedChannel, ModalBuilder, ActionRowBuilder, type ModalActionRowComponentBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { IListener } from "../handler/ListenerHandler";
import { createTicket, closeTicket } from "../util/tickets";

export default {
    name: "Tickets Handler",
    execute: async ({ client }) => {

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton()) return;
            switch (interaction.customId) {
                case 'create_ticket':
                    const actionRowBuilder = new ActionRowBuilder<ModalActionRowComponentBuilder>();
                    const textInput = new TextInputBuilder()
                        .setLabel('Reason')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setCustomId('reason')
                    const modal = new ModalBuilder()
                        .setTitle('Create Ticket')
                        .setCustomId('create_ticket_modal')
                        .setComponents(actionRowBuilder.addComponents(textInput))
                    await interaction.showModal(modal);
                    const modalSubmit = await interaction.awaitModalSubmit({ time: 30000 })
                    const reason = modalSubmit.fields.getTextInputValue('reason')
                    const tick = await createTicket(interaction.member as GuildMember, reason)
                    if (tick.error) {
                        const embed = new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription(tick.error)
                            .setColor('Red')
                        modalSubmit.reply({ embeds: [embed], ephemeral: true })
                        return;
                    }
                    modalSubmit.reply({ content: `Ticket created <#${tick.channel?.id}>`, ephemeral: true })
                    break;
                case 'close_ticket':
                    const ticket = await closeTicket(interaction.channel as GuildTextBasedChannel, interaction.member as GuildMember);
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