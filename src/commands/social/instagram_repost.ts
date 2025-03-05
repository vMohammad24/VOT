import axios from "axios";
import { ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import numeral from "numeral";
import UserAgent from "user-agents";
import ICommand from "../../handler/interfaces/ICommand";
import { InstagramJsonResponse } from "../../util/instagram";
import { isNullish } from "../../util/util";
import VOTEmbed from "../../util/VOTEmbed";

const userAgent = new UserAgent();
const requireStartWith = 'https://www.instagram.com/reels/';
export default {
    name: "instagram repost",
    description: "Repost an instagram reel",
    type: "all",
    aliases: ["ig repost", "igrepost", "igre", "igr"],
    options: [
        {
            name: "url",
            description: "The url of the instagram reel",
            type: ApplicationCommandOptionType.String,
            required: true,
            minLength: requireStartWith.length,
        },
        {
            name: "embed",
            description: "Whether to embed the video or not",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }
    ],
    execute: async ({ args }) => {
        let url = args.get('url') as string;
        const shouldEmbed = (args.get('embed') as boolean || true);
        const lookFor = '{"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"require":';
        if (!url.includes("://www.")) {
            url = url.replace("://", "://www.");
        }
        if (url.includes("/reel/")) {
            url = url.replace("/reel/", "/reels/");
        }

        if (!url.startsWith(requireStartWith)) return { content: "This is not a valid instagram reel url", ephemeral: true };
        const res = await axios.get(url, {
            headers: {
                'User-Agent': userAgent.random().toString(),
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age=0',
                'dnt': '1',
                'sec-ch-prefers-color-scheme': 'dark',
                'sec-ch-ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'viewport-width': '1920',
            },
        });
        const body = res.data as string;
        const index = body.indexOf(lookFor);
        if (index === -1) return { content: "Failed to repost this reel.", ephemeral: true }
        const endIndex = body.indexOf('</script>', index);
        const text = body.slice(index, endIndex);
        const json = JSON.parse(text);
        const vids: InstagramJsonResponse[] = [];
        const edges =
            json.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data
                .xdt_api__v1__clips__clips_on_logged_out_connection_v2.edges;
        for (const edge of edges) {
            const media = edge.node.media;
            vids.push(media);
        }
        const media = vids[0];
        const filename = `VOT_REPOST_${media.code}.mp4`;
        const embed = new VOTEmbed()
            .setDescription(media.caption?.text || 'No Caption')
            .setURL(`https://www.instagram.com/p/${media.code}`)
            .setAuthor(isNullish(media.user.username) ? null : {
                name: media.user.username,
                iconURL: media.user.profile_pic_url ?? undefined
            })
            .setThumbnail(media.image_versions2.candidates[0].url)
            .setTimestamp(new Date(media.taken_at * 1000))
            .setFooter({
                text: `❤️ ${numeral(media.like_count).format('0,0')} • 💬 ${numeral(media.comment_count).format('0,0')} • Uploaded`
            });
        return {
            embeds: shouldEmbed ? [embed] : [],
            files: [new AttachmentBuilder(media.video_versions[0].url, { name: filename })]
        }
    }
} as ICommand