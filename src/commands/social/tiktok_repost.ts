import axios from "axios";
import { ApplicationCommandOptionType, AttachmentBuilder, ColorResolvable } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { loadImg } from "../../util/database";
import { TikTokVideo } from "../../util/tiktok";
import { getTwoMostUsedColors } from "../../util/util";
import numeral from "numeral";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    name: "tiktok repost",
    description: "Repost a video from tiktok",
    options: [
        {
            name: "url",
            description: "Tiktok video URL",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    execute: async ({ args }) => {
        const url = args.get("url") as string | undefined;
        if (!url) return { ephemeral: true, content: "Please provide a Tiktok video URL" };
        try {
            new URL(url);
        } catch (e) {
            return {
                ephemeral: true,
                content: 'Invalid URL',
            };
        }
        if (!url.includes('tiktok.com') && !url.includes('video'))
            return {
                ephemeral: true,
                content: 'Invalid Tiktok video URL',
            };

        const res = await axios.get(url);
        const { data, headers } = res;
        const lookFor = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">';
        const start = data.indexOf(lookFor);
        const end = data.indexOf('</script>', start);
        if (start === -1 || end === -1)
            return {
                ephemeral: true,
                content: 'Failed to find video data',
            };
        const json = data.slice(start + lookFor.length, end);
        let parsed;
        try {
            parsed = JSON.parse(json);
        } catch (e) {
            return {
                ephemeral: true,
                content: 'Failed to parse video data',
            };
        }
        const video: TikTokVideo = parsed['__DEFAULT_SCOPE__']['webapp.video-detail'].itemInfo.itemStruct;
        const cookies = headers['set-cookie']
            ? headers['set-cookie'].map((cookie: string) => cookie.split(';')[0]).join('; ')
            : '';
        const { data: videoData } = await axios.get(video.video.playAddr, {
            headers: {
                cookie: cookies,
            },
            responseType: 'arraybuffer',
        });
        const color: ColorResolvable = video.video.cover
            ? getTwoMostUsedColors(await loadImg(video.video.cover))[0]
            : 'Random';
        return {
            ephemeral: true,
            embeds: [
                new VOTEmbed()
                    .setAuthor({
                        name: video.author.nickname,
                        iconURL: video.author.avatarLarger,
                        url: `https://www.tiktok.com/@${video.author.uniqueId}`,
                    })
                    .setDescription(video.desc)
                    .setFooter({
                        text: `❤️ ${numeral(video.statsV2.diggCount).format('0,0')} • 💬 ${numeral(video.statsV2.commentCount).format('0,0')} • 🔁 ${numeral(video.statsV2.shareCount).format('0,0')}`
                    })
                    .setColor(color)
                    .setTimestamp(parseInt(video.createTime) * 1000),
            ],
            files: [new AttachmentBuilder(Buffer.from(videoData), { name: 'video.mp4' })],
        };
    }
} as ICommand