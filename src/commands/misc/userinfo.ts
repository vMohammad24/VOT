import axios from "axios";
import { write } from "bun";
import {
    ActionRowBuilder,
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
import { addEmoji } from "../../util/emojis";


interface Decoration {
    id: string;
    name: string;
    animated: boolean;
}

interface Badge {
    name: string;
    description: string;
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
    execute: async ({ args, user: usr, member, interaction, handler, message }) => {
        const user = (args.get('user') as GuildMember | User) || member || usr;
        await interaction?.deferReply();
        const res = await axios.get('https://us-atlanta2.evade.rest/users/' + user.id);
        const data = res.data as UserInfo;
        const { bio, connections } = data;
        const badges: {
            name: string;
            description: string;
            emoji: string;
        }[] = data.badges;
        if (badges && badges.length > 0) {
            await (async () => {
                const ems = await handler.client.application?.emojis.fetch();
                for (const badge of badges) {
                    const emojiId = badge.emoji.match(/:(\d+)>$/)?.[1];
                    const res = await axios.get(`https://cdn.discordapp.com/emojis/${emojiId}.png?size=512&quality=lossless`, { responseType: 'arraybuffer' });
                    const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `${badge.name}.png`);
                    await write(path, res.data);
                    badge.emoji = (await addEmoji(path, ems))?.toString()!;
                }
            })()
        }
        const buttonId = nanoid();

        const u = user instanceof GuildMember ? user.user : user;


        const embed = new EmbedBuilder()
            .setTitle('User Information')
            .setThumbnail(u.displayAvatarURL())
            .setAuthor({ name: u.tag, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${u.id}` })
            .setDescription(`
${(badges && badges.length > 0) ? `**Badges**:\n### ${badges.map(badge => badge.emoji).join('')}` : ''}
${(connections && connections.length > 0) ? `**Connections**:
${connections.map(connection => (
                connection.url ? `[${connection.name}](${connection.url})`
                    : `${connection.type.includes('domain') ?
                        `[${connection.name}](https://${connection.name})` :
                        connection.name} ${connection.type.find(a => a.includes('unknown')) ?
                            '' : `(${connection.type[0]})`}`)).join('\n')}`
                    : ''}

${(bio) ? `**Bio**:\n${bio}` : ''}
                `)
            .setFields([
                {
                    name: 'ID',
                    value: u.id,
                    inline: true,
                },
                ...(user instanceof GuildMember ? [
                    {
                        name: 'Roles',
                        value: user.roles.cache.filter(role => (!role.managed && (role.id != user.guild.roles.everyone.id))).map(role => role.toString()).join(' '),
                        inline: true
                    },
                    {
                        name: 'Joined',
                        value: user.joinedTimestamp ? `<t:${Math.round(user.joinedTimestamp! / 1000)}>` : 'Unknown',
                        inline: true
                    }
                ] : []),
                {
                    name: 'Created',
                    value: `<t:${Math.round(u.createdTimestamp / 1000)}>`,
                    inline: true
                }
            ])
            .setColor(u.hexAccentColor || 'Random')
            .setTimestamp();
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
            const reviewsRes = await axios.get(`https://manti.vendicated.dev/api/reviewdb/users/${user.id}/reviews`)
            const reviews: any[] = reviewsRes.data.reviews;
            const embed = new EmbedBuilder()
                .setTitle('Reviews')
                .setAuthor({ name: u.tag, iconURL: u.displayAvatarURL(), url: `https://discord.com/users/${user.id}` })
                // .setDescription(embedDesc)
                .setColor(u.hexAccentColor || 'Random')
                .setTimestamp();
            if (reviews) {
                // remove the first one
                reviews.shift();
                if (reviews.length <= 0) return i.reply({ content: 'No reviews found', ephemeral: true });
                embed.setDescription(reviews.map(review => `- **${review.sender.username}** - ${review.comment}`).join('\n'))
            }
            i.reply({
                embeds: [embed
                ],
                ephemeral: true,
                allowedMentions: { repliedUser: true }
            })
        })
    }
} as ICommand