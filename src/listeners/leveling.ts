import { EmbedBuilder } from "discord.js";
import type ICommand from "../handler/interfaces/ICommand";
import type { IListener } from "../handler/listenres";

export default {
    name: "Leveling System",
    description: "Leveling related events",
    execute: async ({ prisma, client }) => {
        client.on("ready", async () => {
            setInterval(async () => {
                prisma.member.updateMany({
                    data: {
                        messagesToday: 0
                    },
                    where: {
                        messagesToday: {
                            gt: 0
                        }
                    }
                })
            }, 1000 * 60 * 60 * 24)
        })
        client.on("messageCreate", async (message) => {
            if (message.author.bot) return;
            const member = await prisma.member.upsert({
                where: { userId_guildId: { guildId: message.guild!.id, userId: message.author.id } },
                update: {},
                create: {
                    guildId: message.guild!.id,
                    exp: 0,
                    level: 0,
                    userId: message.author.id,
                }
            })
            if (member.messagesToday >= 100) return;
            if (member.lastMessage && member.lastMessage.getDate() > Date.now() - 60000) return;
            const expGained = Math.max(message.content.length / 2, 20)
            const newExp = member.exp + expGained
            if (newExp >= 1000) {
                member.exp = newExp - 100
                member.level += 1
                const embed = new EmbedBuilder()
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTitle("Level Up!")
                    .setDescription(`Congratulations to ${message.author} for leveling up to level ${member.level}!`)
                    .setColor("Random")
                    .setTimestamp()
                await message.reply({ embeds: [embed] })
            } else {
                member.exp = newExp
            }
            member.lastMessage = new Date()
            await prisma.member.update({
                where: { userId_guildId: { guildId: message.guild!.id, userId: message.author.id } },
                data: member
            })
        })
    }
} as IListener