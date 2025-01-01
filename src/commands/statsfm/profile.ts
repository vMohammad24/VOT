import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { getUserByID } from "../../util/database";
import { getEmoji } from "../../util/emojis";
import { getUser } from "../../util/statsfm";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    name: 'statsfm profile',
    aliases: ['sfm profile'],
    type: 'all',
    description: 'Check the stats.fm profile of a user',
    options: [
        {
            name: 'username',
            description: 'The stats.fm user you want to search for.',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    execute: async ({ user, args }) => {
        const username = args.get('username') as string ?? (await getUserByID(user.id, { statsfmUser: true })).statsfmUser;
        const u = await getUser(username);
        if (!u || !u.item.displayName) {
            return {
                content: 'Invalid stats.fm username',
                ephemeral: true
            }
        }
        const embed = await new VOTEmbed()
            .setAuthor({ name: u.item.customId ?? u.item.displayName, iconURL: u.item.image })
            .setTitle(u.item.displayName)
            .setURL(`https://stats.fm/user/${u.item.customId || u.item.id}`)
            .setThumbnail(u.item.image)
            .dominant()
        if (u.item.isPlus && u.item.isPro) embed.addDescription('This user has stats.fm Plus and Pro');
        else if (u.item.isPlus) embed.addDescription('This user has stats.fm Plus');
        else if (u.item.isPro) embed.addDescription('This user has stats.fm Pro');
        if (u.item.profile.bio) embed.addDescription(u.item.profile.bio);
        if (u.item.profile.pronouns) embed.addFields([
            {
                name: 'Pronouns',
                value: u.item.profile.pronouns,
                inline: true
            }
        ]);
        let actionRow: ActionRowBuilder<ButtonBuilder> | undefined = undefined;
        if (u.item.spotifyAuth) {
            actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Spotify').setURL(`https://open.spotify.com/user/${u.item.spotifyAuth.platformUserId}`).setEmoji(getEmoji('spotify').toString())
            )
        }
        return {
            embeds: [embed],
            components: actionRow ? [actionRow] : undefined
        }
    }
} as ICommand