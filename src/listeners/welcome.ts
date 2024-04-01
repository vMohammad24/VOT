import { EmbedBuilder } from "@discordjs/builders";
import type { IListener } from "../handler/listenres";

export default {
    name: "Welcome messages",
    description: "Listens for permission changes for the dashboard",
    execute: ({ client, prisma }) => {
        client.on("guildMemberAdd", async (user) => {
            const guild = await prisma.guild.findFirst({
                where: {
                    id: user.guild.id
                },
                include: {
                    WelcomeSettings: true
                }
            });
            if (!guild) return;
            if (!guild.WelcomeSettings) return;
            if (!guild.WelcomeSettings.channelId) return;
            const channel = user.guild.channels.cache.get(guild.WelcomeSettings.channelId);
            if (!channel) return;
            if (!channel.isTextBased()) return;
            const embed = new EmbedBuilder()
            const userMention = user.toString();
            const embedDescription = guild.WelcomeSettings.embedDesc?.replaceAll("{{user}}", userMention);
            const embedTitle = guild.WelcomeSettings.embedTitle?.replaceAll("{{user}}", userMention);
            const message = guild.WelcomeSettings.message?.replaceAll("{{user}}", userMention);
            if (guild.WelcomeSettings.embedTitle) embed.setTitle(embedTitle!);
            if (guild.WelcomeSettings.embedDesc) embed.setDescription(embedDescription!);
            if (embed.data.title || embed.data.description) {
                if (guild.WelcomeSettings.message) {
                    channel.send({ embeds: [embed], content: message! });
                } else {
                    channel.send({ embeds: [embed] });
                }
            } else {
                if (guild.WelcomeSettings.message) {
                    channel.send(message!);
                }
            }
        })
    }
} as IListener