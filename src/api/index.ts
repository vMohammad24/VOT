import express from 'express'
import commandHandler from '..';
import { getFrontEndURL, getRedirectURL } from '../util/urls';
import queryString from 'query-string';
import cors from 'cors'
import bodyParser from 'body-parser';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Guild, GuildMember, PermissionFlagsBits, type GuildTextBasedChannel, type TextBasedChannel } from 'discord.js';
import type { PrismaClient } from '@prisma/client';
import axios from 'axios';

const server = express()
const upSince = Date.now();

server.use(express.json())
server.use(cors())
server.use(bodyParser.urlencoded({
    extended: true
}));
// Declare a route
server.get('/', function (req, res) {
    const ping = commandHandler.client.ws.ping;
    const totalMembers = commandHandler.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = commandHandler.client.guilds.cache.size;
    const totalCommands = commandHandler.commands!.length;
    res.send({ ping, upSince, totalMembers, totalGuilds, totalCommands })
})

server.get('/commands', (req, res) => {
    res.send(commandHandler.commands?.map(cmd => {
        if (cmd.category?.includes("dev")) return;
        return {
            name: cmd.name,
            description: cmd.description,
            category: cmd.category,
        }
    }).filter((e) => e != null));
})

server.get('/commands/:command', (req, res) => {
    const name = (req.params as any).command;
    const command = commandHandler.commands!.find(cmd => cmd.name === name);
    if (!command) return res.send({ error: 'Command not found' });
    res.send(command);
})

const discordClientId = process.env.DISCORD_CLIENT_ID!;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET!;
const lastUpdateForUser: Map<string, Date> = new Map();
export const updateGuilds = async (userId: string): Promise<any> => {
    //console.log(`Updating guilds for user ${userId}`)
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
    if (!user.discord) {
        return { error: "user discord not found" };
    };

    const { discord } = user;
    const lastUpdate = lastUpdateForUser.get(user.id);
    if (lastUpdate && Date.now() - lastUpdate.getTime() < 5 * 60 * 1000) {
        return { error: "maybe later" };
    }
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
            Authorization: `Bearer ${discord.token}`,
            'Accept-Encoding': 'identity'
        },
    });
    const resGuilds = await guildsRes.data as any;
    if (guildsRes.status == 401 || guildsRes.status == 400) {
        const ref = await refreshToken(discord.refreshToken);
        if (typeof ref != "string") {
            return ref;
        }
        return await updateGuilds(userId);
    }
    if (resGuilds.error_description) {
        return { error: resGuilds.error_description };
    }
    const guilds = (resGuilds as any[]).filter(guild => (guild.permissions & 0x20) === 0x20);
    const allGuilds = await prisma.guild.findMany({
        where: {
            admins: {
                some: {
                    id: user.id
                }
            }
        }
    })
    for (const guild of guilds) {
        const g = await commandHandler.prisma.guild.upsert({
            where: {
                id: guild.id,
            },
            update: {
                name: guild.name,
                icon: guild.icon,
                admins: {
                    connect: {
                        id: user.id,
                    }
                }
            },
            create: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                admins: {
                    connect: {
                        id: user.id,
                    }
                }
            },
        })
    }
    for (const guild of allGuilds) {
        if (!guilds.find(g => g.id === guild.id)) {
            await commandHandler.prisma.guild.update({
                where: {
                    id: guild.id,
                },
                data: {
                    admins: {
                        disconnect: {
                            id: user.id
                        }
                    }
                }
            })
        }
    }
    lastUpdateForUser.set(user.id, new Date());
    // const allGuilds = commandHandler.client.guilds.cache;
    // const guildsInAdmin = [];
    // for (const [, guild] of allGuilds) {
    //     const admins: GuildMember[] = []
    //     for (const mem of guild.members.cache) {
    //         if (mem[1].user.bot) continue;
    //         if (mem[1].permissions.has('Administrator')) {
    //             admins.push(mem[1]);
    //             if (mem[1].id == userId) guildsInAdmin.push(guild)
    //         }
    //     }
    //     if (!admins.length) continue
    //     if (!guild) continue

    //     const pGuild = await commandHandler.prisma.guild.upsert({
    //         where: {
    //             id: guild.id
    //         },
    //         update: {
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connectOrCreate: admins.map(m => ({ where: { id: m.user.id }, create: { id: m.user.id, avatar: m.user.avatar, name: m.user.username } }))
    //             }
    //         },
    //         create: {
    //             id: guild.id,
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connectOrCreate: admins.map(m => ({ where: { id: m.user.id }, create: { id: m.user.id, avatar: m.user.avatar, name: m.user.username } }))
    //             }
    //         },
    //         include: {
    //             admins: {
    //                 select: {
    //                     name: true
    //                 }
    //             }
    //         }
    //     })
    //     console.log(pGuild)
    // }
    // return guildsInAdmin
}

