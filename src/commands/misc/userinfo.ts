import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

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
    execute: async ({ args, member }) => {
        const user = args.get('user') as GuildMember || member;
        return {
            embeds: [new EmbedBuilder()
                .setTitle('User Information')
                .setThumbnail(user.user.displayAvatarURL())
                .setAuthor({ name: user.user.tag, iconURL: user.user.displayAvatarURL() })
                .setDescription(`
                    **ID**: ${user.id}
                    **Roles**: ${user.roles.cache.map(role => role.toString()).join(' ')}
                    **Joined**: ${user.joinedTimestamp ? `<t:${Math.round(user.joinedTimestamp! / 1000)}>` : 'Unknown'}
                    **Created**: <t:${Math.round(user.user.createdTimestamp / 1000)}>
                    `)
                .setColor('Random')
                .setTimestamp()
            ],
            allowedMentions: { repliedUser: true }
        }
    }
} as ICommand