import axios from "axios";
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { newPage } from "../puppeteer";

interface BioLink {
    link: string;
    risk: number;
}

interface CommerceUserInfo {
    commerceUser: boolean;
}

interface ProfileTab {
    showMusicTab: boolean;
    showQuestionTab: boolean;
    showPlayListTab: boolean;
}

interface TikTokUser {
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
    bioLink: BioLink;
    commentSetting: number;
    commerceUserInfo: CommerceUserInfo;
    duetSetting: number;
    stitchSetting: number;
    privateAccount: boolean;
    secret: boolean;
    isADVirtual: boolean;
    roomId: string;
    uniqueIdModifyTime: number;
    ttSeller: boolean;
    region: string;
    downloadSetting: number;
    profileTab: ProfileTab;
    followingVisibility: number;
    recommendReason: string;
    nowInvitationCardUrl: string;
    nickNameModifyTime: number;
    isEmbedBanned: boolean;
    canExpPlaylist: boolean;
    profileEmbedPermission: number;
    language: string;
    eventList: any[];
    suggestAccountBind: boolean;
    isOrganization: number;
    followerCount: number;
    followingCount: number;
    heart: number;
    heartCount: number;
    videoCount: number;
    diggCount: number;
    friendCount: number;
}

interface Extra {
    fatal_item_ids: string[];
    logid: string;
    now: number;
}

interface Author {
    avatarLarger: string;
    avatarMedium: string;
    avatarThumb: string;
    commentSetting: number;
    downloadSetting: number;
    duetSetting: number;
    ftc: boolean;
    id: string;
    isADVirtual: boolean;
    isEmbedBanned: boolean;
    nickname: string;
    openFavorite: boolean;
    privateAccount: boolean;
    relation: number;
    secUid: string;
    secret: boolean;
    signature: string;
    stitchSetting: number;
    uniqueId: string;
    verified: boolean;
}

interface AuthorStats {
    diggCount: number;
    followerCount: number;
    followingCount: number;
    friendCount: number;
    heart: number;
    heartCount: number;
    videoCount: number;
}

interface Challenges {
    coverLarger: string;
    coverMedium: string;
    coverThumb: string;
    desc: string;
    id: string;
    profileLarger: string;
    profileMedium: string;
    profileThumb: string;
    title: string;
}

interface TextExtra {
    awemeId: string;
    end: number;
    hashtagName: string;
    isCommerce: boolean;
    start: number;
    subType: number;
    type: number;
}

interface Contents {
    desc: string;
    textExtra: TextExtra[];
}

interface Item_control {
    can_repost: boolean;
}

interface Music {
    authorName: string;
    coverLarge: string;
    coverMedium: string;
    coverThumb: string;
    duration: number;
    id: string;
    original: boolean;
    playUrl: string;
    title: string;
}

interface Stats {
    collectCount: number;
    commentCount: number;
    diggCount: number;
    playCount: number;
    shareCount: number;
}

interface StatsV2 {
    collectCount: string;
    commentCount: string;
    diggCount: string;
    playCount: string;
    repostCount: string;
    shareCount: string;
}

interface PlayAddr {
    DataSize: number;
    FileCs: string;
    FileHash: string;
    Height: number;
    Uri: string;
    UrlKey: string;
    UrlList: string[];
    Width: number;
}

interface BitrateInfo {
    Bitrate: number;
    CodecType: string;
    GearName: string;
    MVMAF: string;
    PlayAddr: PlayAddr;
    QualityType: number;
}

interface CaptionInfo {
    captionFormat: string;
    claSubtitleID: string;
    expire: string;
    isAutoGen: boolean;
    isOriginalCaption: boolean;
    language: string;
    languageCode: string;
    languageID: string;
    subID: string;
    subtitleType: string;
    translationType: string;
    url: string;
    urlList: string[];
    variant: string;
}

interface OriginalLanguageInfo {
    canTranslateRealTimeNoCheck: boolean;
    language: string;
    languageCode: string;
    languageID: string;
}


interface ClaInfo {
    enableAutoCaption: boolean;
    hasOriginalAudio: boolean;
    noCaptionReason: number;
    captionInfos?: CaptionInfo[];
    captionsType?: number;
    originalLanguageInfo?: OriginalLanguageInfo;
}

