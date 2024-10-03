import axios from "axios";
import { write } from "bun";
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
import { join } from 'path';
import removeMarkdown from 'remove-markdown';
import ICommand from "../../handler/interfaces/ICommand";
import { addEmoji } from "../../util/emojis";
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
    execute: async ({ args, member, interaction, handler }) => {
        const user = args.get('user') as GuildMember || member;
        await interaction?.deferReply();
        const res = await axios.get('https://us-atlanta2.evade.rest/users/' + user.id);
        const { data } = res;
        const { bio } = data;
        const badges: {
            name: string;
            description: string;
            emoji: string;
        }[] = data.badges;
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
        return {
            embeds: [new EmbedBuilder()
                .setTitle('User Information')
                .setThumbnail(user.user.displayAvatarURL())
                .setAuthor({ name: user.user.tag, iconURL: user.user.displayAvatarURL() })
                // .setDescription(`
                //     **ID**: ${user.id}
                //     **Badges**: ${badges.map(badge => badge.emoji).join('')}
                //     **Bio**: ${removeMarkdown(bio) || 'None'}
                //     **Roles**: ${user.roles.cache.filter(role => (!role.managed && (role.id != user.guild.roles.everyone.id))).map(role => role.toString()).join(' ')}
                //     **Joined**: ${user.joinedTimestamp ? `<t:${Math.round(user.joinedTimestamp! / 1000)}>` : 'Unknown'}
                //     **Created**: <t:${Math.round(user.user.createdTimestamp / 1000)}>
                //     `)
                .setFields([
                    {
                        name: 'ID',
                        value: user.id,
                    },
                    {
                        name: 'Badges',
                        value: badges.map(badge => badge.emoji).join(''),
                        inline: true
                    },
                    {
                        name: 'Bio',
                        value: removeMarkdown(bio) || 'None',
                        inline: true
                    },
                    {
                        name: 'Roles',
                        value: user.roles.cache.filter(role => (!role.managed && (role.id != user.guild.roles.everyone.id))).map(role => role.toString()).join(' '),
                        inline: true
                    },
                    {
                        name: 'Joined',
                        value: user.joinedTimestamp ? `<t:${Math.round(user.joinedTimestamp! / 1000)}>` : 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Created',
                        value: `<t:${Math.round(user.user.createdTimestamp / 1000)}>`,
                        inline: true
                    }
                ])
                .setColor('Random')
                .setTimestamp()
            ],
            allowedMentions: { repliedUser: true }
        }
    }
} as ICommand