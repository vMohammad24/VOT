import { UserTier } from '@prisma/client';
import axios from 'axios';
import {
	ActionRowBuilder,
	ActivityType,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	PermissionsBitField,
	User,
} from 'discord.js';
import { nanoid } from 'nanoid/non-secure';
import { redis } from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { getUserByID } from '../../util/database';
import { addEmojiByURL, getEmoji } from '../../util/emojis';
import { camelToTitleCase, isNullish } from '../../util/util';
import VOTEmbed from '../../util/VOTEmbed';
interface Decoration {
	id: string;
	name: string;
	animated: boolean;
}

interface Badge {
	name: string;
	description: string;
	url: string;
	emoji: string;
}

interface Connection {
	type: string;
	name: string;
	id: string;
	metadata: any;
	url: string | null;
	emoji?: string;
}

interface UserInfo {
	id: string;
	name: string;
	username: string;
	discriminator: string;
	decoration: Decoration;
	avatar_url: string;
	banner_url: string | null;
	flags: number;
	created_at: string;
	bot: boolean;
	bio: string;
	badges: Badge[];
	connections: Connection[];
	clan: Clan;
}

interface Clan {
	identity_guild_id: string;
	identity_enabled: boolean;
	tag: string;
	badge: string;
	emoji: string;
}

interface UserStatus {
	online: string[];
	idle: string[];
	dnd: string[];
	status: string;
	activities: Activity[];
	voice?: {
		session_id: string;
		deaf: boolean;
		mute: boolean;
		self_mute: boolean;
		self_stream: boolean;
		self_video: boolean;
		self_deaf: boolean;
		afk: boolean;
		channel: {
			id: string;
			name: string;
			type: string;
			guild: {
				id: string;
				name: string;
			};
			requested_to_speak_at: string | null;
			suppress: boolean;
		} | null;
	}[];
	last_online?: {
		status: string;
		before: string;
		timestamp: number;
		uid: string;
	};
}

interface Activity {
	name: string;
	type?: ActivityType;
	details: string | null;
	state: string | null;
	emoji: string;
	start?: string;
	flags?: number;
	session_id?: string;
	application_id?: string;
	buttons?: string[];
	assets?: {
		large_image?: string;
		large_text?: string;
		small_image?: string;
		small_text?: string;
	};
	timestamps?: {
		start: number;
		end: number;
	};
}

