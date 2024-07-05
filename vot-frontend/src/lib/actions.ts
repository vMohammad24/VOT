"use server";

import prisma from "./prisma";
import { apiUrl, getApiUrl } from "./utils";

export const submitTicketSettings = async (data: any, guildId: string, token: string) => {
    const user = await prisma.user.findUnique({ where: { token: token } });
    if (!user) return;//console.log({ error: "User not found" });
    const guild = await prisma.guild.findUnique({ where: { id: guildId }, include: { admins: true } });
    if (!guild) return;// console.log({ error: "Guild not found" });
    if (!guild.admins.map(a => a.id).includes(user.id)) return;// console.log({ error: user.name + " is not an admin of this guild" });
    const oldSettings = (await prisma.ticketSettings.findFirst({ where: { guildId: guildId } }));
    const actualData = {
        categoryId: data.category,
        roleId: data.role,
        embedDesc: data.description,
        channelId: data.channel,
        guildId: guildId,
        embedTitle: data.title
    }
    const upd = await prisma.ticketSettings.upsert({
        where: { guildId: guildId },
        update: actualData,
        create: actualData,
    })
    const res = await (await fetch(`${apiUrl}discord/guilds/${guildId}`, {
        method: "PATCH",
        body: JSON.stringify({
            oldChannel: oldSettings?.channelId,
            oldMessage: oldSettings?.messageId,
            shouldUpdateTickets: true
        }),
        headers: {
            authorization: token,
            "Content-Type": "application/json",
        },
    })).text()
    // console.log(res)
    return upd ? { success: true } : { error: "An error occurred" }
};


export const submitWelcomeSettings = async (data: any, guildId: string, token: string) => {
    const user = await prisma.user.findUnique({ where: { token: token } });
    if (!user) return;// console.log({ error: "User not found" });
    const guild = await prisma.guild.findUnique({ where: { id: guildId, admins: { some: { id: user.id } } }, include: { admins: true } });
    if (!guild) return; //console.log({ error: "Guild not found" });
    const oldSettings = (await prisma.welcomeSettings.findFirst({ where: { guildId: guildId } }));
    const actualData = {
        channelId: data.channel,
        guildId: guildId,
        embedDesc: data.description,
        embedTitle: data.title,
        message: data.message
    }
    const upd = await prisma.welcomeSettings.upsert({
        where: { guildId: guildId },
        update: actualData,
        create: actualData,
    })
    return upd ? { success: true } : { error: "An error occurred" }
}