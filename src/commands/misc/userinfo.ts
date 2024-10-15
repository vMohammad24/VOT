import { UserTier } from "@prisma/client";
import axios from "axios";
import { write } from "bun";
import {
    ActionRowBuilder,
    ActivityType,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    User,
} from "discord.js";
import { nanoid } from "nanoid/non-secure";
import { join } from 'path';
import ICommand from "../../handler/interfaces/ICommand";
import { getUserByID } from "../../util/database";
import { addEmoji, getEmoji } from "../../util/emojis";


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
    type: string[];
    name: string;
    id: string;
    metadata: any;
    url: string | null;
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
    }[]
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
    }
    timestamps?: {
        start: number;
        end: number;
    }
}


export default {
    name: 'userinfo',
    aliases: ['user', 'whois', 'ui'],
    description: 'Get information about a user',
    cooldown: 5000,
    options: [{
        type: ApplicationCommandOptionType.User,
        name: 'user',
        description: 'User to get information about',
        required: false
    }],
    type: 'all',
    execute: async ({ args, user: usr, member, interaction, handler, message, guild }) => {
        const user = (args.get('user') as GuildMember | User) || (guild ? member : usr) || usr;
        await interaction?.deferReply();
        const emojiTierMap: Map<UserTier, string> = new Map([
            // [UserTier.Normal, null],
            [UserTier.Premium, getEmoji('premium').toString()],
            [UserTier.Staff, getEmoji('staff').toString()],
            [UserTier.Beta, getEmoji('beta').toString()],
        ]);
        const [pUser, res, statusRes] = await Promise.all([
            getUserByID(user.id, { tier: true }),
            axios.get<UserInfo>('https://us-atlanta2.evade.rest/users/' + user.id),
            axios.get<UserStatus>(`https://us-atlanta2.evade.rest/users/${user.id}/status`)
        ]);
        const { data: sData } = statusRes;
        const { data } = res;
        const { bio, connections, badges, clan } = data;
        const ems = await handler.client.application?.emojis.fetch();
        if (badges && badges.length > 0) {
            await Promise.all(badges.map(async (badge) => {
                const res = await axios.get(badge.url, { responseType: 'arraybuffer' });
                const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `${badge.name}.png`);
                await write(path, res.data);
                badge.emoji = (await addEmoji(path, ems))?.toString()!;
            }));
        }
        const buttonId = nanoid();

        const u = user instanceof GuildMember ? user.user : user;
        if (!u) return { content: 'User not found', ephemeral: true };
        if (clan && clan.identity_guild_id && clan.tag && clan.badge) {
            const res = await axios.get(`https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png?size=128`, { responseType: 'arraybuffer' });
            const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `${clan.identity_guild_id}_${clan.tag}.png`);
            await write(path, res.data);
            clan.emoji = (await addEmoji(path, ems))?.toString()!;
        }
        if (sData.activities.length > 0) {
            sData.activities = sData.activities.filter(a => a.type !== ActivityType.Custom);
            await Promise.all(sData.activities.map(async (activity) => {
                if (!activity.type && activity.assets && activity.assets.large_image && activity.assets.large_image.startsWith('spotify')) activity.type = ActivityType.Listening;
                if (!activity.type) activity.type = ActivityType.Playing;
                const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `activity_${activity.type}.svg`);
                activity.emoji = (await addEmoji(path, ems))?.toString() || '❓';
            }));
        }
        if (sData.voice && sData.voice.length > 0) {
            // create a new activity from voice data
            const voice = sData.voice[0];
            if (!voice.channel) return;
            sData.activities.push({
                name: 'Voice',
                type: ActivityType.Listening,
                details: voice.channel.name,
                state: voice.channel.guild.name,
                emoji: getEmoji('volume').toString()
            });
        }
        const embed = new EmbedBuilder()
            .setTitle('User Information')
            .setThumbnail(u.displayAvatarURL())
            .setAuthor({ name: `${u.tag}`, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${u.id}` })
            .setDescription(`
${(pUser && pUser.tier != UserTier.Normal) ? `**Tier**: ${emojiTierMap.get(pUser.tier)} VOT ${pUser.tier}` : ''}
${(clan && clan.emoji && clan.tag && clan.identity_guild_id) ? `**Clan**: ${clan.emoji} ${clan.tag}` : ''}
${sData.status ? `**Status**: ${sData.status}` : ''}

${(sData.activities && sData.activities.length > 0) ? `## **Activities**:
 ${sData.activities.map(activity =>
                `${activity.emoji ?? ''} **${activity.name}** ${activity.details ? `\`${activity.details}\`` : ''} ${activity.state ? `- \`${activity.state}\`` : ''}`
            ).join('\n')
                    }
    ` : ''}
${(badges && badges.length > 0) ? `**Badges**:\n### ${badges.map(badge => badge.emoji).join('')}` : ''}

${(connections && connections.length > 0) ? `**Connections**:
${connections.map(connection => (
                        connection.url ? `[${connection.name}](${connection.url})`
                            : `${connection.type.includes('domain') ?
                                `[${connection.name}](https://${connection.name})` :
                                connection.name} ${connection.type.includes('unknown') ?
                                    '' : `(${connection.type})`}`)).join('\n')}`
                    : ''}

${(bio) ? `**Bio**:\n${bio}` : ''}
            `)
            .setFields([
                ...(user instanceof GuildMember ? [
                    {
                        name: 'Roles',
                        value: user.roles.cache.filter(role => (!role.managed && (role.id != user.guild.roles.everyone.id))).map(role => role.toString()).join(' '),
                    },
                    {
                        name: 'Joined',
                        value: user.joinedTimestamp ? `<t:${Math.round(user.joinedTimestamp! / 1000)}>` : 'Unknown',
                    }
                ] : []),
            ])
            .setColor(u.hexAccentColor || 'Random')
            .setTimestamp(u.createdTimestamp)
            .setFooter({ text: 'Created at' });
        const sentMessage = message ? await message.reply({
            embeds: [embed],
            allowedMentions: { repliedUser: true },
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setLabel('View reviews').setStyle(ButtonStyle.Primary).setCustomId(buttonId)
                )
            ]
        }) : await interaction!.editReply({
            embeds: [embed],
            allowedMentions: { repliedUser: true },
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setLabel('View reviews').setStyle(ButtonStyle.Primary).setCustomId(buttonId)
                )
            ]
        });
        const collector = sentMessage?.createMessageComponentCollector({ filter: i => i.customId === buttonId });
        collector?.on('collect', async i => {
            const reviewsRes = await axios.get(`https://manti.vendicated.dev/api/reviewdb/users/${user.id}/reviews`);
            const reviews: any[] = reviewsRes.data.reviews;
            const embed = new EmbedBuilder()
                .setTitle('Reviews')
                .setAuthor({ name: u.tag, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${user.id}` })
                .setColor(u.hexAccentColor || 'Random')
                .setTimestamp();
            if (reviews) {
                reviews.shift();
                if (reviews.length <= 0) return i.reply({ content: 'No reviews found', ephemeral: true });
                embed.setDescription(reviews.map(review => `- **${review.sender.username}** - ${review.comment}`).join('\n'));
            }
            i.reply({
                embeds: [embed],
                ephemeral: true,
                allowedMentions: { repliedUser: true }
            });
        });
    }
} as ICommand;
