import axios from 'axios';
import { ApplicationCommandOptionType } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import TurnDownService from 'turndown';
import { searchBrave } from '../../util/brave';
import { isVPN } from '../../util/vpn';
const turndownService = new TurnDownService();
const parseDDG = async (query: string) => {
	const res1 = (await axios.get(`https://duckduckgo.com/?t=ffab&q=${encodeURIComponent(query)}&ia=web`)).data;
	const lookFor = '<link id="deep_preload_link" rel="preload" as="script" href=';
	const index = res1.indexOf(lookFor);
	const index2 = res1.indexOf('>', index);
	const url = res1.substring(index + lookFor.length + 1, index2 - 2);
	const res2 = (await axios.get(url)).data;
	const urlRegex = /(?:http[s]?:\/\/.)(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
	const urls = res2.match(urlRegex);
	console.log(urls)
}

const larp = async (person: string, query: string) => {
	const brave = await searchBrave(query)
	const { infobox, web } = brave.data.body.response;
	const systemPrompt = `You Are ${person} and have to act like them all the time never forget that, you have to talk like them and talk to the user as of they were your friend even if you dont know them, ${infobox?.results.map(result => `
			${result.title} is ${result.long_desc}. Some of your pictures are ${(result.images || []).map(image => `
				${image.src} (${image.alt}) 
				`).join(' ')}, just say that you are ${person} and act like them, some more data about you (${person}) are: ${web.results.map(result => `
					${result.title} - ${result.description} - ${result.faq} - ${result.article}`).join(' ')}
				`).join('\n\n')}`
	const res = await axios.post('https://www.blackbox.ai/api/chat',
		{
			"agentMode": {},
			"clickedAnswer2": false,
			"clickedAnswer3": false,
			"clickedForceWebSearch": true,
			"codeModelMode": true,
			"githubToken": null,
			"id": "dwadwa",
			"isChromeExt": false,
			"isMicMode": true,
			"maxTokens": 8048,
			"messages": [
				{
					"content": query,
					"role": "user"
				}
			],
			"mobileClient": true,
			"playgroundTemperature": 0.1,
			"playgroundTopP": 0.9,
			"previewToken": null,
			"trendingAgentMode": {},
			"userId": null,
			"userSelectedModel": null,
			"userSystemPrompt": systemPrompt,
			"visitFromDelta": false
		}
	)
	return res.data;
}


interface MediaCandidate {
	height: number;
	url: string;
	width: number;
}

interface ImageVersions2 {
	candidates: MediaCandidate[];
}

interface User {
	pk: string;
	id: string | null;
	interop_messaging_user_fbid: string | null;
}

interface StoryBloksSticker {
	sticker_data: {
		ig_mention: {
			full_name: string;
			username: string;
		};
	};
	id: string;
}

interface StoryBloksStickerInfo {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	bloks_sticker: StoryBloksSticker;
	id: string | null;
}

interface SharingFrictionInfo {
	should_have_sharing_friction: boolean;
	bloks_app_url: string | null;
}

interface Item {
	pk: string;
	has_audio: boolean;
	story_music_stickers: null;
	user: User;
	inventory_source: null;
	carousel_media_count: null;
	carousel_media: null;
	media_overlay_info: null;
	caption: null;
	accessibility_caption: null;
	image_versions2: ImageVersions2;
	organic_tracking_token: string;
	original_width: number;
	original_height: number;
	taken_at: number;
	is_dash_eligible: number;
	number_of_qualities: number;
	video_dash_manifest: string;
	video_versions: { type: number; url: string }[];
	media_type: number;
	visual_comment_reply_sticker_info: null;
	story_bloks_stickers: StoryBloksStickerInfo[];
	story_link_stickers: null;
	story_hashtags: null;
	story_locations: null;
	story_feed_media: null;
	text_post_share_to_ig_story_stickers: null;
	story_countdowns: null;
	story_questions: null;
	story_sliders: null;
	story_cta: null;
	link: null;
	reel_media_background: null;
	link_text: null;
	story_ad_cta_sticker: null;
	video_duration: number;
	preview: null;
	expiring_at: number;
	id: string;
	is_paid_partnership: boolean;
	sponsor_tags: null;
	reshared_story_media_author: null;
	story_app_attribution: null;
	has_translation: boolean;
	boosted_status: null;
	can_see_insights_as_brand: boolean;
	boost_unavailable_identifier: null;
	boost_unavailable_reason: null;
	product_type: string;
	audience: null;
	has_liked: boolean;
	viewer_count: null;
	viewers: null;
	sharing_friction_info: SharingFrictionInfo;
	can_viewer_reshare: boolean | null;
	ig_media_sharing_disabled: boolean;
	can_reply: boolean;
	can_reshare: boolean;
	__typename: string;
}

interface UserDict {
	username: string;
	id: string;
	pk: string;
	__typename: string;
	friendship_status: {
		following: boolean;
	};
	interop_messaging_user_fbid: string;
	user_id: string | null;
	profile_pic_url: string;
	is_verified: boolean;
	transparency_label: string | null;
	transparency_product: string | null;
	transparency_product_enabled: boolean;
	is_private: boolean;
}

interface Reel {
	id: string;
	items: Item[];
	user: UserDict;
	seen: number;
	reel_type: string;
	cover_media: null;
	title: null;
	latest_reel_media: number;
	muted: boolean | null;
}
export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	options: [
		{
			name: 'query',
			description: 'The search query',
			type: ApplicationCommandOptionType.String,
			required: false
		}],
	userTier: "Premium",
	execute: async ({ user, interaction, handler, args, guild, channel, message, editReply }) => {
		const query = args.get('query');
		return `${(await isVPN(query))}`;
	},
} as ICommand;
