import { EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: "stats",
    description: "Shows the bot stats",
    type: 'all',
    execute: async ({ handler }) => {
        const { client } = handler;
        const { memoryUsage } = process;
        const { rss, external } = memoryUsage();
        const { users, guilds, channels, application } = client;
        const { size } = guilds.cache;
        const { size: usersSize } = users.cache;
        const { size: channelsSize } = channels.cache;
        const { approximateGuildCount: guildCount, approximateUserInstallCount: userCount } = application!;
        const embed = new EmbedBuilder()
            .setTitle("Bot Stats")
            .addFields({
                name: "Memory Usage",
                value: `${((rss) / 1024 / 1024).toFixed(2)} MB`,
            }, {
                name: "Guilds",
                value: `${size}`,
            }, {
                name: "Users",
                value: `${usersSize}`,
            }, {
                name: "Channels",
                value: `${channelsSize}`,
            })
            .setTimestamp();

        if (userCount) {
            embed.addFields({
                name: "Installed by",
                value: `${userCount} users`,
            })
        }
        if (guildCount) {
            embed.addFields({
                name: "Installed in",
                value: `${guildCount} servers`,
            })
        }
        return { embeds: [embed] };
    }
} as ICommand;