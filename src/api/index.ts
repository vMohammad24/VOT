import Fastify from 'fastify'
import commandHandler from '..';
import { getRedirectURL } from '../util/urls';
import queryString from 'query-string';
import cors from '@fastify/cors'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, type GuildTextBasedChannel } from 'discord.js';
import type { PrismaClient } from '@prisma/client';
import axios from 'axios';
const fastify = Fastify({
    logger: true
})


await fastify.register(cors)

// Declare a route
fastify.get('/', function (req, res) {
    const ping = commandHandler.client.ws.ping;
    const totalMembers = commandHandler.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = commandHandler.client.guilds.cache.size;
    const totalCommands = commandHandler.commands!.length;
    const uptime = commandHandler.client.uptime;
    res.send({ ping, uptime, totalMembers, totalGuilds, totalCommands })
})

fastify.get('/commands', (req, res) => {
    res.send(commandHandler.commands?.map(cmd => {
        if (cmd.category?.includes("dev")) return;
        return {
            name: cmd.name,
            description: cmd.description,
            category: cmd.category,
        }
    }));
})

fastify.get('/commands/:command', (req, res) => {
    const name = (req.params as any).command;
    const command = commandHandler.commands!.find(cmd => cmd.name === name);
    if (!command) return res.send({ error: 'Command not found' });
    res.send(command);
})

const discordClientId = process.env.DISCORD_CLIENT_ID!;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET!;

export const updateGuilds = async (userId: string, prisma: PrismaClient) => {
    if (!userId || !prisma) {
        return;
    };
    const user = await prisma.user.findFirst({ where: { id: userId }, include: { discord: true } });
    if (!user) {
        return;
    }
    if (!user.discord) {
        return
    };

    const { discord } = user;
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
            Authorization: `Bearer ${discord.token}`,
            'Accept-Encoding': 'identity'
        },
    });
    const resGuilds = await guildsRes.data as any;
    if (guildsRes.status == 401) {
        const ref = await refreshToken(discord.refreshToken);
        if (ref && (ref as any).error) {
            return ref;
        }
        await updateGuilds(userId, commandHandler.prisma);
        return;
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
}

const refreshToken = async (refreshToken: string) => {
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
        return;
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
                }
            }
        })
    }
    return tokenResponse.access_token as string;
}



fastify.get('/discord/guilds', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.code(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.code(401).send({ error: 'Unauthorized' });
    const guilds = await updateGuilds(user.id, commandHandler.prisma);
    if ((guilds as any).error) {
        return res.code(401).send(guilds);
    }
    return res.send({ success: true });
})


fastify.get('/discord/guilds/:guild', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.code(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.code(401).send({ error: 'Unauthorized' });
    const guild = await commandHandler.prisma.guild.findFirst(
        {
            where: { id: (req.params as any).guild, admins: { some: { id: user.id }, } },
            include: {
                TicketSettings: true
            }
        }
    );
    if (!guild) return res.code(401).send({ error: 'Unauthorized' });
    const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
    if (!isBotInGuild) return res.code(401).send({ error: 'notInGuild' });
    const g = await commandHandler.client.guilds.cache.get(guild.id)!;
    const channels = await g.channels.cache;
    const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText);
    const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice);
    const categoryChannels = channels.filter(channel => channel.type === ChannelType.GuildCategory);
    const memberCount = g.memberCount;
    const roles = g.roles.cache.filter(role => !role.managed);
    return res.send({ ...guild, textChannels, voiceChannels, categoryChannels, roles, memberCount });
})

