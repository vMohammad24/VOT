import axios from "axios";
import { AttachmentBuilder } from "discord.js";
import numeral from "numeral";
import UserAgent from "user-agents";
import ICommand from "../../handler/interfaces/ICommand";
import { InstagramJsonResponse } from "../../util/instagram";
import { pagination } from "../../util/pagination";
import VOTEmbed from "../../util/VOTEmbed";

const userAgent = new UserAgent();
export default {
    name: "instagram trending",
    description: "Get trending instagram reels",
    type: "all",
    aliases: ["ig trending", "igtrending", "igt", "igtr"],
    execute: async ({ interaction, message }) => {
        const lookFor = '{"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"require":';





        const res = await axios.get('https://www.instagram.com/reels/', {
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
        if (index === -1) return { content: "Could not find trending reels", ephemeral: true }
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
        await pagination({
            interaction,
            message,
            type: 'select',
            name: 'Select a reel',
            pages: vids.map((vid) => ({
                name: vid.caption.text.slice(0, 100),
                page: {
                    embeds: [
                        new VOTEmbed()
                            .setDescription(vid.caption.text)
                            .setURL(`https://www.instagram.com/reels/${vid.code}`)
                            .setAuthor({
                                name: vid.user.username,
                                iconURL: vid.user.profile_pic_url,
                                url: `https://www.instagram.com/${vid.owner.username}`,
                            })
                            .setTimestamp(new Date(vid.taken_at * 1000))
                            .setFooter({
                                text: `❤️ ${numeral(vid.like_count).format('0,0')} • 💬 ${numeral(vid.comment_count).format('0,0')} • Uploaded`
                            }),
                    ],
                    files: [new AttachmentBuilder(vid.video_versions[0].url, { name: 'VOT-IG-Trending.mp4' })],
                },
            })),
        });
    }
} as ICommand