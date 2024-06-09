import { EmbedBuilder } from "discord.js";
import type ICommand from "../handler/interfaces/ICommand";
import type { IListener } from "../handler/listenres";

export const expNeededForLevel = (needed: number) => {
    return 5 * Math.pow(needed, 2) + 50 * needed + 100
}

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
            const user = await prisma.user.upsert({
                where: {
                    id: message.author.id,
                },
                update: {
                    name: message.author.username,
                    avatar: message.author.displayAvatarURL({ extension: 'png' })
                },
                create: {
                    id: message.author.id,
                    name: message.author.username,
                    avatar: message.author.displayAvatarURL({ extension: 'png' }),
                },
            });
            const member = await prisma.member.upsert({
                where: { userId_guildId: { guildId: message.guild!.id, userId: message.author.id } },
                update: {},
                create: {
                    guildId: message.guild!.id,
                    exp: 0,
                    level: 1,
                    userId: user.id,
                }
            })
            // if (member.messagesToday >= 100) return;
            console.log(member.lastMessage?.getTime(), Date.now())
            if (member.lastMessage && member.lastMessage.getTime() < Date.now() - 3000) return;
            const expGained = Math.min(message.content.length / 2, 20)
            console.log(`${message.author.tag} gained ${expGained} exp.`)
            const newExp = member.exp + expGained
            if (newExp >= expNeededForLevel(member.level + 1)) {
                member.exp = 0
                member.level += 1
                const embed = new EmbedBuilder()
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTitle("Level Up!")
                    .setDescription(`Congratulations to ${message.author} for leveling up to level ${member.level}!`)
                    .setColor("Random")
                    .setTimestamp()
                await message.reply({ embeds: [embed], allowedMentions: {} })
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