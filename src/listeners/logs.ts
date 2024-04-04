import type { PrismaClient } from "@prisma/client/extension";
import type { IListener } from "../handler/listenres";
import { AuditLogEvent, EmbedBuilder, Guild, type GuildTextBasedChannel, type TextBasedChannel } from "discord.js";

const getLogChannel = async (prisma: PrismaClient, guild: Guild) => {
    const g = await prisma.guild.upsert({
        where: {
            id: guild.id
        },
        update: {},
        create: {
            id: guild.id,
            name: guild.name,
            icon: guild.icon || "",
        },
    });
    if (!guild) return null;
    return (guild.channels.cache.get(g.loggingChannel) as GuildTextBasedChannel) || null;
}

export default {
    description: "Listens for logs",
    name: "Logs Handler",
    execute: ({ client, prisma, kazagumo }) => {
        client.on("messageDelete", async (message) => {
            if (message.author!.bot) return;
            const logChannel = await getLogChannel(prisma, message.guild!);
            if (!logChannel) return;
            // check if it was deleted by the bot
            const embed = new EmbedBuilder()
                .setTitle("Message Deleted")
                .setAuthor({ name: message.author!.tag, iconURL: message.author!.displayAvatarURL() })
                .addFields(
                    {
                        name: "Channel",
                        value: (message.channel! as GuildTextBasedChannel).name,
                        inline: true
                    },
                    {
                        name: "Content",
                        value: message.content!.length > 1024 ? message.content!.slice(0, 1024) : message.content!
                    })
                .setColor("DarkRed")
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        })
        client.on("messageUpdate", async (oldMessage, newMessage) => {
            if (oldMessage.author!.bot) return;
            if (oldMessage.content === newMessage.content) return;
            const logChannel = await getLogChannel(prisma, oldMessage.guild!);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setTitle(`Message Updated`)
                .setDescription(`[Jump to message](${oldMessage.url})`)
                .setAuthor({ name: oldMessage.author!.tag, iconURL: oldMessage.author!.displayAvatarURL() })
                .addFields(
                    {
                        name: "Channel",
                        value: (oldMessage.channel! as GuildTextBasedChannel).name,
                        inline: true
                    },
                    {
                        name: "Old Content",
                        value: oldMessage.content!,
                    }, {
                    name: "New Content",
                    value: newMessage.content!
                })
                .setColor("Orange")
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        })


        client.on('guildAuditLogEntryCreate', async (entry, guild) => {
            const logChannel = await getLogChannel(prisma, guild);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setTitle('Audit Log Entry Created')
                .setDescription(entry.reason)
                .addFields({
                    name: 'Action',
                    value: AuditLogEvent[entry.action],
                },
                    {
                        name: 'Target',
                        value: entry.target?.toString() || 'None',
                    })
                .setColor('Yellow')
                .setTimestamp()
            if (entry.executor) {
                embed.setAuthor({ name: entry.executor!.displayName, iconURL: entry.executor!.displayAvatarURL() })
            }
            logChannel.send({ embeds: [embed] });
        })
    }
} as IListener