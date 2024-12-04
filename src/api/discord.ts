import axios from 'axios';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, type GuildTextBasedChannel } from 'discord.js';
import { Elysia, t } from 'elysia';
import queryString from 'query-string';
import commandHandler from '..';
import { getFrontEndURL, getRedirectURL } from '../util/urls';
import { discordClientId, discordClientSecret, updateGuilds } from './apiUtils';
export default (elysia: Elysia<'discord'>) => {
	elysia.get(
		'/guilds',
		async ({ headers, set }) => {
			const token = headers.authorization;
			if (!token) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const user = await commandHandler.prisma.user.findUnique({
				where: { token },
			});
			if (!user) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const guilds = await updateGuilds(user.id);
			if (guilds && (guilds as any).error) {
				set.status = 400;
				return { error: (guilds as any).error };
			}
			return { success: true };
		},
		{
			headers: t.Object({
				authorization: t.String(),
			}),
		},
	);

	elysia.get(
		'/guilds/:id',
		async ({ headers, set, params: { id } }) => {
			const token = headers.authorization;
			if (!token) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const user = await commandHandler.prisma.user.findUnique({
				where: { token },
			});
			if (!user) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			await updateGuilds(user.id);
			const guild = await commandHandler.prisma.guild.findFirst({
				where: { id: id, admins: { some: { id: user.id } } },
				include: {
					TicketSettings: true,
				},
			});
			if (!guild) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
			if (!isBotInGuild) {
				set.status = 400;
				return { error: 'notInGuild' };
			}
			const g = await commandHandler.client.guilds.cache.get(guild.id)!;
			const channels = await g.channels.cache;
			const textChannels = channels.filter((channel) => channel.type === ChannelType.GuildText);
			const voiceChannels = channels.filter((channel) => channel.type === ChannelType.GuildVoice);
			const categoryChannels = channels.filter((channel) => channel.type === ChannelType.GuildCategory);
			const memberCount = g.memberCount;
			const roles = g.roles.cache.filter((role) => !role.managed);
			return {
				...guild,
				textChannels,
				voiceChannels,
				categoryChannels,
				roles,
				memberCount,
			};
		},
		{
			headers: t.Object({
				authorization: t.String(),
			}),
		},
	);

	elysia.patch(
		'/guilds/:id',
		async ({ headers, set, params: { id }, body }) => {
			const token = headers.authorization;
			if (!token) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const user = await commandHandler.prisma.user.findUnique({
				where: { token },
			});
			if (!user) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			await updateGuilds(user.id);
			const guild = await commandHandler.prisma.guild.findFirst({
				where: { id, admins: { some: { id: user.id } } },
			});
			if (!guild) {
				set.status = 401;
				return {
					error: 'Unauthorized',
				};
			}
			const isBotInGuild = commandHandler.client.guilds.cache.has(guild.id);
			if (!isBotInGuild) {
				set.status = 400;
				return { error: 'notInGuild' };
			}
			const {
				welcomeChannel,
				welcomeEmbedTitle,
				welcomeEmbedDescription,
				loggingChannel,
				prefix,
				oldChannel,
				oldMessage,
				shouldUpdateTickets,
				shouldUpdateVerification,
			} = body as any;
			let mes = 'Updated';
			if (prefix) {
				await commandHandler.prisma.guild.update({
					where: {
						id: guild.id,
					},
					data: {
						prefix: prefix,
					},
				});
				mes += ' prefix';
			}
			if (loggingChannel != undefined) {
				const g = commandHandler.client.guilds.cache.get(guild.id);
				if (!g) {
					set.status = 400;
					return { error: 'Invalid guild' };
				} //return res.status(400).send({ error: 'Invalid guild' });
				const channel = g.channels.cache.get(loggingChannel);
				if (!channel) {
					set.status = 400;
					return { error: 'Invalid channel' };
				}
				await commandHandler.prisma.guild.update({
					where: {
						id: guild.id,
					},
					data: {
						loggingChannel: loggingChannel,
					},
				});
				mes += ' logging channel';
			}
			if (welcomeChannel && welcomeEmbedDescription && welcomeEmbedTitle) {
				const channel = commandHandler.client.guilds.cache.get(guild.id)?.channels.cache.get(welcomeChannel);
				if (!channel) {
					set.status = 400;
					return { error: 'Invalid channel' };
				}
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
					},
				});
				mes += ' welcome channel';
			}
			if (shouldUpdateTickets) {
				const ticketSettings = await commandHandler.prisma.ticketSettings.findFirst({
					where: { guildId: guild.id },
				});
				if (!ticketSettings || !ticketSettings.embedTitle || !ticketSettings.embedDesc) return;
				mes += ' ticket embed';
				if (ticketSettings.channelId) {
					const channel = commandHandler.client.guilds.cache
						.get(guild.id)
						?.channels.cache.get(ticketSettings.channelId) as GuildTextBasedChannel;
					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId('create_ticket')
							.setLabel('Create Ticket')
							.setEmoji('🎫')
							.setStyle(ButtonStyle.Primary),
					);
					const message = await channel.send({
						embeds: [
							{
								title: ticketSettings.embedTitle,
								description: ticketSettings.embedDesc,
								color: 0x00ff00,
							},
						],
						components: [row],
					});
					await commandHandler.prisma.ticketSettings.update({
						where: {
							id: ticketSettings.id,
						},
						data: {
							messageId: message.id,
						},
					});
				}
			}
			if (shouldUpdateVerification) {
				const verificationSettings = await commandHandler.prisma.verificationSettings.findFirst({
					where: { guildId: guild.id },
				});
				if (!verificationSettings) return;
				if (verificationSettings.channelId) {
					const channel = commandHandler.client.guilds.cache
						.get(guild.id)
						?.channels.cache.get(verificationSettings.channelId) as GuildTextBasedChannel;
					const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel('Verify')
							.setEmoji('✅')
							.setURL(getFrontEndURL() + '/verify/' + guild.id)
							.setStyle(ButtonStyle.Link),
					);
					const message = await channel.send({
						embeds: [
							{
								title: verificationSettings.embedTitle || '',
								description: verificationSettings.embedDesc || '',
								color: 0x00ff00,
							},
						],
						components: [row],
					});
					await commandHandler.prisma.ticketSettings.update({
						where: {
							id: verificationSettings.id,
						},
						data: {
							messageId: message.id,
						},
					});
				}
			}
			if (mes.split(' ').length < 2) mes += ' Nothing';
			return { success: true, message: mes };
		},
		{
			headers: t.Object({
				authorization: t.String(),
			}),
		},
	);

	elysia.get('/callback', async ({ query, redirect, set }) => {
		const { code, refresh_token } = query as any;
		if (!code && !refresh_token)
			return redirect(
				'https://discord.com/api/oauth2/authorize?' +
				queryString.stringify({
					client_id: discordClientId,
					response_type: 'code',
					redirect_uri: getRedirectURL('discord'),
					scope: 'identify guilds',
				}),
			);
		const isRefresh = refresh_token && !code;
		const tokenResponseData = await axios.post(
			'https://discord.com/api/oauth2/token',
			isRefresh
				? {
					client_id: discordClientId,
					client_secret: discordClientSecret,
					refresh_token,
					grant_type: 'refresh_token',
				}
				: {
					client_id: discordClientId,
					client_secret: discordClientSecret,
					code,
					grant_type: 'authorization_code',
					redirect_uri: getRedirectURL('discord'),
					scope: encodeURI('identify guilds'),
				},
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept-Encoding': 'identity',
				},
			},
		);
		const tokenResponse = (await tokenResponseData.data) as any;
		if (tokenResponse.error == 'invalid_grant') {
			set.status = 401;
			return {
				success: false,
				message: 'Invalid code',
			};
		}
		const userRes = await axios.get('https://discord.com/api/users/@me', {
			headers: {
				authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`,
			},
		});
		const resUser = (await userRes.data) as any;
		if (resUser.error_description) {
			return resUser;
		}
		const guildsRes = await updateGuilds(resUser.id);
		if (guildsRes && (guildsRes.code == 401 || guildsRes.code == 400)) {
			set.status = 401;
			return guildsRes;
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
						},
					},
				},
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
						},
					},
				},
				avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
				id: resUser.id,
				name: resUser.username,
			},
		});
		return redirect(getFrontEndURL() + '/?token=' + user.token);
	});

	elysia.get('/invite', ({ redirect }) => {
		return redirect('https://discord.com/api/oauth2/authorize?client_id=' + import.meta.env.DISCORD_CLIENT_ID!);
	});

	elysia.get('/guilds/:id/graphs', ({ params: { id } }) => {
		const guild = commandHandler.client.guilds.cache.get(id)
		if (!guild) return { error: 'notInGuild' }
		return guild.members.cache.map(a => a.joinedTimestamp).filter(a => a != null).sort((a, b) => a - b);
	})
};