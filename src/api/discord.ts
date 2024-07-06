import axios from "axios";
import { ChannelType, type GuildTextBasedChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import queryString from "query-string";
import commandHandler from "..";
import { getRedirectURL, getFrontEndURL } from "../util/urls";
import { discordClientId, discordClientSecret, updateGuilds } from "./apiUtils";
import type { Express } from 'express';
export default (server: Express) => {
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
        await updateGuilds(user.id);
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
        await updateGuilds(user.id);
        const guild = await commandHandler.prisma.guild.findFirst(
            {
                where: { id: req.params.guild, admins: { some: { id: user.id }, } },
            }
        );
        if (!guild) return res.status(401).send({ error: 'Unauthorized' });
        const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
        if (!isBotInGuild) return res.status(401).send({ error: 'notInGuild' });
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
        const guildsRes = await updateGuilds(resUser.id)
        if (guildsRes && (guildsRes.code == 401 || guildsRes.code == 400)) {
            return res.status(401).send(guildsRes)
        }
        const user = await commandHandler.prisma.user.upsert({
            where: {
                id: resUser.id,
            },
            update: {
                discord: {
                    upsert: {
                        create: {
                            expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                            token: tokenResponse.access_token,
                            refreshToken: tokenResponse.refresh_token,
                        },
                        update: {
                            expiresAt: new Date(Date.now() + tokenResponse.expires_in),
                            token: tokenResponse.access_token,
                            refreshToken: tokenResponse.refresh_token,
                        },
                        where: {
                            userId: resUser.id,
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


    server.get("/discord/invite", (req, res) => {
        return res.redirect("https://discord.com/api/oauth2/authorize?client_id=" + import.meta.env.DISCORD_CLIENT_ID!)
    })
}