import { ApplicationCommandOptionType } from "discord.js";
import commandHandler from "../..";
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    name: "prefix user",
    type: "all",
    description: "Set the prefix for your account (NOTE: This has priority over the guild prefix)",
    options: [
        {
            name: "prefix",
            description: "The prefix to set",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    execute: async ({ args, user }) => {
        const prefix = args.get("prefix") as string | undefined ?? ';';
        await commandHandler.prisma.user.update({
            where: { id: user.id },
            data: { prefix },
        });
        return {
            embeds: [
                new VOTEmbed()
                    .setDescription(`> The prefix for your account has been set to \`${prefix}\``)
                    .setColor(0x00FF00),
            ], ephemeral: true
        };
    }

} as ICommand