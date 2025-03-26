import { UserTier } from '@prisma/client';
import axios from 'axios';
import {
	ActionRowBuilder,
	ActivityType,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	GuildMember,
	PermissionsBitField,
	User,
} from 'discord.js';
import { nanoid } from 'nanoid/non-secure';
import { redis } from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { getUserByID } from '../../util/database';
import { getEmoji } from '../../util/emojis';
import { camelToTitleCase, isNullish } from '../../util/util';
import VOTEmbed from '../../util/VOTEmbed';

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

		const emojiTierMap: Map<UserTier, string> = new Map([
			// [UserTier.Normal, null],
			[UserTier.Premium, getEmoji('t_premium').toString()],
			[UserTier.Beta, getEmoji('t_beta').toString()],
			[UserTier.Staff, getEmoji('t_staff').toString()],
			[UserTier.Manager, getEmoji('t_staff').toString()],
		]);

		// Fetch user data from database
		const pUser = await getUserByID(user.id, { tier: true, commands: true, uid: true });

		const buttonId = nanoid();
		const userPfpId = nanoid();
		const u = user instanceof GuildMember ? user.user : user;
		if (!u) return { content: 'User not found', ephemeral: true };

		if (!u.tag) {
			return {
				ephemeral: true,
				content: 'User not found',
			};
		}

		const roles =
			user instanceof GuildMember
				? user.roles.cache
					.filter((role) => !role.managed && role.id != user.guild.roles.everyone.id)
					.map((role) => role.toString())
					.join(' ')
				: undefined;
		const embed = new VOTEmbed()
			.setThumbnail(u.displayAvatarURL({ size: 1024 }))
			.setAuthor({ name: `${u.tag}`, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${u.id}` });

		let description = '';

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

		// For guild members, add nickname
		if (user instanceof GuildMember && user.nickname) {
			description += `**Nickname**: ${user.nickname}\n`;
		}

		// Get user presence information if available
		if (user instanceof GuildMember && user.presence) {
			const presence = user.presence;

			if (presence.status) {
				description += `**Status**: ${presence.status}\n`;
			}

			if (presence.activities && presence.activities.length > 0) {
				const activities = presence.activities.filter(a => a.type !== ActivityType.Custom);
				if (activities.length > 0) {
					description += `### **Activities**:\n${activities.map(activity => {
						const emoji = getEmoji(`activity_${activity.type}`)?.toString() || '❓';
						return `${emoji} **${activity.name}** ${activity.details ? `\`${activity.details}\`` : ''} ${activity.state ? `- \`${activity.state}\`` : ''}`;
					}).join('\n')}\n`;
				}
			}
		}

		const fields = [];

		if (user instanceof GuildMember) {
			if (roles) {
				fields.push({
					name: 'Roles',
					value: roles,
				});
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
				.sort((a, b) => {
					const aIndex = notablePerms.indexOf(PermissionsBitField.Flags[a as keyof typeof PermissionsBitField.Flags]);
					const bIndex = notablePerms.indexOf(PermissionsBitField.Flags[b as keyof typeof PermissionsBitField.Flags]);
					return aIndex - bIndex;
				})
				.map((p) => camelToTitleCase(p.toString()));

			if (n && n.length > 0) {
				fields.push({
					name: 'Notable Permissions',
					value: n.join(', '),
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
			.setFooter({ text: `UID: ${pUser.uid} • Created` });

		const avatar = u.displayAvatarURL();
		await embed.dominant();

		const userPfp = userPfps.get(user.id);
		const components = [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setLabel('View reviews').setStyle(ButtonStyle.Primary).setCustomId(buttonId),
			),
		];

		if (userPfp) {
			components[0].addComponents(
				new ButtonBuilder()
					.setLabel('View UserPFP')
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(userPfpId)
			);
		}

		const content = {
			embeds: [embed],
			content: `<@${u.id}>`,
			allowedMentions: { repliedUser: true },
			components,
		};

		const sentMessage = message ? await message.reply(content) : await interaction!.editReply(content);

		const collector = sentMessage?.createMessageComponentCollector({
			filter: (i) => i.customId === buttonId || i.customId === userPfpId,
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
					.setColor('Random')
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
			} else if (i.customId === userPfpId) {
				const embed = new EmbedBuilder()
					.setTitle('UserPFP')
					.setAuthor({ name: u.tag, iconURL: avatar, url: `https://discord.com/users/${user.id}` })
					.setColor('Random')
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
