import axios from "axios";
import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from "discord.js";
import numeral from "numeral";
import ICommand from "../../handler/interfaces/ICommand";



interface Video {
    id: string;
    height: number;
    width: number;
    duration: number;
    ratio: string;
    cover: string;
    originCover: string;
    dynamicCover: string;
    playAddr: string;
    downloadAddr: string;
    shareCover: string[];
    reflowCover: string;
    bitrate: number;
    encodedType: string;
    format: string;
    videoQuality: string;
    encodeUserTag: string;
    codecType: string;
    definition: string;
    subtitleInfos: any[];
    zoomCover: {
        [key: string]: string;
    };
    volumeInfo: {
        Loudness: number;
        Peak: number;
    };
    bitrateInfo: {
        Bitrate: number;
        QualityType: number;
        GearName: string;
        PlayAddr: {
            DataSize: string;
            Width: number;
            Height: number;
            Uri: string;
            UrlList: string[];
            UrlKey: string;
            FileHash: string;
            FileCs: string;
        };
        CodecType: string;
        MVMAF: string;
    }[];
    VQScore: string;
    claInfo: {
        hasOriginalAudio: boolean;
        enableAutoCaption: boolean;
        captionInfos: any[];
        noCaptionReason: number;
    };
}

interface Author {
    id: string;
    shortId: string;
    uniqueId: string;
    nickname: string;
    avatarLarger: string;
    avatarMedium: string;
    avatarThumb: string;
    signature: string;
    createTime: number;
    verified: boolean;
    secUid: string;
    ftc: boolean;
    relation: number;
    openFavorite: boolean;
    commentSetting: number;
    duetSetting: number;
    stitchSetting: number;
    privateAccount: boolean;
    secret: boolean;
    isADVirtual: boolean;
    roomId: string;
    uniqueIdModifyTime: number;
    ttSeller: boolean;
    downloadSetting: number;
    recommendReason: string;
    nowInvitationCardUrl: string;
    nickNameModifyTime: number;
    isEmbedBanned: boolean;
    canExpPlaylist: boolean;
    suggestAccountBind: boolean;
}

interface Music {
    id: string;
    title: string;
    playUrl: string;
    coverLarge: string;
    coverMedium: string;
    coverThumb: string;
    authorName: string;
    original: boolean;
    duration: number;
    album: string;
    scheduleSearchTime: number;
    collected: boolean;
    preciseDuration: {
        preciseDuration: number;
        preciseShootDuration: number;
        preciseAuditionDuration: number;
        preciseVideoDuration: number;
    };
}

interface Challenge {
    id: string;
    title: string;
    desc: string;
    profileLarger: string;
    profileMedium: string;
    profileThumb: string;
    coverLarger: string;
    coverMedium: string;
    coverThumb: string;
}

interface Stats {
    diggCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
    collectCount: string;
}

interface StatsV2 {
    diggCount: string;
    shareCount: string;
    commentCount: string;
    playCount: string;
    collectCount: string;
    repostCount: string;
}

interface TextExtra {
    awemeId: string;
    start: number;
    end: number;
    hashtagId: string;
    hashtagName: string;
    type: number;
    subType: number;
    isCommerce: boolean;
}

interface Content {
    desc: string;
    textExtra: any[];
}

interface ItemControl {
    can_repost: boolean;
}

interface TikTokVideo {
    id: string;
    desc: string;
    createTime: string;
    scheduleTime: number;
    video: Video;
    author: Author;
    music: Music;
    challenges: Challenge[];
    stats: Stats;
    statsV2: StatsV2;
    warnInfo: any[];
    originalItem: boolean;
    officalItem: boolean;
    textExtra: TextExtra[];
    secret: boolean;
    forFriend: boolean;
    digged: boolean;
    itemCommentStatus: number;
    takeDown: number;
    effectStickers: any[];
    privateItem: boolean;
    duetEnabled: boolean;
    stitchEnabled: boolean;
    stickersOnItem: any[];
    shareEnabled: boolean;
    comments: any[];
    duetDisplay: number;
    stitchDisplay: number;
    indexEnabled: boolean;
    diversificationLabels: string[];
    locationCreated: string;
    suggestedWords: string[];
    contents: Content[];
    diversificationId: number;
    collected: boolean;
    channelTags: any[];
    item_control: ItemControl;
    IsAigc: boolean;
    AIGCDescription: string;
    backendSourceEventTracking: string;
}

export default {
    description: 'Tiktok commands',
    type: 'all',
    options: [
        {
            name: 'repost',
            description: 'Repost a video from tiktok',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'url',
                    description: 'Tiktok video URL',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        }
    ],
    slashOnly: true,
    execute: async ({ interaction }) => {
        if (!interaction) return;
        await interaction.deferReply();
        const subCommand = interaction?.options.getSubcommand();
        switch (subCommand) {
            case 'repost':
                const url = interaction.options.getString('url');
                if (!url) return interaction.reply('Please provide a Tiktok video URL');
                if (!url.startsWith('https://www.tiktok.com/') && !url.includes('video'))
                    return {
                        ephemeral: true,
                        content: 'Invalid Tiktok video URL'
                    }

                const res = await axios.get(url)
                const { data, headers } = res;
                const lookFor = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">';
                const start = data.indexOf(lookFor);
                const end = data.indexOf('</script>', start);
                if (start === -1 || end === -1) return {
                    ephemeral: true,
                    content: 'Failed to find video data'
                }
                const json = data.slice(start + lookFor.length, end);
                let parsed;
                try {
                    parsed = JSON.parse(json);
                } catch (e) {
                    return {
                        ephemeral: true,
                        content: 'Failed to parse video data'
                    }
                }
                const video: TikTokVideo = parsed['__DEFAULT_SCOPE__']['webapp.video-detail'].itemInfo.itemStruct;
                const cookies = headers['set-cookie'] ? headers['set-cookie'].map((cookie: string) => cookie.split(';')[0]).join('; ') : '';
                const { data: videoData } = await axios.get(video.video.playAddr, {
                    headers: {
                        'cookie': cookies
                    },
                    responseType: 'arraybuffer'
                });
                return {
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: video.author.nickname, iconURL: video.author.avatarLarger, url: `https://www.tiktok.com/@${video.author.uniqueId}` })
                            .setDescription(video.desc)
                            .setFooter({ text: `Likes: ${numeral(video.statsV2.diggCount).format('0,0')} | Comments: ${numeral(video.statsV2.commentCount).format('0,0')} | Shares: ${numeral(video.statsV2.shareCount).format('0,0')}` })
                            .setColor('Random')
                            .setTimestamp(parseInt(video.createTime) * 1000)
                    ],
                    files: [
                        new AttachmentBuilder(Buffer.from(videoData), { name: 'video.mp4' })
                    ]
                }
        }
    }
} as ICommand