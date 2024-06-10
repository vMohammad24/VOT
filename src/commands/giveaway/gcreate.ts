import { ActionRowBuilder, ApplicationCommandOptionType, EmbedBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { createGiveaway } from "../../util/giveaways";

export default {
    description: "Creates a giveaway",
    name: "gcreate",
    slashOnly: true,
    perms: ["Administrator"],
    init: async (handler) => {
        handler.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.customId !== "gcreate") return;
            const title = interaction.fields.getTextInputValue("gcreate-title");
            const description = interaction.fields.getTextInputValue("gcreate-description");
            const duration = interaction.fields.getTextInputValue("gcreate-duration");
            const winners = interaction.fields.getTextInputValue("gcreate-winners");
            const channel = interaction.channel;
            if (!channel) return;
            if (!title || !description || !duration || !winners) {
                interaction.reply({ content: "Please fill out all the fields", ephemeral: true })
                return;
            }
            const durationRegex = /(\d+)([smhdw])/;
            const durationMatch = duration.match(durationRegex);
            if (!durationMatch) {
                interaction.reply({ content: "Invalid duration", ephemeral: true })
                return;
            }
            let durationValue = parseInt(durationMatch[1]);
            const durationType = durationMatch[2];
            if (isNaN(durationValue)) {
                interaction.reply({ content: "Invalid duration", ephemeral: true })
                return;
            }
            if (durationType === "m") durationValue *= 60;
            if (durationType === "h") durationValue *= 3600;
            if (durationType === "d") durationValue *= 86400;
            if (durationType === "w") durationValue *= 604800;
            if (durationValue < 60) {
                interaction.reply({ content: "Duration must be at least 1 minute", ephemeral: true })
                return;
            }
            if (durationValue > 604800) {
                interaction.reply({ content: "Duration must be at most 1 week", ephemeral: true })
                return;
            }
            const winnersValue = parseInt(winners);
            if (isNaN(winnersValue)) {
                interaction.reply({ content: "Invalid winners", ephemeral: true })
                return;
            }
            if (winnersValue < 1) {
                interaction.reply({ content: "Winners must be at least 1", ephemeral: true })
                return;
            }
            const ga = await createGiveaway(handler, interaction.member as GuildMember, title, description, durationValue, winnersValue, channel as GuildTextBasedChannel);
            interaction.reply({ content: `Created giveaway in <#${ga.channelId}>`, ephemeral: true })
        })
    },
    execute: async ({ interaction, handler }) => {
        if (!interaction) return;
        const titleRow = new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId("gcreate-title")
                    .setPlaceholder("1 BIG MAC")
                    .setRequired(true)
                    .setLabel("Title")
                    .setStyle(TextInputStyle.Short)

            )
        const descRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
                .setCustomId("gcreate-description")
                .setPlaceholder("Iconic McDonald's double-decker burger with two beef patties, special sauce, lettuce, and CHEESE.")
                .setRequired(true)
                .setLabel("Description")
                .setStyle(TextInputStyle.Paragraph)
        )
        const durRow = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("gcreate-duration")
            .setPlaceholder("1d")
            .setRequired(true)
            .setLabel("Duration")
            .setStyle(TextInputStyle.Short))
        const winnersRow = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("gcreate-winners")
            .setPlaceholder("1")
            .setRequired(true)
            .setLabel("Winners")
            .setMinLength(1)
            .setMaxLength(2)
            .setStyle(TextInputStyle.Short))
        const modal = new ModalBuilder()
            .setCustomId("gcreate")
            .setTitle("Create a giveaway")
            .addComponents(titleRow, descRow, durRow, winnersRow)

        await interaction?.showModal(modal);
    },

} as ICommand