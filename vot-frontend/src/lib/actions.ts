"use server";

import prisma from "./prisma";

export const submitTicketSettings = async (data: any, guildId: string, token: string) => {
    const user = await prisma.user.findUnique({ where: { token: token } });
    if (!user) return console.log({ error: "User not found" });
    const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { admins: true } });
    if (!guild) return console.log({ error: "Guild not found" });
    if (!guild.admins.includes(user)) console.log({ error: "User is not an admin of this guild" });
    const actualData = {
        categoryId: data.category,
        roleId: data.role,
        embedDesc: data.description,
        channelId: data.channel,
        guildId: guildId,
        embedTitle: data.title
    }
    console.log("ACTUAL DATA", actualData)
    const upd = await prisma.ticketSettings.upsert({
        where: { guildId: guildId },
        update: actualData,
        create: actualData,
    })
    console.log("UPDATED", upd)
    return upd ? { success: true } : { error: "An error occurred" }
};