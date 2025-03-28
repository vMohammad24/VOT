import axios from "axios";
import { AttachmentBuilder } from "discord.js";
import numeral from "numeral";
import UserAgent from "user-agents";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { pagination } from "../../util/pagination";
import type { TikTokExploreResponse } from "../../util/tiktok";

const userAgent = new UserAgent();
let cookies = "";
export default {
	name: "tiktok trending",
	description: "Get trending videos from tiktok",
	aliases: ["tiktoktrending", "tiktok_trending", "tttrending"],
	execute: async ({ interaction, message }) => {
		const res = await axios.get(
			"https://www.tiktok.com/api/explore/item_list/?aid=2&browser_language=en-US&count=3&data_collection_enabled=false&history_len=4&region=US&tz_name=America%2FVirgin&user_is_login=true&device_id=1&categoryType=120&language=en",
			{
				withCredentials: true,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
					"Accept-Language": "en-US,en;q=0.9",
					Cookie: cookies,
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
					"sec-ch-ua": '"Not;A=Brand";v="24", "Chromium";v="128"',
					"sec-ch-ua-mobile": "?0",
					"sec-ch-ua-platform": '"Windows"',
					"sec-fetch-dest": "document",
					"sec-fetch-mode": "navigate",
					"sec-fetch-site": "none",
					DNT: "1",
					"upgrade-insecure-requests": "1",
				},
			},
		);
		if (!cookies) {
			cookies =
				res.headers["set-cookie"]
					?.map((cookie: string) => cookie.split(";")[0])
					.join("; ") ?? "";
			commandHandler.executeCommand.call(
				commandHandler,
				commandHandler.commands?.find((a) => a.name === "tiktok trending")!,
				(interaction ? interaction : message)!,
			);
		}
		cookies =
			res.headers["set-cookie"]
				?.map((cookie: string) => cookie.split(";")[0])
				.join("; ") ?? "";
		const trending = res.data as TikTokExploreResponse; // JSON.parse(content) as TikTokExploreResponse;
		if (!trending)
			return {
				content: "Failed to fetch Tiktok trending videos",
				ephemeral: true,
			};

		const videos = trending.itemList;
		await pagination({
			interaction,
			message,
			pages: await Promise.all(
				videos.map(async (video) => {
					const playAddr =
						video.video.bitrateInfo[0].PlayAddr.UrlList.slice(-1)[0];
					const videoPlay = await axios.get(playAddr, {
						withCredentials: true,
						headers: {
							Cookie: cookies,
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
							"Accept-Language": "en-US,en;q=0.9",
							Accept:
								"text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
							"sec-ch-ua": '"Not;A=Brand";v="24", "Chromium";v="128"',
							"sec-ch-ua-mobile": "?0",
							"sec-ch-ua-platform": '"Windows"',
							DNT: "1",
						},
						responseType: "arraybuffer",
					});
					return {
						page: {
							embeds: [
								new VOTEmbed()
									.setAuthor({
										name: video.author.nickname,
										iconURL: video.author.avatarLarger,
										url: `https://www.tiktok.com/@${video.author.uniqueId}`,
									})
									.setDescription(video.desc)
									.setFooter({
										text: `❤️ ${numeral(video.statsV2.diggCount).format("0,0")} • 💬 ${numeral(video.statsV2.commentCount).format("0,0")} • 🔁 ${numeral(video.statsV2.shareCount).format("0,0")}`,
									})
									.setImage(video.video.downloadAddr)
									.setTimestamp(video.createTime * 1000),
							],
							files: [
								new AttachmentBuilder(Buffer.from(videoPlay.data), {
									name: "VOT_TT_Trending.mp4",
								}),
							],
						},
						description: video.desc ?? "No description",
						name: video.author.nickname ?? "Unknown",
					};
				}),
			),
		});
	},
} as ICommand;
