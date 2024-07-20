import axios from "axios";
import type ICommand from "../../handler/interfaces/ICommand";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
export default {
    description: "Displays information about the server",
    type: "guildOnly",
    execute: async ({ guild }) => {
        const embed = new EmbedBuilder();
        embed
            .setAuthor({ name: guild.name })
            .setThumbnail(guild.iconURL())
            .addFields(
                {
                    name: "Members",
                    value: guild.memberCount.toString(),
                    inline: true
                },
                {
                    name: "Owner",
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: "Created",
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
                    inline: true
                },
                {
                    name: "Boosts",
                    value: (guild.premiumSubscriptionCount || 0).toString(),
                    inline: true
                }
            ).setTimestamp()
            .setColor('Random')

        return {
            embeds: [embed]
        }
    }
} as ICommand