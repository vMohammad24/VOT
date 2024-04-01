import type { Giveaway, PrismaClient } from "@prisma/client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, GuildMember, type GuildBasedChannel, type GuildTextBasedChannel } from "discord.js";
import schedule from 'node-schedule';
import { getFrontEndURL } from "./urls";
import type CommandHandler from "../handler";
export async function createGiveaway(handler: CommandHandler, hoster: GuildMember, title: string, description: string, duration: number, winners: number, channel: GuildTextBasedChannel) {
    const { prisma, client } = handler;
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor('Random')
        .setTimestamp()
        .setDescription(`${description && (description + "\n\n")}Ends: <t:${Math.floor((Date.now() + duration * 1000) / 1000)}:R>\nHosted by: ${hoster}`)
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('enter_giveaway')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success)
        )
    const message = await channel.send({
        embeds: [embed], content: '🎉 🎉 🎉 Giveaway 🎉 🎉 🎉', components: [row]
    })
    const endsAt = new Date(Date.now() + duration * 1000);
    const data = await prisma.giveaway.create({
        data: {
            title,
            description,
            hoster: {
                connect: {
                    id: hoster.id
                }
            },
            channelId: channel.id,
            messageId: message.id,
            guild: {
                connectOrCreate: {
                    where: {
                        id: channel.guild.id
                    },
                    create: {
                        id: channel.guild.id,
                        name: channel.guild.name,
                        icon: channel.guild.icon,
                    }
                }
            },
            winnerCount: winners,
            end: endsAt,
        }
    });
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.customId === 'enter_giveaway') {
            const member = interaction.member as GuildMember;
            if (!member) return;
            const giveaway = await prisma.giveaway.findFirst({ where: { messageId: interaction.message.id }, include: { entrants: true } });
            if (!giveaway) {
                interaction.reply({ content: 'ok now something probably went wrong when the hoster craeted the giveaway', ephemeral: true });
                return;
            };
            if (giveaway.end < new Date()) {
                interaction.reply({ content: 'This giveaway has ended', ephemeral: true });
                return;
            }
            if (giveaway.entrants.find(e => e.id === member.id)) {
                interaction.reply({ content: 'You have already entered this giveaway', ephemeral: true });
                return;
            }
            await prisma.giveaway.update({
                where: { id: giveaway.id },
                data: {
                    entrants: {
                        connect: {
                            id: member.id
                        }
                    }
                }
            });
            interaction.update({});
        }
    })
    schedule.scheduleJob(data.id, endsAt, async () => {
        endGiveaway(handler, data.id);
    });
    return data;
}

export async function endGiveaway({ client, prisma, prodMode }: CommandHandler, giveawayId: string) {
    if (!giveawayId) return;
    const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entrants: true } });
    if (!giveaway) return;
    const winners = pickWinners(giveaway, giveaway.winnerCount);
    const guild = await client.guilds.fetch(giveaway.guildId);
    const channel = guild.channels.cache.get(giveaway.channelId) as GuildTextBasedChannel;
    if (!channel) return;
    const message = await channel.messages.fetch(giveaway.messageId!);
    if (!message) return;
    const oldEmbed = message.embeds[0];
    const embed = new EmbedBuilder()
        .setTitle(oldEmbed.title)
        .setColor(oldEmbed.color)
        .setTimestamp()
        .setDescription(oldEmbed.description!.replace(/Ends/, `Ended`))
    await prisma.giveaway.update({
        where: { id: giveaway.id }, data: {
            winners: {
                connect: winners.map(w => ({ id: w.id }))
            },
            ended: true
        }
    });
    const congrats = await message.reply({ content: `Congratulations to ${winners.map(w => `<@${w.id}>`).join(', ')} for winning the giveaway!`, components: [] });
    const url = `${getFrontEndURL(prodMode)}/giveaway/${giveaway.id}`
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setURL(url)
                .setLabel('Summary')
                .setStyle(ButtonStyle.Link)
        )
    message.edit({ embeds: [embed], content: `🎉 🎉 🎉 [Giveaway Ended](${congrats.url}) 🎉 🎉 🎉`, components: [row] });
}

export async function rerollGiveaway(client: Client, prisma: PrismaClient, giveawayId: string) {
    if (!giveawayId) return;
    const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entrants: true } });
    if (!giveaway) return;
    const winners = pickWinners(giveaway, giveaway.winnerCount);
    const guild = await client.guilds.fetch(giveaway.guildId);
    const channel = guild.channels.cache.get(giveaway.channelId) as GuildTextBasedChannel;
    if (!channel) return;
    const message = await channel.messages.fetch(giveaway.messageId!);
    if (!message) return;
    const congrats = await message.reply({ content: `Congratulations to ${winners.map(w => `<@${w.id}>`).join(', ')} for winning the giveaway!`, components: [] });
    message.edit({ content: `🎉 🎉 🎉 [Giveaway Ended](${congrats.url}) 🎉 🎉 🎉`, components: [] });
    await prisma.giveaway.update({
        where: { id: giveaway.id }, data: {
            winners: {
                connect: winners.map(w => ({ id: w.id }))
            }
        }
    });
}


export function pickWinners(ga: Giveaway, winners: number) {
    const giveaway = ga as any;
    const winnerArray = [];
    for (let i = 0; i < winners; i++) {
        winnerArray.push(giveaway.entrants[Math.floor(Math.random() * giveaway.entrants.length)]);
    }
    return winnerArray;
}