import type { GuildMember } from "discord.js";
import commandHandler from "..";
import axios from "axios";


export const discordClientId = process.env.DISCORD_CLIENT_ID!;
export const discordClientSecret = process.env.DISCORD_CLIENT_SECRET!;
export const spotifyClientId = process.env.SPOTIFY_CLIENT_ID!;
export const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET!;


export const updateGuilds = async (userId: string): Promise<any> => {
    const { prisma } = commandHandler;
    if (!prisma) {
        return { error: "Prisma not found (somehow)" }
    };
    if (!userId) {
        return { error: "Invalid user id" }
    }
    const user = await prisma.user.findFirst({ where: { id: userId }, include: { discord: true } });
    if (!user) {
        return { error: "Invalid user" };
    }
    // if (!user.discord) {
    //     return { error: "user discord not found" };
    // };

    // const { discord } = user;
    // const lastUpdate = lastUpdateForUser.get(user.id);
    // if (lastUpdate && Date.now() - lastUpdate.getTime() < 5 * 60 * 1000) {
    //     return { error: "maybe later" };
    // }
    // const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
    //     headers: {
    //         Authorization: `Bearer ${discord.token}`,
    //         'Accept-Encoding': 'identity'
    //     },
    // });
    // const resGuilds = await guildsRes.data as any;
    // if (guildsRes.status == 401 || guildsRes.status == 400) {
    //     const ref = await refreshToken(discord.refreshToken);
    //     if (typeof ref != "string") {
    //         return ref;
    //     }
    //     return await updateGuilds(userId);
    // }
    // if (resGuilds.error_description) {
    //     return { error: resGuilds.error_description };
    // }
    // const guilds = (resGuilds as any[]).filter(guild => (guild.permissions & 0x20) === 0x20);
    // const allGuilds = await prisma.guild.findMany({
    //     where: {
    //         admins: {
    //             some: {
    //                 id: user.id
    //             }
    //         }
    //     }
    // })
    // for (const guild of guilds) {
    //     const g = await commandHandler.prisma.guild.upsert({
    //         where: {
    //             id: guild.id,
    //         },
    //         update: {
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connect: {
    //                     id: user.id,
    //                 }
    //             }
    //         },
    //         create: {
    //             id: guild.id,
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connect: {
    //                     id: user.id,
    //                 }
    //             }
    //         },
    //     })
    // }
    // for (const guild of allGuilds) {
    //     if (!guilds.find(g => g.id === guild.id)) {
    //         await commandHandler.prisma.guild.update({
    //             where: {
    //                 id: guild.id,
    //             },
    //             data: {
    //                 admins: {
    //                     disconnect: {
    //                         id: user.id
    //                     }
    //                 }
    //             }
    //         })
    //     }
    // }
    const allGuilds = commandHandler.client.guilds.cache;
    const guildsInAdmin = [];
    for (const [, guild] of allGuilds) {
        const admins: GuildMember[] = []
        for (const [, mem] of guild.members.cache) {
            if (mem.user.bot) continue;
            if (mem.permissions.has('Administrator')) {
                admins.push(mem);
            }
        }
        if (!guild) continue
        const g = await commandHandler.prisma.guild.upsert({
            where: {
                id: guild.id
            },
            update: {
                name: guild.name,
                icon: guild.icon,
                admins: {
                    set: admins.map(m => {
                        return {
                            id: m.id
                        }
                    })
                }
            },
            create: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                admins: {
                    connectOrCreate: admins.map(m => {
                        return {
                            where: {
                                id: m.id
                            },
                            create: {
                                id: m.id,
                                name: m.user.username,
                                avatar: m.user.avatar
                            }
                        }
                    })
                }
            },
            include: {
                admins: {
                    select: {
                        id: true
                    }
                }
            }
        })
        if (g.admins.includes({ id: userId })) {
            guildsInAdmin.push(g)
        }
    }
    return guildsInAdmin
}
export const refreshToken = async (refreshToken: string) => {
    const tokenResponseData = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: discordClientId,
        client_secret: discordClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'identity'
        },
    });
    if (tokenResponseData.status != 200 || !tokenResponseData.data) {
        return {
            error: "Invalid refresh token, please reauthorize",
            code: 401
        }
    }
    const tokenResponse = await tokenResponseData.data as any;
    if (tokenResponse.error === "invalid_grant") {
        return {
            error: "Invalid refresh token, please reauthorize",
            code: 401
        };
    }
    const userRes = await axios.get('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`
        },
    });
    const resUser = await userRes.data as any;
    if (resUser.error_description) {
        return {
            error: resUser.error_description,
            code: 401
        };
    }
    if (resUser.id) {
        await commandHandler.prisma.user.update({
            where: {
                id: resUser.id
            },
            data: {
                discord: {
                    update: {
                        expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                        token: tokenResponse.access_token,
                        refreshToken: tokenResponse.refresh_token,
                    }
                },
                avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
            }
        })
    }
    return tokenResponse.access_token as string;
}

