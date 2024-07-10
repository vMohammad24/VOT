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
    execute: async ({ handler, interaction, args, channel }) => {
        const messageId = args.get("message_id") as string || undefined;
        const giveaway = messageId ? await handler.prisma.giveaway.findFirst({ where: { messageId } }) : await handler.prisma.giveaway.findFirst({ where: { channelId: channel.id }, orderBy: { createdAt: "desc" } });;
        if (!giveaway) return { content: "Couldn't find giveaway.", ephemeral: true };
        if (giveaway.end > new Date()) return { content: "The giveaway has not ended yet", ephemeral: true }
        await rerollGiveaway(giveaway.id).then(() => {
            return { content: "Rerolled the giveaway", ephemeral: true }
        }).catch((e) => {
            console.error(`An error occurred while rerolling ${giveaway.id}: ${e}`);
            return { content: "An error occurred", ephemeral: true }
        })

    }
} as ICommand