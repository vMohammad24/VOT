import { ActionRowBuilder, ApplicationCommandOptionType, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Creates a giveaway",
    name: "gcreate",
    slashOnly: true,
    options: [{
        name: "channel",
        description: "The channel to create the giveaway in",
        type: ApplicationCommandOptionType.Channel,
        required: false
    }],
    execute: async ({ interaction, handler }) => {
        const chan = interaction!.options.getChannel("channel") || interaction!.channel;
        const row = new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId("gcreate-title")
                    .setPlaceholder("1 BIG MAC")
                    .setRequired(true)
                    .setLabel("Title")
                ,
                new TextInputBuilder()
                    .setCustomId("gcreate-description")
                    // .setPlaceholder("Iconic McDonald's double-decker burger with two beef patties, special sauce, lettuce, cheese, pickles, and onions.")
                    .setRequired(true)
                    .setLabel("Description")
                ,
                new TextInputBuilder()
                    .setCustomId("gcreate-duration")
                    .setPlaceholder("1d")
                    .setRequired(true)
                    .setLabel("Duration")
                ,
                new TextInputBuilder()
                    .setCustomId("gcreate-winners")
                    .setPlaceholder("1")
                    .setRequired(true)
                    .setLabel("Winners")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(1)
                    .setMaxLength(2)
                ,
            )
        const modal = new ModalBuilder()
            .setCustomId("gcreate")
            .setTitle("Create a giveaway")
            .addComponents(row)

        await interaction?.showModal(modal);
    },

} as ICommand