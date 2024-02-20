import type { PrismaClient } from "@prisma/client";
import { EmbedBuilder, ChannelType, PermissionFlagsBits, CategoryChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild, GuildMember } from "discord.js";
import { getLogChannel } from "./util";

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
        return;
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
    if (!channel) return;
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
    channel?.send({ embeds: [embed], components: [row] })
    const logEmbed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`${channel.name} has been created for ${reason}`)
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setColor('Green')
        .setTimestamp()
    const logChannel = (await getLogChannel(prisma, guild));
    logChannel?.send({ embeds: [logEmbed] })
    return { embeds: [logEmbed], channel, ticket }
}