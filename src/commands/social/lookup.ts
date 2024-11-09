import { loadImage } from "@napi-rs/canvas";
import axios from "axios";
import { ApplicationCommandOptionType, ColorResolvable, EmbedBuilder } from "discord.js";
import numeral from "numeral";
import ICommand from "../../handler/interfaces/ICommand";
import { addEmojiByURL, getEmoji } from "../../util/emojis";
import { getTwoMostUsedColors, isNullish } from "../../util/util";

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
    return (string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()).replace(/_/g, ' ');
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

interface Badge {
    tooltip: string;
    url: string;
}

interface RangeUser {
    username: string;
    display_name: string;
    background_color: string;
    description: string;
    avatar: string;
    background: string;
    audio: string;
    uid: string;
    view_count: string;
    discord_id: string;
    created_at: string;
    badges: Badge[];
}

interface BiographyUser {
    id: number;
    username: string;
    created_at: string;
    bio: string;
    aboutme: string;
    invite_code: string;
    invited_by: string;
    avatar?: string;
    banner?: string;
}



interface DeathUser {
    username: string;
    uid: number;
    description: string;
    avatarUrl: string;
    views: number;
    premium: boolean;
    joined_at: number;
    alias: string;
    badges: {
        name: string;
        url: string;
        id: string;
        toggle: boolean;
    }[];
    discord_id: string;
    discord_username: string;
    backgroundUrl: string;
    audioUrl: string;
    cursorUrl: string;
}




interface DiscordConnection {
    id: string;
    userId: string;
    discordId: string;
    displayName: string;
    username: string;
    avatar: string;
    connectedAt: string;
    nitro: boolean;
}

interface Customization {
    id: string;
    bioId: string;
    joinDate: boolean;
    branding: boolean;
    nsfw: boolean;
    forceNsfw: boolean;
    avatar: boolean;
    badges: boolean;
    metaDescription: string;
    metaTitle: string;
    metaThemeColor: ColorResolvable;
    metaFavicon: string;
}

interface ProfileButton {
    id: string;
    type: string;
    value: string;
    bioId: string;
}

interface Component {
    id: string;
    parentId: string | null;
    type: string;
    position: number;
    textValue: string | null;
    textSize: number;
    textPosition: string;
    textWeight: number;
    imageSize: number;
    url: string;
    title: string | null;
    bioId: string;
    visibleOn: string;
    integration: Integration | null;
}

interface Integration {
    id: string;
    type: string;
    bioId: string;
    componentId: string;
}

interface Bio {
    avatarURL: string;
    customization: Customization;
    bannerURL: string;
    description: string;
    profileButtons: ProfileButton[];
    components: Component[];
    displayName: string;
    location: string;
    education: string;
    jobTitle: string;
    id: string;
}

interface SoclUser {
    status_code: number;
    username: string;
    roles: string[];
    id: string;
    banned: boolean;
    discordConnection: DiscordConnection;
    createdAt: string;
    plan: string;
    bio: Bio;
}

interface AmmoUser {
    uid: number;
    username: string;
    alias: string;
    profile_views: number;
    premium: boolean;
    url: string;
    created: string;
    created_formatted: string;
    background_url: string;
    audio_url: string;
    cursor_url: string;
    avatar_url: string;
    description: string;
}

interface SoclUserResponse {
    props: {
        pageProps: {
            user: SoclUser;
        };
        referer: string;
    };
    __N_SSP: boolean;
    page: string;
    query: {
        username: string;
    };
    buildId: string;
    isFallback: boolean;
    isExperimentalCompile: boolean;
    gssp: boolean;
    scriptLoader: any[];
}


export interface Socials {
    social: string;
    value: string;
    id: string;
}

export interface Second_tab {
    discord: string;
}