fastify.patch('/discord/guilds/:guild', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.code(401).send({ error: 'Unauthorized' });
    const user = await commandHandler.prisma.user.findUnique({ where: { token } });
    if (!user) return res.code(401).send({ error: 'Unauthorized' });
    const guild = await commandHandler.prisma.guild.findFirst(
        {
            where: { id: (req.params as any).guild, admins: { some: { id: user.id }, } },
        }
    );
    if (!guild) return res.code(401).send({ error: 'Unauthorized' });
    const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
    if (!isBotInGuild) return res.code(401).send({ error: 'notInGuild' });
    const { welcomeChannel, welcomeEmbedTitle, welcomeEmbedDescription, loggingChannel, prefix, ticketEmbedTitle, ticketEmbedDesc, ticketChannelId, ticketRoleId, ticketCategoryId } = JSON.parse(req.body as any);
    let mes = 'nothing to update';
    if (prefix) {
        await commandHandler.prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                prefix: prefix,
            }
        })
        mes = 'Updated prefix';
    }
    if (loggingChannel != undefined) {
        const g = commandHandler.client.guilds.cache.get(guild.id)
        if (!g) return res.code(400).send({ error: 'Invalid guild' });
        const channel = g.channels.cache.get(loggingChannel);
        if (!channel) return res.code(400).send({ error: 'Invalid channel' });
        await commandHandler.prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                loggingChannel: loggingChannel,
            }
        })
        mes = 'Updated logging channel';
    }
    if (welcomeChannel && welcomeEmbedDescription && welcomeEmbedTitle) {
        const channel = commandHandler.client.guilds.cache.get(guild.id)?.channels.cache.get(welcomeChannel);
        if (!channel) return res.code(400).send({ error: 'Invalid channel' });
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
        mes = 'Updated welcome channel';
    }
    if (ticketEmbedTitle && ticketEmbedDesc) {
        const recentChannelId = (await commandHandler.prisma.ticketSettings.findUnique({ where: { guildId: guild.id } }))?.channelId;
        const ticketSettings = await commandHandler.prisma.ticketSettings.upsert({
            where: {
                guildId: guild.id,
            },
            update: {
                embedTitle: ticketEmbedTitle,
                embedDesc: ticketEmbedDesc,
                channelId: ticketChannelId,
                roleId: ticketRoleId,
                categoryId: ticketCategoryId,
            },
            create: {
                embedTitle: ticketEmbedTitle,
                embedDesc: ticketEmbedDesc,
                channelId: ticketChannelId,
                guild: {
                    connect: {
                        id: guild.id
                    }
                },
                roleId: ticketRoleId,
                categoryId: ticketCategoryId,
            }
        })
        mes = 'Updated ticket embed';
        if (ticketSettings.channelId) {
            const channel = commandHandler.client.guilds.cache.get(guild.id)?.channels.cache.get(ticketSettings.channelId) as GuildTextBasedChannel;
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('Create Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary));
            if (ticketSettings.messageId) {
                if (!channel) return res.code(400).send({ error: 'Invalid channel' });
                const message = (recentChannelId === ticketSettings.channelId ? await channel.messages.fetch(ticketSettings.messageId) : null);
                if (message) {
                    await message.edit({
                        embeds: [{
                            title: ticketEmbedTitle,
                            description: ticketEmbedDesc,
                            color: 0x00ff00,
                        }],
                        components: [row]
                    })
                } else {
                    const message = await channel.send({
                        embeds: [{
                            title: ticketEmbedTitle,
                            description: ticketEmbedDesc,
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
            } else {
                const message = await channel.send({
                    embeds: [{
                        title: ticketEmbedTitle,
                        description: ticketEmbedDesc,
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
    }
    return res.send({ success: true, message: mes });
})

fastify.get('/discord/callback', async (req, res) => {
    const { code, refresh_token } = req.query as any;
    if (!code && !refresh_token) return res.redirect('https://discord.com/api/oauth2/authorize?' + queryString.stringify({
        client_id: discordClientId,
        response_type: 'code',
        redirect_uri: getRedirectURL('discord', commandHandler.prodMode),
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
        redirect_uri: getRedirectURL('discord', commandHandler.prodMode),
        scope: 'identif,+guilds,email',
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'identity'
        },
    });
    const tokenResponse = await tokenResponseData.data as any;
    if (tokenResponse.error === "invalid_grant") {
        return res.code(403).send({
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
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
            authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`
        },
    });
    const resGuilds = await guildsRes.data as any;
    if (resGuilds.error_description) {
        return res.send(resGuilds);
    }
    const guilds = (resGuilds as any[]).filter(guild => (guild.permissions & 0x20) === 0x20);
    for (const guild of guilds) {
        const g = await commandHandler.prisma.guild.upsert({
            where: {
                id: guild.id,
            },
            update: {
                name: guild.name,
                icon: guild.icon,
                admins: {
                    connectOrCreate: {
                        where: {
                            id: resUser.id,
                        },
                        create: {
                            id: resUser.id,
                            name: resUser.username,
                            email: resUser.email,
                            avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
                            discord: {
                                create: {
                                    expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                                    token: tokenResponse.access_token,
                                    refreshToken: tokenResponse.refresh_token,
                                }
                            }
                        }
                    }
                }
            },
            create: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                admins: {
                    connectOrCreate: {
                        where: {
                            id: resUser.id,
                        },
                        create: {
                            id: resUser.id,
                            name: resUser.username,
                            email: resUser.email,
                            avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
                            discord: {
                                create: {
                                    expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                                    token: tokenResponse.access_token,
                                    refreshToken: tokenResponse.refresh_token,
                                }
                            }
                        }
                    }
                }
            },
        })
    }
    let user = await commandHandler.prisma.user.findUnique({ where: { id: resUser.id } });
    user = await commandHandler.prisma.user.update({
        where: {
            id: resUser.id,
        },
        data: {
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
        }
    })
    return res.redirect('http://localhost:3000/?token=' + user.token);
})


const spotifyClientId = process.env.SPOTIFY_CLIENT_ID!;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
fastify.get('/spotify/callback', async (req, res) => {
    const { code } = req.query as any;
    const token = req.headers.authorization;
    const scopes = 'user-read-playback-state user-read-currently-playing user-modify-playback-state'
    const state = crypto.randomUUID();
    if (!code)
        return res.redirect('https://accounts.spotify.com/authorize?' +
            queryString.stringify({
                response_type: 'code',
                client_id: spotifyClientId,
                scope: scopes,
                redirect_uri: getRedirectURL('spotify', commandHandler.prodMode),
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
        redirect_uri: getRedirectURL('spotify', commandHandler.prodMode),
    }, {
        method: "POST",
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'))
        },
    }).then(res => res.data) as any;
    if (tokenRes.error) {
        return res.code(401).send(tokenRes);
    }
    if (user.spotify) {
        await commandHandler.prisma.spotify.update({
            where: {
                userId: user.id
            },
            data: {
                token: tokenRes.access_token,
                refreshToken: tokenRes.refresh_token,
                expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
            }
        })
    } else {
        await commandHandler.prisma.spotify.create({
            data: {
                token: tokenRes.access_token,
                refreshToken: tokenRes.refresh_token,
                expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
                user: {
                    connect: {
                        id: user.id
                    }
                }
            }
        })
    }

    return res.send({
        success: true,
        message: "Successfully regisetred user"
    });
})

export default fastify;