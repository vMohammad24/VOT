import axios from "axios";
import { ApplicationCommandOptionType, Attachment } from "discord.js";
import { KazagumoTrack } from "kazagumo";
import { parseBuffer } from "music-metadata";
import ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
import { getFrontEndURL } from "../../util/urls";

export default {
    description: 'Play a file',
    options: [
        {
            name: 'file',
            description: 'The file to play',
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }
    ],
    cooldown: 1000 * 60 * 5,
    needsPlayer: true,
    execute: async ({ args, player, member }) => {
        const file = args.get('file') as Attachment | undefined;
        if (!file) return {
            content: 'No file provided',
            ephemeral: true
        };
        if (!file.contentType?.startsWith('audio')) return {
            content: 'Invalid file type',
            ephemeral: true
        };
        const url = file.url;
        const encoded = await axios.get(url, { responseType: 'arraybuffer' });
        const metadata = await parseBuffer(encoded.data, {
            mimeType: file.contentType
        });
        const { common: songInfo } = metadata;
        let imageUrl = undefined;
        if (songInfo.picture) {
            const image = songInfo.picture![0].data
            const file = new File([image], `${songInfo.title || 'unknown'} -- ${songInfo.copyright}.png`)
            const a = await uploadFile(file)
            if (a.cdnFileName) imageUrl = `https://cdn.nest.rip/uploads/${a.cdnFileName}`
        }
        const tracks = new KazagumoTrack({
            encoded: encoded.data, pluginInfo: {}, info: {
                title: songInfo.title || file.name,
                author: songInfo.artist || 'Unknown',
                identifier: songInfo.acoustid_fingerprint || file.name,
                length: 0,
                uri: songInfo.comment ? songInfo.comment[0].text : (songInfo.asin || getFrontEndURL() + "/404"),
                isSeekable: true,
                isStream: false,
                position: 0,
                sourceName: 'attachment',
                isrc: songInfo.isrc ? songInfo.isrc[0] : undefined,
                artworkUrl: imageUrl
            }
        }, member)
        if (!player) return {
            content: 'No player found',
            ephemeral: true
        }
        player.queue.add(tracks);
        if (!player.playing) player.play();
        return {
            content: `Added ${tracks.title} to the queue`
        }
    }
} as ICommand