export interface Premium {
    cursor_effects: string;
    font: string;
    page_enter_text: string;
    hide_badges: boolean;
    hide_views: boolean;
    effects_color: string;
    badge_color: string;
    monochrome_badges: boolean;
    layout: string;
    second_tab: Second_tab;
    buttons: string[];
    show_url: boolean;
    text_align: string;
    button_shadow: boolean;
    button_border_radius: number;
    typewriter: string[];
    typewriter_enabled: boolean;
    banner: string;
    border_width: number;
    border_radius: number;
    border_color: string;
    border_enabled: boolean;
    second_tab_enabled: boolean;
}

export interface Config {
    socials: Socials[];
    description: string;
    url: string;
    audio: string;
    avatar: string;
    color: string;
    text_color: string;
    bg_color: string;
    gradient_1: string;
    gradient_2: string;
    presence: string;
    monochrome: boolean;
    animated_title: boolean;
    custom_cursor: string;
    page_views: number;
    user_badges: string[];
    custom_badges: string[][];
    display_name: string;
    profile_gradient: boolean;
    background_effects: string;
    volume_control: boolean;
    premium: Premium;
    blur: number;
    opacity: number;
    username_effects: string;
    use_discord_avatar: boolean;
    badge_glow: boolean;
    username_glow: boolean;
    swap_colors: boolean;
    icon_color: string;
    social_glow: boolean;
}