const refreshToken = async (refreshToken: string) => {
    // console.log(`Refreshing token`)
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



server.get('/discord/guilds', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const guilds = await updateGuilds(user.id);
    if (guilds && (guilds as any).error) {
        return res.status(401).send(guilds);
    }
    return res.send({ success: true });
})


server.get('/discord/guilds/:guild', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const guild = await commandHandler.prisma.guild.findFirst(
        {
            where: { id: req.params.guild, admins: { some: { id: user.id }, } },
            include: {
                TicketSettings: true
            }
        }
    );
    if (!guild) return res.status(401).send({ error: 'Unauthorized' });
    const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
    if (!isBotInGuild) return res.status(401).send({ error: 'notInGuild' });
    const g = await commandHandler.client.guilds.cache.get(guild.id)!;
    const channels = await g.channels.cache;
    const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText);
    const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice);
    const categoryChannels = channels.filter(channel => channel.type === ChannelType.GuildCategory);
    const memberCount = g.memberCount;
    const roles = g.roles.cache.filter(role => !role.managed);
    return res.send({ ...guild, textChannels, voiceChannels, categoryChannels, roles, memberCount });
})

server.patch('/discord/guilds/:guild', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const guild = await commandHandler.prisma.guild.findFirst(
        {
            where: { id: req.params.guild, admins: { some: { id: user.id }, } },
        }
    );
    if (!guild) return res.status(401).send({ error: 'Unauthorized' });
    const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
    if (!isBotInGuild) return res.status(401).send({ error: 'notInGuild' });
    // console.log("body: " + JSON.stringify(req.body))
    const { welcomeChannel, welcomeEmbedTitle, welcomeEmbedDescription, loggingChannel, prefix, oldChannel, oldMessage, shouldUpdateTickets } = req.body;
    let mes = 'Updated';
    if (prefix) {
        await commandHandler.prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                prefix: prefix,
            }
        })
        mes += ' prefix';
    }
    if (loggingChannel != undefined) {
        const g = commandHandler.client.guilds.cache.get(guild.id)
        if (!g) return res.status(400).send({ error: 'Invalid guild' });
        const channel = g.channels.cache.get(loggingChannel);
        if (!channel) return res.status(400).send({ error: 'Invalid channel' });
        await commandHandler.prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                loggingChannel: loggingChannel,
            }
        })
        mes += ' logging channel';
    }
    if (welcomeChannel && welcomeEmbedDescription && welcomeEmbedTitle) {
        const channel = commandHandler.client.guilds.cache.get(guild.id)?.channels.cache.get(welcomeChannel);
        if (!channel) return res.status(400).send({ error: 'Invalid channel' });
        await commandHandler.prisma.welcomeSettings.upsert({
            where: {
                guildId: guild.id,
            },
            update: {
                channelId: welcomeChannel,
                embedTitle: welcomeEmbedTitle,
                embedDesc: welcomeEmbedDescription,
            },
            create: {
                channelId: welcomeChannel,
                embedTitle: welcomeEmbedTitle,
                embedDesc: welcomeEmbedDescription,
                guildId: guild.id,
            }
        })
        mes += ' welcome channel';
    }
    if (shouldUpdateTickets) {
        const ticketSettings = await commandHandler.prisma.ticketSettings.findFirst({ where: { guildId: guild.id } });
        if (!ticketSettings || !ticketSettings.embedTitle || !ticketSettings.embedDesc) return;
        mes += ' ticket embed';
        if (ticketSettings.channelId) {
            const channel = commandHandler.client.guilds.cache.get(guild.id)?.channels.cache.get(ticketSettings.channelId) as GuildTextBasedChannel;
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('Create Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary));
            const message = await channel.send({
                embeds: [{
                    title: ticketSettings.embedTitle,
                    description: ticketSettings.embedDesc,
                    color: 0x00ff00,
                }],
                components: [row]
            })
            await commandHandler.prisma.ticketSettings.update({
                where: {
                    id: ticketSettings.id
                },
                data: {
                    messageId: message.id
                }
            })
        }
    }
    if (mes.split(" ").length < 2) mes += " Nothing";
    return res.send({ success: true, message: mes });
})

