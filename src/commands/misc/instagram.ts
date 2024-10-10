import axios from 'axios';
import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import numeral from 'numeral';
import type ICommand from '../../handler/interfaces/ICommand';
import { getEmoji } from '../../util/emojis';


interface IUser {
    pk: string;
    username: string;
    profile_pic_url: string;
    id: string;
    is_verified: boolean;
    is_unpublished: boolean;
    is_private: boolean;
    friendship_status: any;
}

interface IOriginalSoundInfo {
    audio_asset_id: string;
    ig_artist: IUser;
    consumption_info: {
        should_mute_audio_reason_type: any;
        is_trending_in_clips: boolean;
    };
    original_audio_title: string;
    is_explicit: boolean;
}

interface IClipsMetadata {
    music_info: any;
    original_sound_info: IOriginalSoundInfo;
}

interface ICandidate {
    height: number;
    url: string;
    width: number;
}

interface IImageVersions2 {
    candidates: ICandidate[];
}

interface ICaption {
    text: string;
    pk: string;
    has_translation: any;
}

interface IVideoVersion {
    type: number;
    url: string;
}

interface IHeaders {
    Accept: string;
    "Accept-Language": string;
    "Cache-Control": string;
    Dnt: string;
    Dpr: string;
    Pragma: string;
    Priority: string;
    "Sec-Ch-Prefers-Color-Scheme": string;
    "Sec-Ch-Ua": string;
    "Sec-Ch-Ua-Full-Version-List": string;
    "Sec-Ch-Ua-Mobile": string;
    "Sec-Ch-Ua-Model": string;
    "Sec-Ch-Ua-Platform": string;
    "Sec-Ch-Ua-Platform-Version": string;
    "Sec-Fetch-Dest": string;
    "Sec-Fetch-Mode": string;
    "Sec-Fetch-Site": string;
    "Sec-Fetch-User": string;
    "Upgrade-Insecure-Requests": string;
    "User-Agent": string;
    "Viewport-Width": string;
    cookie: string;
}

interface IRaw {
    bytes: string;
}

interface IJsonResponse {
    code: string;
    pk: string;
    actor_fbid: any;
    has_liked: boolean;
    comments_disabled: any;
    like_count: number;
    user: IUser;
    product_type: string;
    view_count: any;
    like_and_view_counts_disabled: boolean;
    owner: IUser;
    id: string;
    organic_tracking_token: string;
    clips_metadata: IClipsMetadata;
    comment_count: number;
    taken_at: number;
    caption: ICaption;
    media_type: number;
    commenting_disabled_for_viewer: any;
    can_reshare: any;
    can_viewer_reshare: boolean;
    audience: any;
    ig_media_sharing_disabled: boolean;
    inventory_source: string;
    logging_info_token: string;
    carousel_media: any;
    image_versions2: IImageVersions2;
    media_overlay_info: any;
    share_urls: any;
    saved_collection_ids: any;
    has_viewer_saved: any;
    original_height: number;
    original_width: number;
    is_dash_eligible: number;
    number_of_qualities: number;
    video_dash_manifest: string;
    video_versions: IVideoVersion[];
    has_audio: boolean;
    creative_config: any;
    usertags: any;
    location: any;
    clips_attribution_info: any;
    invited_coauthor_producers: any[];
    carousel_media_count: any;
    preview: any;
    headers: IHeaders;
    raw: IRaw;
}
export default {
    description: "Reposts a post from instagram using it's url",
    type: 'all',
    cooldown: 60000,
    options: [
        // {
        //     type: ApplicationCommandOptionType.Subcommand,
        //     name: 'trending',
        //     description: 'Get a trending post from instagram',
        // },
        {
            name: 'repost',
            description: 'Repost a post from instagram',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'url',
                    description: 'The URL of the instagram post',
                    required: true,
                }
            ]
        }
    ],
    aliases: ['ig', 'insta'],
    slashOnly: true,
    execute: async ({ interaction }) => {
        if (!interaction) return;
        switch (interaction.options.getSubcommand()) {
            case 'repost': {
                const url = interaction.options.getString('url', true);
                interaction?.deferReply();
                const heartEmoji = getEmoji('heart')
                const likeEmoji = getEmoji('like')
                const res = await axios.get('https://socials.evade.rest/experiments/reel?url=' + url);
                const data = res.data as IJsonResponse;
                if (!data) return { content: 'No data found', ephemeral: true };
                const embed = new EmbedBuilder()
                    .setTitle(data.caption?.text.substring(0, 256) || 'No Caption')
                    .setURL(url)
                    .setAuthor({ name: data.user.username, iconURL: data.user.profile_pic_url })
                    .setThumbnail(data.image_versions2.candidates[0].url)
                    // .addFields(
                    //     { name: 'Likes', value: numeral(data.like_count).format('0,0'), inline: true },
                    //     { name: 'Comments', value: numeral(data.comment_count).format('0,0'), inline: true },
                    //     { name: 'Views', value: numeral(data.view_count!).format('0,0') || 'N/A', inline: true },
                    // )
                    .setDescription(
                        `## ${getEmoji('like').toString()} ${numeral(data.like_count).format('0,0')}\n## ${getEmoji('chat').toString()} ${numeral(data.comment_count).format('0,0')}`
                    )
                    .setTimestamp(new Date(data.taken_at * 1000))
                    .setFooter({ text: 'Taken at' });

                const videoUrl = data.video_versions[0]?.url;
                if (videoUrl) {
                    const attachment = new AttachmentBuilder(videoUrl, { name: `VOT_Instagram_Repost.mp4` });
                    return { embeds: [embed], files: [attachment] };
                } else {
                    return { embeds: [embed] };
                }
            }
            case 'trending': {
                const res = await axios.get('https://www.instagram.com/reels/DAV2HDcPYpU/');
                if (res.status != 200) return {
                    content: 'Failed to fetch data',
                    ephemeral: true,
                }
                const data = (res.data as string);
                const regex = /<script[^>]*>\s*\{.*?"require":\[\[.*?"__bbox":\{.*?\}\]\].*?\}\s*<\/script>/gs;
                const match = data.match(regex);
                if (!match) return {
                    content: 'Failed to find data',
                    ephemeral: true,
                }
                // const json = JSON.parse(match[0].replace(/<script[^>]*>/, '').replace('</script>', ''));
                console.log(match[0]);
                return {
                    ephemeral: true,
                    content: 'hi'
                }
            }
        }
    },
} as ICommand;