export interface GunsUser {
    username: string;
    account_created: number;
    verified: boolean;
    alias: string;
    config: Config;
    premium: boolean;
    uid: number;
    error: boolean;
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
            choices: ['nest.rip', 'guns.lol', 'inject.bio', 'death.ovh', 'socl.gg', 'biography', 'tiktok'].map((service) => ({ name: service, value: service }))
        },
        {
            name: 'query',
            description: 'What to use to search for the user (username, id, etc.)',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    type: 'all',
    execute: async ({ args, handler, interaction }) => {
        const service = args.get('service') as string;
        const query = args.get('query') as string;
        if (!service) return { ephemeral: true, content: `Please provide a service to lookup the user in.` };
        if (!query) return { ephemeral: true, content: `Please provide a query to search for the user.` };
        await interaction?.deferReply();
        const ems = await handler.client.application?.emojis.fetch();
        const regex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/;
        switch (service) {
            case 'nest.rip':
                const response = await axios.get(`https://nest.rip/${query}`);
                const html = response.data;
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
                                { name: 'Storage Used', value: numeral(nUser.storage_used).format('0.00b'), inline: true },
                                { name: 'Uploads', value: numeral(nUser.uploads).format('0,0'), inline: true },
                            ])
                            .setDescription((!nUser || !nUser.bio || nUser.bio.trim() == '') ? null : nUser.bio)
                            .setFooter({
                                text: `Invited by ${nUser.invited_by ? nUser.invited_by.username ?? 'No one' : 'No one'}`,
                            })
                            .setColor(nUser.avatar ? ((getTwoMostUsedColors(await loadImage(`https://cdn.nest.rip/avatars/${nUser.avatar}`)))[0]) : 'Random')
                            .setTimestamp(new Date(nUser.created_at))
                    ]
                }
            case 'tiktok':
                const tRes = await axios.get(`https://socials.evade.rest/experiments/tiktok?user=${query}`, {
                    headers: {
                        'Authorization': import.meta.env.OTHER_EVADE_API_KEY
                    }
                });
                const tiktokData = tRes.data;
                if (!tiktokData) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const tData: TikTokResponse = tiktokData;
                if (tData.statusCode != 0) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\` (1)`
                }
                const embed = new EmbedBuilder()
                    // .setAuthor({ name: data.userInfo.user.nickname, url: `https://www.tiktok.com/@${data.userInfo.user.uniqueId}`, iconURL: data.userInfo.user.avatarThumb })
                    .setTitle(`${tData.userInfo.user.nickname} ${tData.userInfo.user.verified ? getEmoji('verified').toString() : ''}`)
                    .setURL(`https://www.tiktok.com/@${tData.userInfo.user.uniqueId}`)
                    .setThumbnail(tData.userInfo.user.avatarLarger)
                    .addFields([
                        // { name: 'Username', value: data.userInfo.user.uniqueId, inline: true },
                        { name: 'Followers', value: numeral(tData.userInfo.stats.followerCount).format('0,0'), inline: true },
                        { name: 'Following', value: numeral(tData.userInfo.stats.followingCount).format('0,0'), inline: true },
                        { name: 'Friends', value: numeral(tData.userInfo.stats.friendCount).format('0,0'), inline: true },
                        { name: 'Hearts', value: numeral(tData.userInfo.stats.heart).format('0,0'), inline: true },
                        { name: 'Videos', value: numeral(tData.userInfo.stats.videoCount).format('0,0'), inline: true },
                        // { name: 'Verified', value: data.userInfo.user.verified ? 'Yes' : 'No', inline: true },
                    ])
                    .setDescription(tData.userInfo.user.signature || 'No bio')
                    .setColor(tData.userInfo.user.avatarLarger ? (getTwoMostUsedColors(await loadImage(tData.userInfo.user.avatarLarger)))[0] : 'Random')
                    .setTimestamp(new Date(tData.userInfo.user.createTime * 1000))
                    .setFooter({ text: 'Account created on' })
                return {
                    embeds: [
                        embed
                    ]
                }
            case 'inject.bio':
                const url = `https://api.inject.bio/80c734yt8c795t43/UserInfo/?api_key=${import.meta.env.INJECT_API_KEY}&username=${encodeURI(query)}`;
                const rRes = await axios.get(url);
                const { data: rData } = rRes;
                if (!rData.success) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const rUser = rData.data as RangeUser;
                // const avatarImg = user.avatar ? await loadImage(user.avatar, {
                //     requestOptions: {
                //         headers: {
                //             'User-Agent': userAgent.random().toString(),
                //             'cookie': 'PHPSESSID=6v9g6br11q29jafjhq0saehval'
                //         }
                //     }
                // }) : null;
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: rUser.username, iconURL: rUser.avatar ? rUser.avatar : undefined, url: `https://inject.bio/${rUser.username}` })
                            .setTitle(isNullish(rUser.display_name) ? rUser.username : rUser.display_name)
                            .setURL(`https://inject.bio/${rUser.username}`)
                            .setDescription(isNullish(rUser.description) ? 'No description' : rUser.description)
                            .setThumbnail(rUser.avatar)
                            .setImage(rUser.background)
                            .addFields([
                                { name: 'View Count', value: numeral(rUser.view_count).format('0,0'), inline: true },
                                { name: 'Discord', value: rUser.discord_id ? `<@${rUser.discord_id}>` : 'Not linked', inline: true }
                            ])
                            .setColor(rUser.background_color as ColorResolvable)
                            .setFooter({ text: `UID: ${rUser.uid}` })
                            .setTimestamp(new Date(rUser.created_at))
                    ]
                }
            case 'biography':
                const res = await axios.get(`https://bio.polardev.net/api/${query}`);
                if (res.status != 200) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const bUser = res.data as BiographyUser;
                if (!bUser.id && bUser.id != 0) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                let color: ColorResolvable = 'Random';
                if (bUser.avatar) {
                    try {
                        const image = await loadImage(`https://cdn.nest.rip/uploads/${bUser.avatar}`);
                        color = getTwoMostUsedColors(image)[0];
                    } catch (error) {
                    }
                }
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: bUser.username, iconURL: bUser.avatar ? `https://cdn.nest.rip/uploads/${bUser.avatar}` : undefined, url: `https://bio.polardev.net/${bUser.username}` })
                            .setTitle(bUser.username || 'No username')
                            .setDescription(bUser.bio || 'No bio')
                            .addFields([
                                { name: 'About Me', value: bUser.aboutme || 'No about me' },
                            ])
                            .setThumbnail(bUser.avatar ? `https://cdn.nest.rip/uploads/${bUser.avatar}` : null)
                            .setColor(color)
                            .setFooter({ text: `Invited by ${bUser.invited_by} • ID: ${bUser.id}` })
                            // .setImage(`https://cdn.nest.rip/uploads/${bUser.banner}`)
                            .setTimestamp(new Date(bUser.created_at))
                    ]
                }
            case 'death.ovh':
                const deathRes = await axios.post(`https://death.ovh/api/bot/lookup2`, {
                    key: import.meta.env.DEATH_OVH_API_KEY,
                    username: query
                });
                if (deathRes.status !== 200) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const deathUser = deathRes.data as DeathUser;
                if (!deathUser.uid) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                const emojis: string[] = [];
                const { badges } = deathUser;
                if (badges && badges.length != 0) {
                    await Promise.all(badges.map(async (badge) => {
                        if (!badge.toggle) return;
                        const emoji = await addEmojiByURL(`death_${badge.id}`, badge.url, ems);
                        // const res = await axios.get(badge.url, { responseType: 'arraybuffer' });
                        // const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `death_${badge.id}.png`);
                        // await write(path, res.data);
                        emojis.push(emoji?.toString()!);
                    }));
                }
                const ucolor: ColorResolvable = deathUser.backgroundUrl ? getTwoMostUsedColors(await loadImage(deathUser.avatarUrl))[0] : 'Random';
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: deathUser.username, iconURL: deathUser.avatarUrl, url: `https://death.ovh/${deathUser.alias}` })
                            // .setTitle(deathUser.username)
                            .setDescription(`
### ${emojis.join('')}                                
${deathUser.description}`)
                            .setThumbnail(deathUser.avatarUrl || null)
                            .setImage(deathUser.backgroundUrl || null)
                            .addFields([
                                { name: 'Views', value: numeral(deathUser.views).format('0,0'), inline: true },
                                { name: 'Discord', value: deathUser.discord_username ? `<@${deathUser.discord_id}>` : 'Not linked', inline: true }
                            ])
                            .setColor(ucolor)
                            .setFooter({ text: `UID: ${deathUser.uid} • Joined` })
                            .setTimestamp(new Date(deathUser.joined_at * 1000))
                    ]
                }
            case 'socl.gg':
                const sHtml = (await axios.get(`https://socl.gg/${query}`)).data;
                const sMatch = sHtml.match(regex);
                if (!sMatch) {
                    return {
                        ephemeral: true,
                        content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                    }
                }
                const sData = JSON.parse(sMatch[1]) as SoclUserResponse;
                const sUser = sData.props.pageProps.user;
                if (!sUser || !sUser.createdAt) {
                    return {
                        ephemeral: true,
                        content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                    }
                }
                const sColor: ColorResolvable = sUser.bio.customization.metaThemeColor || 'Random';
                const sEmbed = new EmbedBuilder()
                    .setAuthor({ name: sUser.username, iconURL: `https://r2.socl.gg${sUser.bio.avatarURL}`, url: `https://socl.gg/${sUser.username}` })
                    .setDescription(`${sUser.bio.description || 'No bio'}\n\n${sUser.bio.location ? `**Location:** ${sUser.bio.location}\n` : ''}${sUser.bio.education ? `**Education:** ${sUser.bio.education}\n` : ''}${sUser.bio.jobTitle ? `**Job Title:** ${sUser.bio.jobTitle}\n` : ''}\n${sUser.bio.profileButtons.map((button) => button.value).join('\n')}`)
                    .setThumbnail(`https://r2.socl.gg${sUser.bio.avatarURL}` || null)
                    .setColor(sColor)
                    .addFields({
                        name: 'Discord',
                        value: sUser.discordConnection.discordId ? `<@${sUser.discordConnection.discordId}>` : 'Not linked',
                        inline: true
                    })
                    // .setFooter({ text: `Created` })
                    .setTimestamp(new Date(sUser.createdAt));
                return {
                    embeds: [
                        sEmbed
                    ]
                }
            // case 'ammo.lol':
            //     const aRes = await axios.get(`https://ammo.lol/api/v1/public/user`, {
            //         params: {
            //             username: query
            //         },
            //         headers: {
            //             'API-KEY': import.meta.env.AMMO_LOL_API_KEY
            //         }
            //     });
            //     const aData = aRes.data as AmmoUser;
            //     if (!aData) return {
            //         ephemeral: true,
            //         content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
            //     }
            //     const hasBackground = aData.background_url && isURL(aData.background_url);
            //     const hasAvatar = aData.avatar_url && isURL(aData.avatar_url);
            //     const hasURL = aData.url && isURL(aData.url);
            //     const aColor: ColorResolvable = hasAvatar ? getTwoMostUsedColors(await loadImage(aData.avatar_url))[0] : 'Random';
            //     const [day, month, year] = aData.created.split('/').map(Number);
            //     const date = new Date(year, month - 1, day);
            //     return {
            //         embeds: [
            //             new EmbedBuilder()
            //                 .setAuthor({ name: aData.username, iconURL: hasAvatar ? aData.avatar_url : undefined, url: hasURL ? aData.url : undefined })
            //                 .setDescription(aData.description)
            //                 .setThumbnail(hasAvatar ? aData.avatar_url : null)
            //                 .setImage(hasBackground ? aData.background_url : null)
            //                 .addFields([
            //                     { name: 'Profile Views', value: numeral(aData.profile_views).format('0,0'), inline: true },
            //                     { name: 'Premium', value: aData.premium ? 'Yes' : 'No', inline: true }
            //                 ])
            //                 .setColor(aColor)
            //                 .setFooter({ text: `UID: ${aData.uid} • Created` })
            //                 .setTimestamp(date)
            //         ]
            //     }
            case 'guns.lol':
                const gRes = await axios.post(`https://guns.lol/api/user/lookup?type=username`, {
                    key: import.meta.env.GUNS_API_KEY!,
                    username: query
                });
                const gData = gRes.data as GunsUser;
                if (!gData || gData.error) return {
                    ephemeral: true,
                    content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``
                }
                let gColor: ColorResolvable = 'Random';
                if (gData.config.color) {
                    gColor = gData.config.color as ColorResolvable;
                } else {
                    try {
                        gColor = gData.config.avatar ? getTwoMostUsedColors(await loadImage(gData.config.avatar))[0] : 'Random';
                    } catch (error) {

                    }
                }
                let gEmojis: string = ''
                if (gData.config.custom_badges) {
                    for (const badge of gData.config.custom_badges) {
                        const emoji = await addEmojiByURL(`guns_${badge[0]}`, badge[1], ems);
                        gEmojis += emoji?.toString()!;
                    }
                }
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: gData.username, iconURL: isNullish(gData.config.avatar) ? undefined : gData.config.avatar, url: `https://guns.lol/${gData.alias}` })
                            .setDescription(`## ${gEmojis}\n${gData.config.description}`)
                            .setThumbnail(isNullish(gData.config.avatar) ? null : gData.config.avatar)
                            .addFields(gData.config.socials.map((social) => ({
                                name: captitalizeString(social.social),
                                value: social.value,
                                inline: true
                            })))
                            .setColor(gColor)
                            .setFooter({ text: `UID: ${gData.uid} • Views: ${numeral(gData.config.page_views).format("0,0")} • Created` })
                            .setTimestamp(new Date(gData.account_created * 1000))
                    ]
                }
            default:
                return { ephemeral: true, content: `I'm sorry, but the service "${service}" is not yet supported.\n-# If you want it added, feel free to contact the developer of the service and the bot.` };
        }
    }
} as ICommand