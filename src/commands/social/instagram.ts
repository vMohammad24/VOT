import axios from 'axios';
import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import numeral from 'numeral';
import type ICommand from '../../handler/interfaces/ICommand';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';
import { launchPuppeteer, newPage } from '../../util/puppeteer';


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
interface Media {
    code: string;
    pk: string;
    actor_fbid: string | null;
    has_liked: boolean;
    comments_disabled: boolean | null;
    like_count: number;
    user: User;
    product_type: string;
    view_count: number | null;
    like_and_view_counts_disabled: boolean;
    owner: Owner;
    id: string;
    organic_tracking_token: string;
    inventory_source: string;
    logging_info_token: string;
    clips_metadata: ClipsMetadata;
    comment_count: number;
    taken_at: number;
    caption: Caption;
    media_type: number;
    commenting_disabled_for_viewer: boolean | null;
    can_reshare: boolean | null;
    can_viewer_reshare: boolean;
    audience: string | null;
    ig_media_sharing_disabled: boolean;
    carousel_media: any[] | null;
    image_versions2: ImageVersions2;
    media_overlay_info: any | null;
    share_urls: any | null;
    saved_collection_ids: string[] | null;
    has_viewer_saved: boolean | null;
    original_height: number;
    original_width: number;
    is_dash_eligible: number;
    number_of_qualities: number;
    video_dash_manifest: string;
    video_versions: VideoVersion[];
    has_audio: boolean;
    creative_config: any | null;
    usertags: any | null;
    location: any | null;
    clips_attribution_info: any | null;
    invited_coauthor_producers: any[];
    carousel_media_count: number | null;
    preview: any | null;
    __typename: string;
}

interface User {
    pk: string;
    username: string;
    profile_pic_url: string;
    id: string;
    is_verified: boolean;
    is_unpublished: boolean;
    is_private: boolean;
    friendship_status: any | null;
}

interface Owner {
    pk: string;
    username: string;
    id: string;
}

interface ClipsMetadata {
    music_info: any | null;
    original_sound_info: OriginalSoundInfo;
}

interface OriginalSoundInfo {
    audio_asset_id: string;
    ig_artist: IGArtist;
    consumption_info: ConsumptionInfo;
    original_audio_title: string;
    is_explicit: boolean;
}

interface IGArtist {
    profile_pic_url: string;
    id: string;
    username: string;
}

interface ConsumptionInfo {
    should_mute_audio_reason_type: any | null;
    is_trending_in_clips: boolean;
}

interface Caption {
    text: string;
    pk: string;
    has_translation: boolean | null;
}

interface ImageVersions2 {
    candidates: Candidate[];
}

interface Candidate {
    height: number;
    url: string;
    width: number;
}

interface VideoVersion {
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
const browser = await launchPuppeteer();
export default {
    description: "Reposts a post from instagram using it's url",
    type: 'all',
    cooldown: 60000,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'trending',
            description: 'Get a trending post from instagram',
        },
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
        interaction?.deferReply();
        switch (interaction.options.getSubcommand()) {
            case 'repost': {
                const url = interaction.options.getString('url', true);
                const heartEmoji = getEmoji('heart')
                const likeEmoji = getEmoji('like')
                const res = await axios.get('https://socials.evade.rest/experiments/reel?url=' + url, {
                    headers: {
                        'Authorization': process.env.OTHER_EVADE_API_KEY
                    }
                });
                const media = res.data as IJsonResponse;
                if (!media) return { content: 'No data found', ephemeral: true };
                const embed = new EmbedBuilder()
                    .setTitle(media.caption?.text.substring(0, 256) || 'No Caption')
                    .setURL(`https://www.instagram.com/p/${media.code}`)
                    .setAuthor({ name: media.user.username, iconURL: media.user.profile_pic_url })
                    .setThumbnail(media.image_versions2.candidates[0].url)
                    // .addFields(
                    //     { name: 'Likes', value: numeral(data.like_count).format('0,0'), inline: true },
                    //     { name: 'Comments', value: numeral(data.comment_count).format('0,0'), inline: true },
                    //     { name: 'Views', value: numeral(data.view_count!).format('0,0') || 'N/A', inline: true },
                    // )
                    .setDescription(
                        `## ${getEmoji('like').toString()} ${numeral(media.like_count).format('0,0')}\n## ${getEmoji('chat').toString()} ${numeral(media.comment_count).format('0,0')}`
                    )
                    .setTimestamp(new Date(media.taken_at * 1000))
                    .setFooter({ text: 'Uploaded' });

                const videoUrl = media.video_versions[0]?.url;
                if (videoUrl) {
                    const attachment = new AttachmentBuilder(videoUrl, { name: `VOT_Instagram_Repost.mp4` });
                    return { embeds: [embed], files: [attachment] };
                } else {
                    return { embeds: [embed] };
                }
            }
            case 'trending': {
                const lookFor = '{"require":[["ScheduledServerJS","handle",null,[{"__bbox":{"require":'
                const page = await newPage();
                const res = await page.goto('https://www.instagram.com/reels/')//await axios.get('https://www.instagram.com/reels/')
                const data = await res!.content();
                page.close();
                const body = Buffer.from(data).toString('utf-8');
                const index = body.indexOf(lookFor)
                const endIndex = body.indexOf('</script>', index)
                const json = JSON.parse(lookFor + body.slice(index + lookFor.length, endIndex));
                const vids: Media[] = [];
                const edges = json.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.xdt_api__v1__clips__clips_on_logged_out_connection_v2.edges;
                for (const edge of edges) {
                    const media = edge.node.media;
                    vids.push(media);
                }
                await pagination({
                    interaction,
                    type: 'select',
                    name: 'Select a reel',
                    pages: vids.map((vid) => ({
                        name: vid.caption.text.slice(0, 100),
                        page: {
                            embeds: [new EmbedBuilder()
                                // .setTitle(vid.caption.text.slice(0, 256))
                                // .setImage(vid.image_versions2.candidates[0].url)
                                .setURL(`https://www.instagram.com/reels/${vid.code}`)
                                .setAuthor({
                                    name: vid.user.username,
                                    iconURL: vid.user.profile_pic_url,
                                    url: `https://www.instagram.com/${vid.owner.username}`
                                })
                                .addFields([{
                                    name: 'Likes',
                                    value: numeral(vid.like_count).format('0,0'),
                                    inline: true
                                }, {
                                    name: 'Comments',
                                    value: numeral(vid.comment_count).format('0,0'),
                                    inline: true
                                }])
                                .setFooter({ text: 'Uploaded' })
                                .setTimestamp(new Date(vid.taken_at * 1000))],
                            files: [new AttachmentBuilder(vid.video_versions[0].url, { name: 'VOT-IG-Trending.mp4' })]
                        },
                    }))
                })
            }
        }
    },
} as ICommand;
