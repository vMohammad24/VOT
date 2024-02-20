import type { PrismaClient } from "@prisma/client";
import type { Guild, GuildTextBasedChannel } from "discord.js";

export const getLogChannel = async (prisma: PrismaClient, guild: Guild) => {
    const g = await prisma.guild.findUnique({
        where: {
            id: guild.id
        }
    });
    if (!g) return null;
    if (!g.loggingChannel) return null;
    return guild.channels.cache.get(g.loggingChannel) as GuildTextBasedChannel;
}