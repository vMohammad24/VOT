import {
	ActionRowBuilder,
	type GuildMember,
	type GuildTextBasedChannel,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import { createGiveaway } from "../../util/giveaways";
import { parseTime } from "../../util/util";

export default {
	description: "Creates a giveaway",
	name: "gcreate",
	slashOnly: true,
	perms: ["Administrator"],
	interactionHandler: async (interaction) => {
		if (!interaction.isModalSubmit()) return;
		if (interaction.customId !== "gcreate") return;
		const title = interaction.fields.getTextInputValue("gcreate-title");
		const description = interaction.fields.getTextInputValue(
			"gcreate-description",
		);
		const duration = interaction.fields.getTextInputValue("gcreate-duration");
		const winners = interaction.fields.getTextInputValue("gcreate-winners");
		const channel = interaction.channel;
		if (!channel) return;
		if (!title || !description || !duration || !winners) {
			await interaction.reply({
				content: "Please fill out all the fields",
				ephemeral: true,
			});
			return;
		}
		const durationValue = parseTime(duration);
		if (durationValue > 262_980_1) {
			await interaction.reply({
				content: "Duration must be at most a month",
				ephemeral: true,
			});
			return;
		}
		const winnersValue = Number.parseInt(winners);
		if (isNaN(winnersValue)) {
			await interaction.reply({ content: "Invalid winners", ephemeral: true });
			return;
		}
		if (winnersValue < 1) {
			await interaction.reply({
				content: "There must be at least 1 winner",
				ephemeral: true,
			});
			return;
		}
		const ga = await createGiveaway(
			commandHandler,
			interaction.member as GuildMember,
			title,
			description,
			durationValue,
			winnersValue,
			channel as GuildTextBasedChannel,
		);
		await interaction.reply({
			content: `Created giveaway in <#${ga.channelId}>`,
			ephemeral: true,
		});
	},
	execute: async ({ interaction, handler }) => {
		if (!interaction) return;
		const titleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("gcreate-title")
				.setPlaceholder("1 BIG MAC")
				.setRequired(true)
				.setLabel("Title")
				.setStyle(TextInputStyle.Short),
		);
		const descRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("gcreate-description")
				.setPlaceholder(
					"Iconic McDonald's double-decker burger with two beef patties, special sauce, lettuce, and CHEESE.",
				)
				.setRequired(true)
				.setLabel("Description")
				.setStyle(TextInputStyle.Paragraph),
		);
		const durRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("gcreate-duration")
				.setPlaceholder("1d")
				.setRequired(true)
				.setLabel("Duration")
				.setStyle(TextInputStyle.Short),
		);
		const winnersRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId("gcreate-winners")
				.setPlaceholder("1")
				.setRequired(true)
				.setLabel("Winners")
				.setMinLength(1)
				.setMaxLength(2)
				.setStyle(TextInputStyle.Short),
		);
		const modal = new ModalBuilder()
			.setCustomId("gcreate")
			.setTitle("Create a giveaway")
			.addComponents(titleRow, descRow, durRow, winnersRow);

		await interaction?.showModal(modal);
	},
} as ICommand;