interface VolumeInfo {
    Loudness: number;
    Peak: number;
}

interface ZoomCover {
    240: string;
    480: string;
    720: string;
    960: string;
}

interface SubtitleInfos {
    Format: string;
    LanguageCodeName: string;
    LanguageID: string;
    Size: number;
    Source: string;
    Url: string;
    UrlExpire: number;
    Version: string;
}



interface Video {
    VQScore: string;
    bitrate: number;
    bitrateInfo: BitrateInfo[];
    claInfo: ClaInfo;
    codecType: string;
    cover: string;
    definition: string;
    downloadAddr: string;
    duration: number;
    dynamicCover: string;
    encodeUserTag: string;
    encodedType: string;
    format: string;
    height: number;
    id: string;
    originCover: string;
    playAddr: string;
    ratio: string;
    subtitleInfos?: SubtitleInfos[];
    videoQuality: string;
    volumeInfo: VolumeInfo;
    width: number;
    zoomCover: ZoomCover;
}

interface ItemList {
    AIGCDescription: string;
    CategoryType: number;
    author: Author;
    authorStats: AuthorStats;
    backendSourceEventTracking: string;
    challenges: Challenges[];
    collected: boolean;
    contents: Contents[];
    createTime: number;
    desc: string;
    digged: boolean;
    diversificationId: number;
    duetDisplay: number;
    duetEnabled: boolean;
    forFriend: boolean;
    id: string;
    itemCommentStatus: number;
    item_control: Item_control;
    music: Music;
    officalItem: boolean;
    originalItem: boolean;
    privateItem: boolean;
    secret: boolean;
    shareEnabled: boolean;
    stats: Stats;
    statsV2: StatsV2;
    stitchDisplay: number;
    stitchEnabled: boolean;
    textExtra: TextExtra[];
    textLanguage: string;
    textTranslatable: boolean;
    video: Video;
}

interface Log_pb {
    impr_id: string;
}

export interface TikTokExploreResponse {
    cursor: string;
    extra: Extra;
    hasMore: boolean;
    itemList: ItemList[];
    log_pb: Log_pb;
    statusCode: number;
    status_code: number;
    status_msg: string;
}

interface TikTokRelatedResponse {
    cursor: string;
    extra: Extra;
    itemList: ItemList[];
    log_pb: Log_pb;
    statusCode: number;
    status_code: number;
    status_msg: string;
}

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));
export async function getTikTokTrending(count: number = 3) {
    try {
        const page = await newPage();
        await page.goto('https://www.tiktok.com/api/explore/item_list/?aid=2&browser_language=en-US&count=3&data_collection_enabled=false&history_len=4&region=US&tz_name=America%2FVirgin&user_is_login=true&device_id=1&categoryType=120&language=en', {
            waitUntil: 'networkidle2'
        })
        const content = await page.$('pre').then(e => e?.evaluate(node => node.textContent));
        await page.close();
        console.log(content)
        return JSON.parse(content) as TikTokExploreResponse;
    } catch (error) {
        console.error('Error fetching TikTok trending data:', error);
        throw error;
    }
}

export async function getTikTokVideoPlayAddr(video: Video) {
    return (await client.get(video.playAddr, {
        jar,
        responseType: 'arraybuffer'
    })).data
}

export async function getRelatedVideos(itemId: string, count: number = 12) {
    const url = 'https://www.tiktok.com/api/related/item_list/';
    const params = {
        itemID: itemId,
        aid: '1284',
        count: count
    };

    try {
        const response = await client.get<TikTokRelatedResponse>(url, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching related videos:', error);
        throw error;
    }
}

export async function getTikTokUser(username: string): Promise<TikTokUser | null> {
    try {
        const res = await client.get('https://www.tiktok.com/@' + username);
        const data = res.data as string;
        const lookFor = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">';
        const index = data.indexOf(lookFor);
        const index2 = data.indexOf('</script>', index);
        const json = data.substring(index + lookFor.length, index2);
        const obj = JSON.parse(json);
        return {
            ...obj["__DEFAULT_SCOPE__"]["webapp.user-detail"].userInfo.user,
            ...obj["__DEFAULT_SCOPE__"]["webapp.user-detail"].userInfo.stats,
        };
    } catch (e) { }
    return null;
}