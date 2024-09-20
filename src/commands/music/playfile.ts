import axios from "axios";
import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from "discord.js";
import { KazagumoTrack } from "kazagumo";
import { parseBuffer } from "music-metadata";
import ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
import { getFrontEndURL } from "../../util/urls";

export default {
    description: 'Play a file',
    options: [
        {
            name: 'url',
            description: 'The url of the file to play',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'file',
            description: 'The file to play',
            type: ApplicationCommandOptionType.Attachment,
            required: false
        }
    ],
    aliases: ['pfile', 'pf'],
    cooldown: 1000 * 60 * 5,
    needsPlayer: true,
    execute: async ({ args, player, member }) => {
        const file = args.get('file') as Attachment | undefined;
        const urlA = args.get('url') as string | undefined;
        let url = urlA;
        if (!file && !urlA) return {
            content: 'No file or url provided',
            ephemeral: true
        };
        if (file) url = file.url;
        if (file && file?.contentType?.startsWith('audio')) return {
            content: 'Invalid file type',
            ephemeral: true
        };
        if (!url) return {
            content: 'No file or url provided (2)',
            ephemeral: true
        }
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const metadata = await parseBuffer(res.data);
        const { common: songInfo } = metadata;
        let imageUrl = undefined;
        if (songInfo.picture) {
            const image = songInfo.picture![0].data
            const file = new File([image], `${songInfo.title || 'unknown'} -- ${songInfo.copyright}.png`)
            const a = await uploadFile(file)
            if (a.cdnFileName) imageUrl = `https://cdn.nest.rip/uploads/${a.cdnFileName}`
        }
        const encoded = Buffer.from(res.data).toString('base64');
        const track = new KazagumoTrack({
            encoded, pluginInfo: {}, info: {
                title: songInfo.title || (file?.name || "Unknown"),
                author: songInfo.artist || 'Unknown',
                identifier: encoded || (file?.name || "Unknown"),
                length: 0,
                uri: songInfo.comment ? songInfo.comment[0].text : (songInfo.asin || getFrontEndURL() + "/404"),
                isSeekable: true,
                isStream: false,
                position: 0,
                sourceName: 'custom',
                isrc: songInfo.isrc ? songInfo.isrc[0] : undefined,
                artworkUrl: imageUrl
            }
        }, member)
        if (!player) return {
            content: 'No player found',
            ephemeral: true
        }
        const embed = new EmbedBuilder().setTitle('Added to queue').setColor('Green');
        embed.setDescription(`Added [${track.title || 'Error getting title'}]${track.uri ? `(${track.uri})` : ''} to the queue\n\nGo to <#${member.voice.channelId}> to manage the queue`);
        player.queue.add(track);
        if (!player.playing) player.play();
        return {
            embeds: [embed]
        }
    }
} as ICommand