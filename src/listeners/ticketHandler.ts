import {
	ActionRowBuilder,
	EmbedBuilder,
	Events,
	type GuildMember,
	type GuildTextBasedChannel,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import type { IListener } from "../handler/ListenerHandler";
import { cancelCloseTimer, closeTicket, createTicket } from "../util/tickets";

export default {
	name: "Tickets Handler",
	execute: async ({ client }) => {
		client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isButton()) return;
			if (interaction.customId === "create_ticket") {
				const actionRowBuilder =
					new ActionRowBuilder<ModalActionRowComponentBuilder>();
				const textInput = new TextInputBuilder()
					.setLabel("Reason")
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(true)
					.setCustomId("reason");
				const modal = new ModalBuilder()
					.setTitle("Create Ticket")
					.setCustomId("create_ticket_modal")
					.setComponents(actionRowBuilder.addComponents(textInput));
				await interaction.showModal(modal);
				const modalSubmit = await interaction.awaitModalSubmit({ time: 60000 });
				await modalSubmit.deferReply({ ephemeral: true });
				const reason = modalSubmit.fields.getTextInputValue("reason");
				const tick = await createTicket(
					interaction.member as GuildMember,
					reason,
				);
				if (tick.error) {
					const embed = new EmbedBuilder()
						.setTitle("Error")
						.setDescription(tick.error)
						.setColor("Red");
					modalSubmit.reply({ embeds: [embed], ephemeral: true });
					return;
				}
				await modalSubmit.editReply({
					content: `Ticket created <#${tick.channel?.id}>`,
				});
			} else if (interaction.customId === "close_ticket") {
				const ticket = await closeTicket(
					interaction.channel as GuildTextBasedChannel,
					interaction.member as GuildMember,
				);
				if (!ticket) return;
				if (ticket.error) {
					const embed = new EmbedBuilder()
						.setTitle("Error")
						.setDescription(ticket.error)
						.setColor("Red");
					await interaction.reply({ embeds: [embed], ephemeral: true });
					return;
				}
				if (ticket.embeds) {
					await interaction.reply({ embeds: ticket.embeds, ephemeral: true });
					return;
				}
			} else if (interaction.customId === "cancel_close_req") {
				const close = await cancelCloseTimer(
					interaction.channel as GuildTextBasedChannel,
				);
				if (close?.error) {
					const embed = new EmbedBuilder()
						.setTitle("Error")
						.setDescription(close.error)
						.setColor("DarkRed");
					await interaction.editReply({ embeds: [embed] });
					return;
				}
				await interaction.editReply({
					content: "Close request has been cancelled",
				});
			}
		});
	},
} as IListener;
