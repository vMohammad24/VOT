// thanks instafix (ddinstagram.com)
import axios from "axios";
import * as cheerio from "cheerio";
import { ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import numeral from "numeral";
import UserAgent from "user-agents";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { isNullish } from "../../util/util";

const userAgent = new UserAgent();

interface InstagramMedia {
	typename: string;
	url: string;
	video_url?: string;
	display_url?: string;
}

interface InstagramPostData {
	username: string;
	caption: string;
	media: InstagramMedia[];
	like_count?: number;
	comment_count?: number;
	taken_at?: number;
	code?: string;
}
export default {
	name: "instagram repost",
	description: "Repost an instagram post or reel",
	type: "all",
	aliases: ["ig repost", "igrepost", "igre", "igr"],
	options: [
		{
			name: "url",
			description: "The url of the instagram post or reel",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "embed",
			description: "Whether to embed the video or not",
			type: ApplicationCommandOptionType.Boolean,
			required: false,
		},
	],
	execute: async ({ args }) => {
		let url = args.get("url") as string;
		const shouldEmbed = (args.get("embed") as boolean) ?? true;
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(url);
		} catch (error) {
			return {
				content: "Invalid URL format. Please provide a valid Instagram URL.",
				ephemeral: true,
			};
		}

		if (
			parsedUrl.hostname !== "www.instagram.com" &&
			parsedUrl.hostname !== "instagram.com"
		) {
			return {
				content: "This command only works with Instagram URLs.",
				ephemeral: true,
			};
		}

		if (parsedUrl.hostname === "instagram.com") {
			parsedUrl.hostname = "www.instagram.com";
		}

		url = parsedUrl.toString();

		if (url.includes("/reel/")) {
			url = url.replace("/reel/", "/reels/");
		}

		let postID: string | undefined;
		if (url.includes("/reels/")) {
			postID = url.split("/reels/")[1]?.split("/")[0];
		} else if (url.includes("/p/")) {
			postID = url.split("/p/")[1]?.split("/")[0];
		}

		if (!postID) {
			return {
				content:
					"Could not extract post ID from URL. Please provide a valid Instagram post or reel URL.",
				ephemeral: true,
			};
		}

		const maxRetries = 3;
		let attempt = 0;
		let postData: InstagramPostData | null = null;

		while (attempt < maxRetries && !postData) {
			attempt++;

			try {
				const embedData = await scrapeFromEmbed(postID);
				if (embedData) {
					postData = embedData;
					break;
				}

				const gqlData = await scrapeFromGraphQL(postID);
				if (gqlData) {
					postData = gqlData;
					break;
				}

				if (attempt === maxRetries) {
					return {
						content: "Failed to fetch Instagram data after multiple attempts.",
						ephemeral: true,
					};
				}

				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				if (attempt === maxRetries) {
					return {
						content: "Failed to repost this reel. Please try again.",
						ephemeral: true,
					};
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		if (!postData || !postData.media || postData.media.length === 0) {
			return {
				content: "Failed to extract media from this post.",
				ephemeral: true,
			};
		}

		const attachments: AttachmentBuilder[] = [];

		for (let i = 0; i < postData.media.length; i++) {
			const media = postData.media[i];
			let mediaUrl = media.video_url || media.url;

			if (!mediaUrl) {
				continue;
			}

			mediaUrl = mediaUrl.replace(/&amp;/g, "&");
			mediaUrl = mediaUrl.replace(/\s+\d+w$/, "").replace(/\s+\d+x$/, "");
			mediaUrl = mediaUrl.split(" ")[0];
			mediaUrl = mediaUrl.replace(/,$/, "");

			try {
				new URL(mediaUrl);
			} catch (e) {

				continue;
			}

			const isVideo = media.typename === "GraphVideo" || media.video_url;
			const extension = isVideo ? "mp4" : "jpg";

			const suffix = postData.media.length > 1 ? `_${i + 1}` : "";
			const filename = `VOT_REPOST_${postData.code || postID}${suffix}.${extension}`;

			attachments.push(new AttachmentBuilder(mediaUrl, { name: filename }));
		}

		if (attachments.length === 0) {
			return {
				content: "Could not find any media URLs for this post.",
				ephemeral: true,
			};
		}

		const embed = new VOTEmbed()
			.setDescription(postData.caption || "No Caption")
			.setURL(url)
			.setAuthor(
				isNullish(postData.username)
					? null
					: {
						name: postData.username,
						iconURL: undefined,
					},
			)
			.setTimestamp(
				postData.taken_at ? new Date(postData.taken_at * 1000) : new Date(),
			)
			.setFooter({
				text: `❤️ ${numeral(postData.like_count || 0).format("0,0")} • 💬 ${numeral(postData.comment_count || 0).format("0,0")} • ${postData.media.length > 1 ? `${postData.media.length} items • ` : ""}Uploaded`,
			});
		return {
			embeds: shouldEmbed ? [embed] : [],
			files: attachments,
		};
	},
} as ICommand;

async function scrapeFromEmbed(
	postID: string,
): Promise<InstagramPostData | null> {
	try {
		const embedUrl = `https://www.instagram.com/p/${postID}/embed/captioned/`;
		const response = await axios.get(embedUrl, {
			headers: {
				"User-Agent": userAgent.random().toString(),
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				"Accept-Language": "en-US,en;q=0.9",
				"Cache-Control": "max-age=0",
				DNT: "1",
				"Sec-Ch-Prefers-Color-Scheme": "dark",
				"Sec-Ch-Ua": '"Not;A=Brand";v="24", "Chromium";v="128"',
				"Sec-Ch-Ua-Mobile": "?0",
				"Sec-Ch-Ua-Platform": '"Windows"',
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		const body = response.data as string;

		const timeSliceData = parseTimeSliceImpl(body);
		if (timeSliceData) {
			return timeSliceData;
		}

		const htmlData = parseEmbedHTML(body);
		if (htmlData) {
			return htmlData;
		}

		return null;
	} catch (error) {

		return null;
	}
}

function parseTimeSliceImpl(body: string): InstagramPostData | null {
	try {
		const lines = body.split("\n");
		for (const line of lines) {
			if (
				line.includes("shortcode_media") ||
				line.includes("edge_sidecar_to_children")
			) {
				const scriptMatch = line.match(/>(.*)<\/script>/);
				if (scriptMatch) {
					const scriptContent = scriptMatch[1];

					const jsonMatches = scriptContent.match(
						/"[^"]*(?:shortcode_media|edge_sidecar_to_children|gql_data)[^"]*"/g,
					);
					if (jsonMatches) {
						for (const match of jsonMatches) {
							try {
								const jsonStr = match
									.slice(1, -1)
									.replace(/\\"/g, '"')
									.replace(/\\\\/g, "\\");
								const data = JSON.parse(jsonStr);

								if (data.gql_data) {
									const result = parseInstagramData(data.gql_data);
									if (result) return result;
								}

								if (data.shortcode_media || data.xdt_shortcode_media) {
									const result = parseInstagramData(data);
									if (result) return result;
								}
							} catch (e) { }
						}
					}

					const directJsonMatches = scriptContent.match(
						/\{[^{}]*(?:shortcode_media|edge_sidecar_to_children)[^{}]*\}/g,
					);
					if (directJsonMatches) {
						for (const match of directJsonMatches) {
							try {
								const data = JSON.parse(match);
								if (data.shortcode_media || data.xdt_shortcode_media) {
									const result = parseInstagramData(data);
									if (result) return result;
								}
							} catch (e) { }
						}
					}
				}
			}
		}
		return null;
	} catch (error) {

		return null;
	}
}

function parseEmbedHTML(body: string): InstagramPostData | null {
	try {
		const $ = cheerio.load(body);

		const allImageUrls: string[] = [];

		const jsonMatches = body.match(/"display_url":"([^"]+)"/g);

		if (jsonMatches) {
			for (const match of jsonMatches) {
				const urlMatch = match.match(/"display_url":"([^"]+)"/);
				if (urlMatch?.[1]) {
					const rawUrl = urlMatch[1];

					let cleanUrl = rawUrl.replace(/\\u0026/g, "&").replace(/\\/g, "");

					cleanUrl = cleanUrl.replace(/&amp;/g, "&");

					cleanUrl = cleanUrl.replace(/\s+\d+w$/, "").replace(/\s+\d+x$/, "");

					cleanUrl = cleanUrl.split(" ")[0];

					cleanUrl = cleanUrl.replace(/,$/, "");

					if (
						cleanUrl.startsWith("https://") &&
						cleanUrl.includes("fbcdn.net")
					) {
						allImageUrls.push(cleanUrl);
					}
				}
			}
		}

		if (allImageUrls.length === 0) {
			const imageUrlMatches = body.match(
				/https:\\?\/\\?\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*/g,
			);

			if (imageUrlMatches) {
				const uniqueUrls = new Set<string>();
				for (const match of imageUrlMatches) {
					let cleanUrl = match.replace(/\\/g, "");

					cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
					cleanUrl = cleanUrl.replace(/&amp;/g, "&");

					cleanUrl = cleanUrl.replace(/\s+\d+w$/, "").replace(/\s+\d+x$/, "");

					cleanUrl = cleanUrl.split(" ")[0];

					cleanUrl = cleanUrl.replace(/,$/, "");

					if (
						cleanUrl.includes("instagram") &&
						cleanUrl.includes("fbcdn.net") &&
						!cleanUrl.includes("profile")
					) {
						const isProfilePicture =
							cleanUrl.includes("t51.2885-19") &&
							(cleanUrl.includes("s150x150") || cleanUrl.includes("s240x240"));

						if (!isProfilePicture) {
							try {
								new URL(cleanUrl);
								uniqueUrls.add(cleanUrl);
							} catch (e) { }
						}
					}
				}
				allImageUrls.push(...Array.from(uniqueUrls));
			}
		}

		const uniqueImageUrls = [...new Set(allImageUrls)];


		const filteredUrls: string[] = removeDuplicateResolutions(uniqueImageUrls);


		if (filteredUrls.length > 1) {
			const media: InstagramMedia[] = [];

			for (const url of filteredUrls) {
				const mediaItem: InstagramMedia = {
					typename: "GraphImage",
					url: url,
					video_url: undefined,
					display_url: url,
				};
				media.push(mediaItem);
			}

			const username = $(".UsernameText").text().trim();
			$(".CaptionComments").remove();
			$(".CaptionUsername").remove();
			const caption = $(".Caption").text().trim();

			return {
				username,
				caption,
				media,
			};
		}

		let mediaUrl = "";
		let typename = "GraphImage";

		const imgElement = $(".EmbeddedMediaImage");
		if (imgElement.length > 0) {
			mediaUrl = imgElement.attr("src") || "";
		} else {
			const videoElement = $(".EmbeddedMediaVideo");
			if (videoElement.length > 0) {
				mediaUrl = videoElement.attr("src") || "";
				typename = "GraphVideo";
			}
		}

		if (!mediaUrl && filteredUrls.length > 0) {
			mediaUrl = filteredUrls[0];
		}

		if (!mediaUrl) {
			return null;
		}

		try {
			new URL(mediaUrl);
		} catch (e) {
			return null;
		}

		const username = $(".UsernameText").text().trim();
		$(".CaptionComments").remove();
		$(".CaptionUsername").remove();
		const caption = $(".Caption").text().trim();

		return {
			username,
			caption,
			media: [
				{
					typename,
					url: mediaUrl,
					video_url: typename === "GraphVideo" ? mediaUrl : undefined,
					display_url: typename === "GraphImage" ? mediaUrl : undefined,
				},
			],
		};
	} catch (error) {

		return null;
	}
}

async function scrapeFromGraphQL(
	postID: string,
): Promise<InstagramPostData | null> {
	try {
		const gqlParams = new URLSearchParams({
			av: "0",
			__d: "www",
			__user: "0",
			__a: "1",
			__req: "k",
			__hs: "19888.HYP:instagram_web_pkg.2.1..0.0",
			dpr: "2",
			__ccg: "UNKNOWN",
			__rev: "1014227545",
			__s: "trbjos:n8dn55:yev1rm",
			__hsi: "7380500578385702299",
			__dyn:
				"7xeUjG1mxu1syUbFp40NonwgU7SbzEdF8aUco2qwJw5ux609vCwjE1xoswaq0yE6ucw5Mx62G5UswoEcE7O2l0Fwqo31w9a9wtUd8-U2zxe2GewGw9a362W2K0zK5o4q3y1Sx-0iS2Sq2-azo7u3C2u2J0bS1LwTwKG1pg2fwxyo6O1FwlEcUed6goK2O4UrAwCAxW6Uf9EObzVU8U",
			__csr:
				"n2Yfg_5hcQAG5mPtfEzil8Wn-DpKGBXhdczlAhrK8uHBAGuKCJeCieLDyExenh68aQAKta8p8ShogKkF5yaUBqCpF9XHmmhoBXyBKbQp0HCwDjqoOepV8Tzk8xeXqAGFTVoCciGaCgvGUtVU-u5Vp801nrEkO0rC58xw41g0VW07ISyie2W1v7F0CwYwwwvEkw8K5cM0VC1dwdi0hCbc094w6MU1xE02lzw",
			__comet_req: "7",
			lsd: "AVoPBTXMX0Y",
			jazoest: "2882",
			__spin_r: "1014227545",
			__spin_b: "trunk",
			__spin_t: "1718406700",
			fb_api_caller_class: "RelayModern",
			fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
			variables: JSON.stringify({
				shortcode: postID,
				fetch_comment_count: 40,
				parent_comment_count: 24,
				child_comment_count: 3,
				fetch_like_count: 10,
				fetch_tagged_user_count: null,
				fetch_preview_comment_count: 2,
				has_threaded_comments: true,
				hoisted_comment_id: null,
				hoisted_reply_id: null,
			}),
			server_timestamps: "true",
			doc_id: "25531498899829322",
		});

		const response = await axios.post(
			"https://www.instagram.com/graphql/query/",
			gqlParams.toString(),
			{
				headers: {
					Accept: "*/*",
					"Accept-Language": "en-US,en;q=0.9",
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: "https://www.instagram.com",
					Priority: "u=1, i",
					"Sec-Ch-Prefers-Color-Scheme": "dark",
					"Sec-Ch-Ua":
						'"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
					"Sec-Ch-Ua-Full-Version-List":
						'"Google Chrome";v="125.0.6422.142", "Chromium";v="125.0.6422.142", "Not.A/Brand";v="24.0.0.0"',
					"Sec-Ch-Ua-Mobile": "?0",
					"Sec-Ch-Ua-Model": '""',
					"Sec-Ch-Ua-Platform": '"macOS"',
					"Sec-Ch-Ua-Platform-Version": '"12.7.4"',
					"Sec-Fetch-Dest": "empty",
					"Sec-Fetch-Mode": "cors",
					"Sec-Fetch-Site": "same-origin",
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
					"X-Asbd-Id": "129477",
					"X-Bloks-Version-Id":
						"e2004666934296f275a5c6b2c9477b63c80977c7cc0fd4b9867cb37e36092b68",
					"X-Fb-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
					"X-Ig-App-Id": "936619743392459",
				},
			},
		);

		const data = response.data;
		if (data?.data) {
			return parseInstagramData(data.data);
		}

		return null;
	} catch (error) {

		return null;
	}
}

function parseInstagramData(
	data: Record<string, unknown>,
): InstagramPostData | null {
	try {
		const rawItem = data.shortcode_media || data.xdt_shortcode_media;
		if (!rawItem) {
			return null;
		}

		const getString = (obj: any, path: string): string => {
			try {
				const keys = path.split(".");
				let current = obj;
				for (const key of keys) {
					current = current?.[key];
				}
				return typeof current === "string" ? current : "";
			} catch {
				return "";
			}
		};

		const getNumber = (obj: any, path: string): number => {
			try {
				const keys = path.split(".");
				let current = obj;
				for (const key of keys) {
					current = current?.[key];
				}
				return typeof current === "number" ? current : 0;
			} catch {
				return 0;
			}
		};

		const item = rawItem as any;

		const username = getString(item, "owner.username");
		const caption = getString(item, "edge_media_to_caption.edges.0.node.text");
		const code = getString(item, "shortcode");
		const like_count = getNumber(item, "edge_media_preview_like.count");
		const comment_count = getNumber(item, "edge_media_to_comment.count");
		const taken_at = getNumber(item, "taken_at_timestamp");

		const media: InstagramMedia[] = [];
		const seenUrls = new Set<string>();

		if (item.edge_sidecar_to_children?.edges) {
			for (const edge of item.edge_sidecar_to_children.edges) {
				const node = edge.node;
				const videoUrl = getString(node, "video_url");
				const displayUrl = getString(node, "display_url");
				const primaryUrl = videoUrl || displayUrl;

				if (primaryUrl && !seenUrls.has(primaryUrl)) {
					const mediaItem: InstagramMedia = {
						typename: getString(node, "__typename") || "GraphImage",
						url: primaryUrl,
						video_url: videoUrl || undefined,
						display_url: displayUrl || undefined,
					};
					media.push(mediaItem);
					seenUrls.add(primaryUrl);
				}
			}
		} else {
			const videoUrl = getString(item, "video_url");
			const displayUrl = getString(item, "display_url");
			const primaryUrl = videoUrl || displayUrl;

			if (primaryUrl) {
				const mediaItem: InstagramMedia = {
					typename: getString(item, "__typename") || "GraphImage",
					url: primaryUrl,
					video_url: videoUrl || undefined,
					display_url: displayUrl || undefined,
				};
				media.push(mediaItem);
			}
		}

		return {
			username,
			caption,
			media,
			like_count,
			comment_count,
			taken_at,
			code,
		};
	} catch (error) {

		return null;
	}
}

function removeDuplicateResolutions(urls: string[]): string[] {
	const urlGroups = new Map<string, string[]>();

	for (const url of urls) {
		const baseMatch = url.match(
			/\/([0-9]+_[0-9]+(?:_[0-9]+)*_[a-z]+)\.(jpg|jpeg|png|webp)/i,
		);

		if (baseMatch) {
			const baseFilename = baseMatch[1];

			const hasSizeParam =
				url.includes("s640x640") ||
				url.includes("s750x750") ||
				url.includes("s1080x1080") ||
				url.includes("e15_fr_s") ||
				url.includes("s150x150") ||
				url.includes("s240x240");

			if (hasSizeParam) {
				const imageId = baseFilename;
				if (!urlGroups.has(imageId)) {
					urlGroups.set(imageId, []);
				}
				urlGroups.get(imageId)!.push(url);
			} else {
				const imageId = url;

				urlGroups.set(imageId, [url]);
			}
		} else {
			const imageId = url;

			urlGroups.set(imageId, [url]);
		}
	}

	const result: string[] = [];

	for (const [imageId, groupUrls] of urlGroups) {
		if (groupUrls.length === 1) {
			const url = groupUrls[0];

			const isProfilePicture =
				url.includes("t51.2885-19") &&
				(url.includes("s150x150") || url.includes("s240x240"));

			if (!isProfilePicture) {
				result.push(url);
			}
			continue;
		}

		const bestUrl = groupUrls.reduce((best, current) => {
			const isProfilePicture =
				current.includes("t51.2885-19") &&
				(current.includes("s150x150") || current.includes("s240x240"));
			if (isProfilePicture) {
				return best;
			}

			if (!best) {
				return current;
			}

			if (
				current.includes("s1080x1080") ||
				current.includes("e15_fr_s1080x1080")
			) {
				return current;
			}

			if (
				current.includes("s750x750") &&
				!best.includes("s1080x1080") &&
				!best.includes("e15_fr_s1080x1080")
			) {
				return current;
			}

			if (
				current.includes("s640x640") &&
				!best.includes("s750x750") &&
				!best.includes("s1080x1080") &&
				!best.includes("e15_fr_s1080x1080")
			) {
				return current;
			}

			if (
				(current.includes("s150x150") || current.includes("s240x240")) &&
				!best
			) {
				return current;
			}

			return best;
		});

		if (bestUrl) {
			result.push(bestUrl);
		}
	}

	return result;
}