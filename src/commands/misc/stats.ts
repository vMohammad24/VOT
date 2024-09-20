import { APIApplication, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: "stats",
    description: "Shows the bot stats",
    type: 'all',
    execute: async ({ handler }) => {
        const { client } = handler;
        const { memoryUsage } = process;
        const { heapUsed, external } = memoryUsage();
        const { users, guilds, channels } = client;
        const { size } = guilds.cache;
        const { size: usersSize } = users.cache;
        const { size: channelsSize } = channels.cache;
        const res = await client.rest.get('/applications/@me') as APIApplication;
        const { approximate_guild_count, approximate_user_install_count } = res;
        const embed = new EmbedBuilder()
            .setTitle("Bot Stats")
            .addFields({
                name: "Memory Usage",
                value: `${((heapUsed) / 1024 / 1024).toFixed(2)} MB`,
                inline: true
            }, {
                name: "Guilds",
                value: `${size}`,
                inline: true
            }, {
                name: "Users",
                value: `${usersSize}`,
                inline: true
            }, {
                name: "Channels",
                value: `${channelsSize}`,
                inline: true
            },
                {
                    name: "Installed by",
                    value: `${approximate_user_install_count} users`,
                    inline: true
                }, {
                name: "Installed in",
                value: `${approximate_guild_count} servers`,
                inline: true
            }
            )
            .setTimestamp();
        return { embeds: [embed] };
    }
} as ICommand;