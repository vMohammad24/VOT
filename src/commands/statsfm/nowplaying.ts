import ICommand from "../../handler/interfaces/ICommand";
import { getUser } from "../../util/database";
import { getUserCurrentStream } from "../../util/statsfm";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    name: 'statsfm nowplaying',
    aliases: ['sfm np'],
    type: 'all',
    description: 'Get the currently playing song on stats.fm',
    execute: async ({ user }) => {
        const statsFm = (await getUser(user, { statsfmUser: true })).statsfmUser;
        if (!statsFm) return {
            content: 'Please set your stats.fm username with `/statsfm set`',
            ephemeral: true
        };
        const np = await getUserCurrentStream(statsFm.statsfmUser);
        if (!np) return {
            content: 'Nothing is currently playing',
            ephemeral: true
        };
        return {
            embeds: [
                await new VOTEmbed()
                    .setAuthor({ name: np.item.track.artists[0].name, iconURL: np.item.track.artists[0].image })
                    .setTitle(np.item.track.name)
                    .setURL(`https://open.spotify.com/track/${np.item.track.externalIds.spotify[0]}`)
                    .setThumbnail(np.item.track.albums[0].image)
            ]
        }
    }
} as ICommand