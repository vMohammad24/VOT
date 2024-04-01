import type { PrismaClient } from "@prisma/client";
import { EmbedBuilder, ChannelType, PermissionFlagsBits, CategoryChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild, GuildMember, type GuildTextBasedChannel, ButtonInteraction } from "discord.js";
import { getLogChannel } from "./util";
import Confirm from "./confirm";

export async function createTicket(prisma: PrismaClient, member: GuildMember, reason: string) {
    const { guild } = member;
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
        return { error: "You already have an open ticket" };
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
            open: true
        }
    })
    const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`Please wait for a staff member to assist you`)
        .setColor('Green')
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    )
    channel!.send({ embeds: [embed], components: [row], content: `<@${member.id}>` })
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


export async function closeTicket(prisma: PrismaClient, channel: GuildTextBasedChannel, closedBy: GuildMember) {
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
    // const messages = await chan.messages.fetch();
    // let content = "";
    // for (const message of messages.values()) {
    //     if (!message) continue;
    //     if (message.author.bot) continue;
    //     content += `(${message.createdTimestamp}) (${message.author.username}) ${message.content}\n`
    // }
    // const uploadedData = await uploadFile([content])
    // console.log(uploadedData)
    await prisma.ticket.update({
        where: {
            id: ticketData.id
        },
        data: {
            open: false,
            // transcriptId: uploadedData.cdnFileName
        }
    })
    const logChannel = (await getLogChannel(prisma, channel.guild));
    const logEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setDescription(`Ticket ${chan.name} has been closed`)
        .setAuthor({ name: closedBy.user.displayName, iconURL: closedBy.user.displayAvatarURL() })
        // .addFields({
        //     name: 'Transcript',
        //     value: `[Download](https://cdn.nest.rip/uploads/${uploadedData.cdnFileName})`
        // })
        .setColor('Red')
        .setTimestamp()
    logChannel?.send({ embeds: [logEmbed] })
    await chan.delete()
    return { content: "Ticked closed. " }
}