server.get('/discord/callback', async (req, res) => {
    const { code, refresh_token } = req.query as any;
    if (!code && !refresh_token) return res.redirect('https://discord.com/api/oauth2/authorize?' + queryString.stringify({
        client_id: discordClientId,
        response_type: 'code',
        redirect_uri: getRedirectURL('discord'),
        scope: 'identify guilds email'
    }))
    const isRefresh = refresh_token && !code;
    const tokenResponseData = await axios.post('https://discord.com/api/oauth2/token', isRefresh ? {
        client_id: discordClientId,
        client_secret: discordClientSecret,
        refresh_token,
        grant_type: 'refresh_token',
    } : {
        client_id: discordClientId,
        client_secret: discordClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: getRedirectURL('discord'),
        scope: 'identif,+guilds,email',
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'identity'
        },
    });
    const tokenResponse = await tokenResponseData.data as any;
    if (tokenResponse.error == "invalid_grant") {
        return res.status(403).send({
            success: false,
            message: "Invalid code"
        })
    }
    const userRes = await axios.get('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`
        },
    });
    const resUser = await userRes.data as any;
    if (resUser.error_description) {
        return res.send(resUser);
    }
    // const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
    //     headers: {
    //         authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`
    //     },
    // });
    // const resGuilds = await guildsRes.data as any;
    // if (resGuilds.error_description) {
    //     return res.send(resGuilds);
    // }
    // const guilds = (resGuilds as any[]).filter(guild => (guild.permissions & 0x20) === 0x20);
    // for (const guild of guilds) {
    //     const g = await commandHandler.prisma.guild.upsert({
    //         where: {
    //             id: guild.id,
    //         },
    //         update: {
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connectOrCreate: {
    //                     where: {
    //                         id: resUser.id,
    //                     },
    //                     create: {
    //                         id: resUser.id,
    //                         name: resUser.username,
    //                         email: resUser.email,
    //                         avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
    //                         discord: {
    //                             create: {
    //                                 expiresAt: new Date(Date.now() + tokenResponse.expires_in),
    //                                 token: tokenResponse.access_token,
    //                                 refreshToken: tokenResponse.refresh_token,
    //                             }
    //                         }
    //                     }
    //                 },
    //             },
    //         },
    //         create: {
    //             id: guild.id,
    //             name: guild.name,
    //             icon: guild.icon,
    //             admins: {
    //                 connectOrCreate: {
    //                     where: {
    //                         id: resUser.id,
    //                     },
    //                     create: {
    //                         id: resUser.id,
    //                         name: resUser.username,
    //                         email: resUser.email,
    //                         avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
    //                         discord: {
    //                             create: {
    //                                 expiresAt: new Date(Date.now() + tokenResponse.expires_in),
    //                                 token: tokenResponse.access_token,
    //                                 refreshToken: tokenResponse.refresh_token,
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //     })
    // }
    const guildsRes = await updateGuilds(resUser.id)
    if (guildsRes.code == 401 || guildsRes.code == 400) {
        return res.status(401).send(guildsRes)
    }
    let user = await commandHandler.prisma.user.findUnique({ where: { id: resUser.id } });
    user = await commandHandler.prisma.user.upsert({
        where: {
            id: resUser.id,
        },
        update: {
            discord: {
                connectOrCreate: {
                    where: {
                        userId: resUser.id,
                    },
                    create: {
                        expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                        token: tokenResponse.access_token,
                        refreshToken: tokenResponse.refresh_token,
                    }
                }
            },
            email: resUser.email,
            avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
        },
        create: {
            discord: {
                connectOrCreate: {
                    where: {
                        userId: resUser.id,
                    },
                    create: {
                        expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                        token: tokenResponse.access_token,
                        refreshToken: tokenResponse.refresh_token,
                    }
                }
            },
            email: resUser.email,
            avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
            id: resUser.id,
            name: resUser.username,
        }
    })
    return res.redirect(getFrontEndURL() + '/?token=' + user.token);
})


const spotifyClientId = process.env.SPOTIFY_CLIENT_ID!;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
server.get('/spotify/callback', async (req, res) => {
    const { code } = req.query as any;
    const token = req.headers.authorization;
    const scopes = 'user-read-playback-state user-read-currently-playing'
    const state = crypto.randomUUID();
    if (!code)
        return res.redirect('https://accounts.spotify.com/authorize?' +
            queryString.stringify({
                response_type: 'code',
                client_id: spotifyClientId,
                scope: scopes,
                redirect_uri: getRedirectURL('spotify'),
                state
            }));
    if (!token) return res.redirect('/discord/callback')
    const user = await commandHandler.prisma.user.findUnique({
        where: { token }, select: {
            id: true,
            spotify: true
        }
    })
    if (!user) return res.redirect('/discord/callback')
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectURL('spotify'),
    }, {
        method: "POST",
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'))
        },
    }).then(res => res.data) as any;
    if (tokenRes.error) {
        return res.status(401).send(tokenRes);
    }
    // if (user.spotify) {
    //     await commandHandler.prisma.spotify.update({
    //         where: {
    //             userId: user.id
    //         },
    //         data: {
    //             token: tokenRes.access_token,
    //             refreshToken: tokenRes.refresh_token,
    //             expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
    //         }
    //     })
    // } else {
    //     await commandHandler.prisma.spotify.create({
    //         data: {
    //             token: tokenRes.access_token,
    //             refreshToken: tokenRes.refresh_token,
    //             expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
    //             user: {
    //                 connect: {
    //                     id: user.id
    //                 }
    //             }
    //         }
    //     })
    // }

    await commandHandler.prisma.spotify.upsert({
        where: {
            userId: user.id
        },
        update: {
            token: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
        },
        create: {
            token: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
            userId: user.id
        }
    })

    return res.send({
        success: true,
        message: "Successfully regisetred user"
    });
})

export default server;
