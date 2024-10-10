import { loadImage } from "@napi-rs/canvas";
import axios from "axios";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { filesize } from "filesize";
import numeral from "numeral";
import ICommand from "../../handler/interfaces/ICommand";
import { getEmoji } from "../../util/emojis";
import { getTwoMostUsedColors } from "../../util/util";
interface User {
    avatar: string;
    banned: boolean;
    bio: string;
    contributor: boolean;
    created_at: string;
    id: string;
    invited_by: User | null;
    private_profile: boolean;
    rank: string;
    storage_used: number;
    uid: number;
    uploads: number;
    username: string;
}

function captitalizeString(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

interface BioLink {
    link: string;
    risk: number;
}

interface CommerceUserInfo {
    commerceUser: boolean;
    downLoadLink: {
        android: string;
        ios: string;
    };
    category: string;
    categoryButton: boolean;
}

interface ProfileTab {
    showMusicTab: boolean;
    showQuestionTab: boolean;
    showPlayListTab: boolean;
}

interface User {
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
}

interface Stats {
    followerCount: number;
    followingCount: number;
    heart: number;
    heartCount: number;
    videoCount: number;
    diggCount: number;
    friendCount: number;
}

interface UserInfo {
    user: User;
    stats: Stats;
    itemList: any[];
}

interface ShareMeta {
    title: string;
    desc: string;
}

interface TikTokResponse {
    userInfo: UserInfo;
    shareMeta: ShareMeta;
    statusCode: number;
    statusMsg: string;
    needFix: boolean;
}

export default {
    description: 'Lookup a user in a service',
    // slashOnly: true,
    options: [
        {
            name: 'service',
            description: 'The service to lookup the user in',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'nest.rip',
                    value: 'nest.rip'
                },
                {
                    name: 'tiktok',
                    value: 'tiktok'
                }
            ]
        },
        {
            name: 'query',
            description: 'What to use to search for the user (username, id, etc.)',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    type: 'all',
    execute: async ({ args }) => {
        const service = args.get('service') as string;
        const query = args.get('query') as string;
        if (!service) return { ephemeral: true, content: `Please provide a service to lookup the user in.` };
        if (!query) return { ephemeral: true, content: `Please provide a query to search for the user.` };
        switch (service) {
            case 'nest.rip':
                const response = await axios.get(`https://nest.rip/${query}`);
                const html = response.data;
                const regex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/;
                const match = html.match(regex);
                if (!match) {
                    return {
                        ephemeral: true,
                        content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                    }
                }
                const nData = JSON.parse(match[1]);
                const nUser: User = nData.props.pageProps.user;
                if (!nUser || !nUser.created_at) {
                    return {
                        ephemeral: true,
                        content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                    }
                }
                if (nUser && nUser.private_profile) return {
                    ephemeral: true,
                    content: `This user has a private profile.`
                }
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${nUser.username} ${nUser.banned ? '(Banned)' : ''}`, url: `https://nest.rip/${nUser.id}`, iconURL: nUser.avatar ? `https://cdn.nest.rip/avatars/${nUser.avatar}` : undefined })
                            .setThumbnail(nUser.avatar ? `https://cdn.nest.rip/avatars/${nUser.avatar}` : null)
                            .addFields([
                                { name: 'ID', value: nUser.uid.toString(), inline: true },
                                { name: 'Rank', value: captitalizeString(nUser.rank), inline: true },
                                { name: 'Contributor', value: nUser.contributor ? 'Yes' : 'No', inline: true },
                                // { name: 'Banned', value: nUser.banned ? 'Yes' : 'No', inline: true },
                                { name: 'Storage Used', value: filesize(nUser.storage_used), inline: true },
                                { name: 'Uploads', value: numeral(nUser.uploads).format('0,0'), inline: true },
                            ])
                            .setDescription(nUser.bio)
                            .setFooter({
                                text: `Invited by ${nUser.invited_by ? nUser.invited_by.username ?? 'No one' : 'No one'}`,
                            })
                            .setColor(nUser.avatar ? ((await getTwoMostUsedColors(await loadImage(`https://cdn.nest.rip/avatars/${nUser.avatar}`)))[0]) : 'Random')
                            .setTimestamp(new Date(nUser.created_at))
                    ]
                }
            case 'tiktok':
                const res = await axios.get(`https://socials.evade.rest/experiments/tiktok?user=${query}`);
                const tiktokData = res.data;
                if (!tiktokData) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const data: TikTokResponse = tiktokData;
                if (data.statusCode != 0) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\` (1)`
                }
                const embed = new EmbedBuilder()
                    // .setAuthor({ name: data.userInfo.user.nickname, url: `https://www.tiktok.com/@${data.userInfo.user.uniqueId}`, iconURL: data.userInfo.user.avatarThumb })
                    .setTitle(`${data.userInfo.user.nickname} ${data.userInfo.user.verified ? getEmoji('verified').toString() : ''}`)
                    .setURL(`https://www.tiktok.com/@${data.userInfo.user.uniqueId}`)
                    .setThumbnail(data.userInfo.user.avatarLarger)
                    .addFields([
                        // { name: 'Username', value: data.userInfo.user.uniqueId, inline: true },
                        { name: 'Followers', value: numeral(data.userInfo.stats.followerCount).format('0,0'), inline: true },
                        { name: 'Following', value: numeral(data.userInfo.stats.followingCount).format('0,0'), inline: true },
                        { name: 'Friends', value: numeral(data.userInfo.stats.friendCount).format('0,0'), inline: true },
                        { name: 'Hearts', value: numeral(data.userInfo.stats.heart).format('0,0'), inline: true },
                        { name: 'Videos', value: numeral(data.userInfo.stats.videoCount).format('0,0'), inline: true },
                        // { name: 'Verified', value: data.userInfo.user.verified ? 'Yes' : 'No', inline: true },
                    ])
                    .setDescription(data.userInfo.user.signature || 'No bio')
                    .setColor(data.userInfo.user.avatarLarger ? (await getTwoMostUsedColors(await loadImage(data.userInfo.user.avatarLarger)))[0] : 'Random')
                    .setTimestamp(new Date(data.userInfo.user.createTime * 1000))
                    .setFooter({ text: 'Account created on' })
                return {
                    embeds: [
                        embed
                    ]
                }
            default:
                return { ephemeral: true, content: `I'm sorry, but the service "${service}" is not yet supported.` };
        }
    }
} as ICommand