const notablePerms = [
	PermissionsBitField.Flags.Administrator,
	PermissionsBitField.Flags.ManageGuild,
	PermissionsBitField.Flags.ManageChannels,
	PermissionsBitField.Flags.ManageRoles,
	PermissionsBitField.Flags.ManageWebhooks,
	PermissionsBitField.Flags.ManageMessages,
	PermissionsBitField.Flags.BanMembers,
	PermissionsBitField.Flags.KickMembers,
];
const apiKey = import.meta.env.OTHER_EVADE_API_KEY;
const userPfps = new Map<string, string>();
await (async () => {
	const res = await axios.get<{
		avatars: Record<string, string>;
	}>('https://raw.githubusercontent.com/UserPFP/UserPFP/refs/heads/main/source/data.json');
	Object.entries(res.data.avatars).forEach(([key, value]) => {
		userPfps.set(key, value);
	});
})();
export default {
	name: 'userinfo',
	aliases: ['user', 'whois', 'ui'],
	description: 'Get information about a user',
	options: [
		{
			type: ApplicationCommandOptionType.User,
			name: 'user',
			description: 'User to get information about',
			required: false,
		},
	],
	type: 'all',
	shouldCache: true,
	execute: async ({ args, user: usr, member, interaction, handler, message, guild }) => {
		const user = (args.get('user') as GuildMember | User) || (guild ? member : usr) || usr;
		await interaction?.deferReply();
		const emojiTierMap: Map<UserTier, string> = new Map([
			// [UserTier.Normal, null],
			[UserTier.Premium, getEmoji('t_premium').toString()],
			[UserTier.Beta, getEmoji('t_beta').toString()],
			[UserTier.Staff, getEmoji('t_staff').toString()],
			[UserTier.Manager, getEmoji('t_staff').toString()],
		]);
		const cacheKeyUser = `user:info:${user.id}`;
		const cacheKeyStatus = `user:status:${user.id}`;

		let [pUser, res, statusRes] = await Promise.all([
			getUserByID(user.id, { tier: true, commands: true }),
			redis.get(cacheKeyUser).then(async (cached) => {
				if (cached) return { data: JSON.parse(cached) } as { data: UserInfo };
				const response = await axios.get<UserInfo>('https://us-atlanta2.evade.rest/users/' + user.id, {
					headers: {
						Authorization: apiKey,
					},
				});
				await redis.set(cacheKeyUser, JSON.stringify(response.data), 'EX', 120);
				return response;
			}),
			redis.get(cacheKeyStatus).then(async (cached) => {
				if (cached) return { data: JSON.parse(cached) } as { data: UserStatus };
				const response = await axios.get<UserStatus>(`https://us-atlanta2.evade.rest/users/${user.id}/status`, {
					headers: {
						Authorization: apiKey,
					},
				});
				await redis.set(cacheKeyStatus, JSON.stringify(response.data), 'EX', 30);
				return response;
			}),
		]);
		const { data: sData } = statusRes;
		const { data } = res;
		const { bio, connections, badges, clan } = data;
		const ems = await handler.client.application?.emojis.fetch();
		if (badges && badges.length > 0) {
			await Promise.all(
				badges.map(async (badge) => {
					badge.emoji = (await addEmojiByURL(badge.name, badge.url, ems))?.toString()!;
				}),
			);
		}
		const buttonId = nanoid();
		const connectionsButtonId = nanoid();
		const bannerButtonId = nanoid();
		const userPfpId = nanoid();
		const u = user instanceof GuildMember ? user.user : user;
		if (!u) return { content: 'User not found', ephemeral: true };
		if (clan && clan.identity_guild_id && clan.tag && clan.badge) {
			clan.emoji = (await addEmojiByURL(`${clan.identity_guild_id}_${clan.tag.trim().replace('樂', '')}`, `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png?size=128`, ems))?.toString()!;
		}
		if (badges && sData.activities.length > 0) {
			sData.activities = sData.activities.filter((a) => a.type !== ActivityType.Custom);
			await Promise.all(
				sData.activities.map(async (activity) => {
					if (
						!activity.type &&
						activity.assets &&
						activity.assets.large_image &&
						activity.assets.large_image.startsWith('spotify')
					)
						activity.type = ActivityType.Listening;
					if (!activity.type) activity.type = ActivityType.Playing;
					// const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `activity_${activity.type}.svg`);
					if (activity.type === ActivityType.Custom && activity.emoji && (activity.emoji as any).id) {
						const e = activity.emoji as any;
						const emoji = await addEmojiByURL(`${e.name}_${e.id}`, `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=128`, ems);
						sData.status = emoji?.toString() + ' ' + sData.status;
					}
					activity.emoji = getEmoji(`activity_${activity.type}`)?.toString() || '❓';
				}),
			);
		}
		if (badges && sData.voice && sData.voice.length > 0) {
			// create a new activity from voice data
			const voice = sData.voice[0];
			if (!voice.channel) return;
			sData.activities.push({
				name: 'Voice',
				type: ActivityType.Listening,
				details: voice.channel.name,
				state:
					(voice.channel.guild.name || 'Unknown') +
					(voice.afk ? ' (AFK)' : '') +
					(voice.self_deaf ? ' (Deafened)' : '') +
					(voice.self_mute ? ' (Muted)' : ''),
				emoji: getEmoji('volume').toString(),
			});
		}
		if (!u.tag) {
			return {
				ephemeral: true,
				content: 'User not found',
			};
		}

		if (badges && sData.dnd.length > 0) {
			badges.unshift({
				name: 'Do Not Disturb',
				description: 'User is in Do Not Disturb mode',
				url: 'https://discord.com',
				emoji: getEmoji('dnd_' + sData.dnd[0]).toString(),
			});
		}
		if (badges && sData.online.length > 0) {
			badges.unshift({
				name: 'Online',
				description: 'User is online',
				url: 'https://discord.com',
				emoji: getEmoji('online_' + sData.online[0]).toString(),
			});
		}
		if (badges && sData.idle.length > 0) {
			badges.unshift({
				name: 'Idle',
				description: 'User is idle',
				url: 'https://discord.com',
				emoji: getEmoji('idle_' + sData.idle[0]).toString(),
			});
		}
		const roles =
			user instanceof GuildMember
				? user.roles.cache
					.filter((role) => !role.managed && role.id != user.guild.roles.everyone.id)
					.map((role) => role.toString())
					.join(' ')
				: undefined;
		const embed = new VOTEmbed()
			.setThumbnail(u.displayAvatarURL())
			.setAuthor({ name: `${u.tag}`, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${u.id}` });

		let description = '';

		if (badges && badges.length > 0) {
			description += `### ${badges.map((badge) => badge.emoji).join(' ')}\n`;
		}

		if (bio) {
			description += `${bio}\n`;
		}

		if (pUser && pUser.tier != UserTier.Normal) {
			description += `**Tier**: ${emojiTierMap.get(pUser.tier)} VOT ${pUser.tier}\n`;
		}

		if (pUser && pUser.commands) {
			description += `**Commands ran**: ${pUser.commands.length}\n`;
		}

		if (pUser && pUser.commands && pUser.commands.length > 0) {
			// check commandId inside of every command for most used
			const commands = pUser.commands;
			const commandMap = new Map<string, number>();
			commands.forEach((c: any) => {
				if (commandMap.has(c.commandId)) {
					commandMap.set(c.commandId, commandMap.get(c.commandId)! + 1);
				} else {
					commandMap.set(c.commandId, 1);
				}
			});
			const sortedCommands = Array.from(commandMap).sort((a, b) => b[1] - a[1]);
			const mostUsedCommand = sortedCommands[0];
			description += `**Most used command**: ${mostUsedCommand[0]} (${mostUsedCommand[1]} times)\n`;
		}
		if (clan) {
			try {
				await handler.prisma.clan.upsert({
					where: {
						guild: clan.identity_guild_id,
					},
					create: {
						guild: clan.identity_guild_id,
						tag: clan.tag,
						icon: clan.badge,
						users: pUser ? {
							connect: {
								id: user.id,
							}
						} : undefined,
					},
					update: {
						tag: clan.tag,
						icon: clan.badge,
						users: pUser ? {
							connect: {
								id: user.id,
							}
						} : undefined,
					},
				});
			} catch (e) { }
		}

		if (clan && clan.emoji && clan.tag && clan.identity_guild_id) {
			description += `**Clan**: ${clan.emoji} ${clan.tag}\n`;
		}

		if (sData && sData.last_online && sData.last_online.status == 'offline') {
			description += `**Last Online**: <t:${sData.last_online.timestamp}:R>\n`;
		}

		if (sData.status) {
			description += `**Status**: ${sData.status}\n`;
		}

		if (sData.activities && sData.activities.length > 0) {
			description += `### **Activities**:\n${sData.activities.filter((a) => a.type !== ActivityType.Custom)
				.map(
					(activity) =>
						`${activity.emoji ?? ''} **${activity.name}** ${activity.details ? `\`${activity.details}\`` : ''} ${activity.state ? `- \`${activity.state}\`` : ''}`,
				)
				.join('\n')}\n`;
		}

		const fields = [];

		if (user instanceof GuildMember) {
			if (roles) {
				fields.push({
					name: 'Roles',
					value: roles,
				});
			}

			if (user.nickname) {
				description += `**Nickname**: ${user.nickname}\n`;
			}

			if (user.premiumSinceTimestamp) {
				fields.push({
					name: 'Boosting',
					value: `<t:${Math.round(user.premiumSinceTimestamp / 1000)}>`,
				});
			}

			if (user.joinedTimestamp) {
				fields.push({
					name: 'Joined',
					value: `<t:${Math.round(user.joinedTimestamp / 1000)}>`,
				});
			}

			const n = user.permissions
				.toArray()
				.filter((p) => notablePerms.includes(PermissionsBitField.Flags[p as keyof typeof PermissionsBitField.Flags]))
				.map((p) => camelToTitleCase(p.toString()));

			if (n && n.length > 0) {
				fields.push({
					name: 'Notable Permissions',
					value: n.reverse().join(', '),
				});
			}
		}
		const finalDesc = description
			.split('\n')
			.filter((l) => l.trim() != '')
			.join('\n');
		embed.setDescription(isNullish(finalDesc) ? null : finalDesc);
		embed
			.setFields(fields.map((field) => ({ ...field, value: field.value || 'Unknown' })))
			.setTimestamp(u.createdTimestamp)
			.setFooter({ text: 'Created at' });
		const avatar = u.displayAvatarURL();
		let embedColor: ColorResolvable = 'Random';
		// if (avatar) {
		// 	// const listening = sData.activities.find(a => a.type === ActivityType.Listening);
		// 	// const image = listening?.assets?.large_image;
		// 	// const url = `https://i.scdn.co/image/${image.split(':')[1]}`;
		// 	const imagew = await loadImg(avatar);
		// 	const dColor = getTwoMostUsedColors(imagew);
		// 	embedColor = dColor[0];
		// 	embed.setColor(dColor[0]);
		// }
		await embed.dominant();
		const userPfp = userPfps.get(user.id);
		const content = {
			embeds: [embed],
			content: `<@${u.id}>`,
			allowedMentions: { repliedUser: true },
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setLabel('View reviews').setStyle(ButtonStyle.Primary).setCustomId(buttonId),
					new ButtonBuilder()
						.setLabel('View connections')
						.setStyle(ButtonStyle.Secondary)
						.setCustomId(connectionsButtonId),
					new ButtonBuilder()
						.setLabel('View banner')
						.setStyle(ButtonStyle.Secondary)
						.setCustomId(bannerButtonId),
				),
			],
		};
		if (userPfp) {
			content.components[0].addComponents(
				new ButtonBuilder()
					.setLabel('View UserPFP')
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(userPfpId)
			)
		}
		const sentMessage = message ? await message.reply(content) : await interaction!.editReply(content);

		const collector = sentMessage?.createMessageComponentCollector({
			filter: (i) => i.customId === buttonId || i.customId === connectionsButtonId || i.customId === bannerButtonId || i.customId === userPfpId,
		});
		collector?.on('collect', async (i) => {
			if (i.customId === buttonId) {
				const cacheKeyReviews = `userreviews:${user.id}`;
				const cachedReviews = await redis.get(cacheKeyReviews);
				let reviews: any[] = [];

				if (cachedReviews) {
					reviews = JSON.parse(cachedReviews);
				} else {
					const reviewsRes = await axios.get(`https://manti.vendicated.dev/api/reviewdb/users/${user.id}/reviews`);
					reviews = reviewsRes.data.reviews;
					await redis.set(cacheKeyReviews, JSON.stringify(reviews), 'EX', 180); // Cache for 3 minutes
				}

				const embed = new EmbedBuilder()
					.setTitle('Reviews')
					.setAuthor({ name: u.tag, iconURL: avatar, url: `https://discord.com/users/${user.id}` })
					.setColor(embedColor)
					.setTimestamp();

				if (reviews.length > 0) {
					reviews.shift();
					if (reviews.length <= 0) return i.reply({ content: 'No reviews found', ephemeral: true });
					embed.setDescription(
						reviews.map((review) => `- **${review.sender.username}** - ${review.comment}`).join('\n'),
					);
				} else {
					embed.setDescription('No reviews found');
				}

				i.reply({
					embeds: [embed],
					ephemeral: true,
					allowedMentions: { repliedUser: true },
				});
			} else if (i.customId === connectionsButtonId) {
				const embed = new EmbedBuilder()
					.setTitle('Connections')
					.setAuthor({ name: u.tag, iconURL: avatar, url: `https://discord.com/users/${user.id}` })
					.setColor(embedColor)
					.setTimestamp();
				if (connections && connections.length > 0) {
					embed.setDescription(
						connections
							.map((connection) => {
								connection.emoji =
									(getEmoji(connection.type.replace('unknown_', '').replace('-', '_')) || '❓').toString() || '❓';
								if (!connection.url && connection.type.includes('domain'))
									connection.url = `https://${connection.name}`;
								if (connection.url) connection.url = encodeURI(connection.url);
								return `${connection.emoji} **${connection.url ? `[${connection.name}](${connection.url})` : connection.name}**`;
							})
							.join('\n\n'),
					);
				} else {
					embed.setDescription('No connections found');
				}
				i.reply({
					embeds: [embed],
					ephemeral: true,
					allowedMentions: { repliedUser: true },
				});
			} else if (i.customId === bannerButtonId) {
				const embed = await new VOTEmbed()
					.setAuthor({ name: u.tag, iconURL: avatar, url: `https://discord.com/users/${user.id}` })
					.setColor(embedColor)
					.setTimestamp();
				if (data.banner_url) {
					embed.setImage(data.banner_url);
				} else {
					embed.setDescription('No banner found');
					const url = `https://usrbg.is-hardly.online/usrbg/v2/${user.id}`
					const res = await axios.get(url);
					if (res.status != 404) {
						embed.setImage(url);
						embed.setDescription('Note: This banner is from USRBG')
					}
				}
				await embed.dominant();
				i.reply({
					embeds: [embed],
					ephemeral: true,
					allowedMentions: { repliedUser: true },
				});
			} else if (i.customId == userPfpId) {
				const embed = new EmbedBuilder()
					.setTitle('UserPFP')
					.setAuthor({ name: u.tag, iconURL: avatar, url: `https://discord.com/users/${user.id}` })
					.setColor(embedColor)
					.setTimestamp();
				if (userPfp) {
					embed.setImage(userPfp);
				} else {
					embed.setDescription('No UserPFP found');
				}
				i.reply({
					embeds: [embed],
					ephemeral: true,
					allowedMentions: { repliedUser: true },
				});
			}
		});
	},
} as ICommand;
