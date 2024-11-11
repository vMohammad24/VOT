import axios from 'axios';
import { inspect } from 'bun';
import { PermissionFlagsBits, type APIGuild, type APIUser } from 'discord.js';
import commandHandler from '..';
import { getUserByID } from '../util/database';

export const discordClientId = import.meta.env.DISCORD_CLIENT_ID!;
export const discordClientSecret = import.meta.env.DISCORD_CLIENT_SECRET!;
export const spotifyClientId = import.meta.env.SPOTIFY_CLIENT_ID!;
export const spotifyClientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET!;

const lastUpdateForUser = new Map<string, Date>();
export const updateGuilds = async (userId: string): Promise<any> => {
	const { prisma } = commandHandler;
	if (!prisma) {
		return { error: 'Prisma not found (somehow)' };
	}
	if (!userId) {
		return { error: 'Invalid user id' };
	}
	const user = (await getUserByID(userId, { discord: true, id: true })) as any;
	if (!user) {
		return { error: 'Invalid user' };
	}
	if (!user.discord) {
		return { error: 'user discord not found' };
	}

	const { discord } = user;
	try {
		const lastUpdate = lastUpdateForUser.get(user.id);
		if (lastUpdate && Date.now() - lastUpdate.getTime() < 60 * 1000) {
			return { error: 'maybe later' };
		}
		commandHandler.logger.info(`Updating guilds for ${userId}`);
		const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds?with_counts=true', {
			headers: {
				Authorization: `Bearer ${discord.token}`,
				'Accept-Encoding': 'identity',
			},
		});
		const resGuilds = (await guildsRes.data) as APIGuild[];
		if (guildsRes.status == 401 || guildsRes.status == 400) {
			const ref = await refreshToken(discord.refreshToken);
			if (typeof ref !== 'string') {
				return ref;
			}
			return await updateGuilds(userId);
		}
		const why = resGuilds as any;
		if (why.error_description) {
			return { error: why.error_description, message: 'NOTE: from discord' };
		}
		const guilds = resGuilds.filter((g: APIGuild) => {
			const isOwner = g.owner;
			if (isOwner) return true;
			if (!g.permissions) return false;
			const perms = BigInt(g.permissions!);
			return perms & PermissionFlagsBits.Administrator;
		});
		const allGuilds = await prisma.guild.findMany({
			where: {
				admins: {
					some: {
						id: user.id,
					},
				},
			},
		});
		for (const guild of guilds) {
			const g = await commandHandler.prisma.guild.upsert({
				where: {
					id: guild.id,
				},
				update: {
					name: guild.name,
					icon: guild.icon,
					memberCount: guild.approximate_member_count,
					onlineCount: guild.approximate_presence_count,
					banner: guild.banner,
					admins: {
						connect: {
							id: user.id,
						},
					},
				},
				create: {
					id: guild.id,
					name: guild.name,
					icon: guild.icon,
					banner: guild.banner,
					memberCount: guild.approximate_member_count,
					onlineCount: guild.approximate_presence_count,
					admins: {
						connect: {
							id: user.id,
						},
					},
				},
			});
		}
		for (const guild of allGuilds) {
			if (!guilds.find((g) => g.id === guild.id)) {
				await commandHandler.prisma.guild.update({
					where: {
						id: guild.id,
					},
					data: {
						admins: {
							disconnect: {
								id: user.id,
							},
						},
					},
				});
			}
		}
		lastUpdateForUser.set(user.id, new Date());
	} catch (e) {
		console.error(`Error updating guilds for ${userId}`, e);
		return { error: 'Error updating guilds' };
	}
	// const allGuilds = commandHandler.client.guilds.cache;
	// const guildsInAdmin = [];
	// for (const [, guild] of allGuilds) {
	//     const admins: GuildMember[] = []
	//     for (const [, mem] of guild.members.cache) {
	//         if (mem.user.bot) continue;
	//         if (mem.permissions.has('Administrator')) {
	//             admins.push(mem);
	//         }
	//     }
	//     if (!guild) continue
	//     const g = await commandHandler.prisma.guild.upsert({
	//         where: {
	//             id: guild.id
	//         },
	//         update: {
	//             name: guild.name,
	//             icon: guild.icon,
	//             admins: {
	//                 set: admins.map(m => {
	//                     return {
	//                         id: m.id
	//                     }
	//                 })
	//             }
	//         },
	//         create: {
	//             id: guild.id,
	//             name: guild.name,
	//             icon: guild.icon,
	//             admins: {
	//                 connectOrCreate: admins.map(m => {
	//                     return {
	//                         where: {
	//                             id: m.id
	//                         },
	//                         create: {
	//                             id: m.id,
	//                             name: m.user.username,
	//                             avatar: m.user.avatar
	//                         }
	//                     }
	//                 })
	//             }
	//         },
	//         include: {
	//             admins: {
	//                 select: {
	//                     id: true
	//                 }
	//             }
	//         }
	//     })
	//     if (g.admins.includes({ id: userId })) {
	//         guildsInAdmin.push(g)
	//     }
	// }
	// return guildsInAdmin
};
export const refreshToken = async (refreshToken: string) => {
	const tokenResponseData = await axios.post(
		'https://discord.com/api/oauth2/token',
		{
			client_id: discordClientId,
			client_secret: discordClientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		},
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept-Encoding': 'identity',
			},
		},
	);
	commandHandler.logger.info(`
		refreshToken: ${refreshToken}
		tokenResponseData: ${inspect(tokenResponseData.data)}
		tokenResponseDataStatus: ${tokenResponseData.statusText} (${tokenResponseData.status})
		`);
	const tokenResponse = (await tokenResponseData.data) as any;
	if (tokenResponse.error === 'invalid_grant') {
		return {
			error: 'Invalid refresh token, please reauthorize (2)',
			code: 401,
		};
	}
	if (tokenResponseData.status != 200 || !tokenResponseData.data) {
		return {
			error: 'Invalid refresh token, please reauthorize',
			code: 401,
		};
	}
	const userRes = await axios.get('https://discord.com/api/users/@me', {
		headers: {
			authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`,
		},
	});
	const resUser = (await userRes.data) as APIUser;
	const errorHandling = resUser as any;
	if (errorHandling.error_description) {
		return {
			error: errorHandling.error_description + ' (D)',
			code: 401,
		};
	}
	if (resUser.id) {
		const userP = await getUserByID(resUser.id);
		await commandHandler.prisma.user.update({
			where: {
				id: userP.id,
			},
			data: {
				discord: {
					update: {
						expiresAt: new Date(Date.now() + tokenResponse.expires_in),
						token: tokenResponse.access_token,
						refreshToken: tokenResponse.refresh_token,
					},
				},
				avatar: `https://cdn.discordapp.com/avatars/${resUser.id}/${resUser.avatar}.png`,
			},
		});
	}
	return tokenResponse.access_token as string;
};
