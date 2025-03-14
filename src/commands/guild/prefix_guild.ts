import { ApplicationCommandOptionType } from "discord.js";
import commandHandler from "../..";
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    name: "prefix guild",
    type: "guildOnly",
    description: "Set the prefix for this guild",
    options: [
        {
            name: "prefix",
            description: "The prefix to set",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    execute: async ({ args, guild, user }) => {
        if (!guild || user.id !== guild.ownerId) return { content: "You must be the owner of the guild to use this command", ephemeral: true };
        const prefix = args.get("prefix") as string | undefined ?? ';';
        await commandHandler.prisma.guild.update({
            where: { id: guild.id },
            data: { prefix },
        });
        return {
            embeds: [
                new VOTEmbed()
                    .setDescription(`> The prefix for this guild has been set to \`${prefix}\``)
                    .setColor(0x00FF00),
            ], ephemeral: true
        };
    }

} as ICommand