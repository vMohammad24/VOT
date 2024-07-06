import type { PrismaClient } from "@prisma/client";
import { EmbedBuilder, ChannelType, PermissionFlagsBits, CategoryChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild, GuildMember, type GuildTextBasedChannel, ButtonInteraction } from "discord.js";
import { getLogChannel } from "./util";
import Confirm from "./confirm";
import { uploadFile } from "./nest";
import axios from "axios";
import commandHandler from "..";
import { getFrontEndURL } from "./urls";

export async function createTicket(member: GuildMember, reason: string) {
    const { guild } = member;
    const { prisma } = commandHandler;
    const ticketSettings = await prisma.ticketSettings.findUnique({
        where: {
            guildId: guild.id!
        }
    })
    const alreadyExists = await prisma.ticket.findFirst({
        where: {
            guildId: guild.id!,
            userId: member.id,
            open: true
        }
    })
    if (alreadyExists) {
        return { error: "You already have an open ticket <#" + alreadyExists.channelId + ">" };
    }
    const channel = await guild?.channels.create({
        name: `ticket-${member.displayName}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.id!,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: member.id,
                allow: [PermissionFlagsBits.ViewChannel]
            },
            // so vscode doesnt get mad 
            ...(ticketSettings?.categoryId && ticketSettings?.roleId ? [
                {
                    id: ticketSettings.roleId!,
                    allow: [PermissionFlagsBits.ViewChannel]
                }
            ] : [])
        ],
        parent: ticketSettings?.categoryId
            ? (guild.channels.cache.get(ticketSettings.categoryId) as CategoryChannel)
            : undefined,
        reason: `Ticket created by ${member.displayName} for ${reason}`
    });
    if (!channel) return { error: "An error occurred while creating the ticket" };
    const ticket = await prisma.ticket.create({
        data: {
            guildId: guild.id!,
            channelId: channel.id,
            userId: member.id,
            open: true,
            reason
        }
    })
    const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription("Open Reason:\n```" + reason + "```")
        .setColor('Green')
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    )
    channel!.send({ embeds: [embed], components: [row], content: `<@${member.id}>, please wait for a staff member to respond` })
    const logEmbed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`${channel.name} has been created for ${reason}`)
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setColor('Green')
        .setTimestamp()
    const logChannel = (await getLogChannel(prisma, guild));
    logChannel?.send({ embeds: [logEmbed] })
    return { channel, ticket }
}


export async function closeTicket(channel: GuildTextBasedChannel, closedBy: GuildMember) {
    const { prisma } = commandHandler;
    const ticketData = await prisma.ticket.findFirst({
        where: {
            channelId: channel.id
        }
    })
    if (!ticketData) {
        const embed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This is not a ticket channel')
            .setColor('Red')
        return { embeds: [embed] }
    }
    const chan = await channel.guild?.channels.fetch(channel.id) as GuildTextBasedChannel;
    if (!chan) return { error: "An error occurred while fetching the channel" };
    const ticketOwner = await channel.guild?.members.fetch(ticketData.userId);
    const cdnId = await transcriptTicket(chan);
    await prisma.ticket.update({
        where: {
            id: ticketData.id
        },
        data: {
            open: false,
            transcriptId: cdnId
        }
    })
    const logChannel = (await getLogChannel(prisma, channel.guild));
    const logEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription(`Ticket ${chan.name} has been closed`)
        .setAuthor({ name: closedBy.user.displayName, iconURL: closedBy.user.displayAvatarURL() })
        .setColor('Red')
        .setTimestamp()
    const userEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setAuthor({ name: closedBy.user.displayName, iconURL: closedBy.user.displayAvatarURL() })
        .setDescription(`A ticket you have opened in ${chan.guild.name} has been closed`)
        .setTimestamp()
        .setColor('Red')
        .setFooter({ text: `Ticket ID: ${ticketData.id}` })
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel('Transcript')
            .setStyle(ButtonStyle.Link)
            .setEmoji('📋')
            .setURL(`${getFrontEndURL()}/ticket/${ticketData.id}`)
    )
    logChannel?.send({ embeds: [logEmbed], components: [actionRow] })
    await ticketOwner?.send({ embeds: [userEmbed], components: [actionRow] })
    await chan.delete()
    return { content: "Ticked closed. " }
}

export async function transcriptTicket(channel: GuildTextBasedChannel) {
    const { prisma } = commandHandler;
    const ticketData = await prisma.ticket.findFirst({
        where: {
            channelId: channel.id
        }
    })
    if (!ticketData) {
        const embed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription('This is not a ticket channel')
            .setColor('Red')
        return { embeds: [embed] }
    }
    const messages = await channel.messages.fetch();
    const json = []
    for (const message of messages.values()) {
        if (!message) continue;
        if (message.author.bot) continue;
        json.push({
            timestamp: message.createdTimestamp,
            avatar: message.author.displayAvatarURL({ size: 4096 }),
            content: message.content,
            username: message.author.username,
            roleColor: message.member?.displayColor,
            attachments: message.attachments.map(async attachment => {
                const file = new File([(await axios.get(attachment.proxyURL, { responseType: "blob" })).data], attachment.name, { type: attachment.contentType || undefined })
                const uploadedData = await uploadFile(file)
                return uploadedData.cdnFileName

            }),
        })
    }
    const file = new File([JSON.stringify(json)], `${ticketData.id}.json`, { type: 'application/json' })
    const uploadedData = await uploadFile(file)
    return uploadedData.cdnFileName
}