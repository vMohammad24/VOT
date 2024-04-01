import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { rerollGiveaway } from "../../util/giveaways";

export default {
    description: "Rerolls a giveaway",
    name: "reroll",
    options: [
        {
            name: "message_id",
            description: "The message id of the giveaway",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    slashOnly: true,
    execute: async ({ handler, interaction }) => {
        if (!interaction) return;
        const messageId = interaction.options.getString("message_id", false);
        const giveaway = messageId ? await handler.prisma.giveaway.findFirst({ where: { messageId } }) : await handler.prisma.giveaway.findFirst({ where: { channelId: interaction.channelId }, orderBy: { createdAt: "desc" } });;
        if (!giveaway) return interaction.reply({ content: "Couldn't find giveaway.", ephemeral: true });
        if (giveaway.end > new Date()) return interaction.reply({ content: "The giveaway has not ended yet", ephemeral: true });
        await rerollGiveaway(handler.client, handler.prisma, giveaway.id).then(() => {
            interaction.reply({ content: "Rerolled the giveaway", ephemeral: true });
        }).catch((e) => {
            interaction.reply({ content: "An error occurred", ephemeral: true });
            console.error(`An error occurred while rerolling ${giveaway.id}: ${e}`);
        })

    }
} as ICommand