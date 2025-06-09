import axios from "axios";
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	type ColorResolvable,
	EmbedBuilder,
} from "discord.js";
import numeral from "numeral";
import type ICommand from "../../handler/interfaces/ICommand";
import { loadImg } from "../../util/database";
import { addEmojiByURL, getEmoji } from "../../util/emojis";
import { getTikTokUser } from "../../util/tiktok";
import {
	capitalizeString,
	getTwoMostUsedColors,
	isNullish,
	isURL,
} from "../../util/util";

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

interface Badge {
	tooltip: string;
	url: string;
}

interface InjectUser {
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
	github?: string;
	twitter?: string;
	instagram?: string;
	youtube?: string;
	ranks?: string[];
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
	buttons: {
		button_title: string;
		button_url: string;
		button_icon: string;
		id: string;
	}[];
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
	user_badges:
		| string[]
		| {
				enabled: boolean;
				name: string;
		  }[];
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
	description: "Lookup a user in a service",
	// slashOnly: true,
	options: [
		{
			name: "service",
			description: "The service to lookup the user in",
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: ["nest.rip", "guns.lol", "socl.gg", "ammo.lol", "tiktok"].map(
				(service) => ({ name: service, value: service }),
			),
		},
		{
			name: "query",
			description: "What to use to search for the user (username, id, etc.)",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: "all",
	execute: async ({ args, handler, interaction }) => {
		const service = args.get("service") as string;
		const query = args.get("query") as string;
		if (!service)
			return {
				ephemeral: true,
				content: "Please provide a service to lookup the user in.",
			};
		if (!query)
			return {
				ephemeral: true,
				content: "Please provide a query to search for the user.",
			};
		const ems = await handler.client.application?.emojis.fetch();
		const regex =
			/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/;
		switch (service) {
			case "nest.rip": {
				const response = await axios.get(`https://nest.rip/${query}`);
				const html = response.data;
				const match = html.match(regex);
				if (!match) {
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				}
				const nData = JSON.parse(match[1]);
				const nUser: User = nData.props.pageProps.user;
				if (!nUser || !nUser.created_at) {
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				}
				if (nUser?.private_profile)
					return {
						ephemeral: true,
						content: "This user has a private profile.",
					};
				return {
					embeds: [
						new EmbedBuilder()
							.setAuthor({
								name: `${nUser.username} ${nUser.banned ? "(Banned)" : ""}`,
								url: `https://nest.rip/${nUser.id}`,
								iconURL: nUser.avatar
									? `https://cdn.nest.rip/avatars/${nUser.avatar}`
									: undefined,
							})
							.setThumbnail(
								nUser.avatar
									? `https://cdn.nest.rip/avatars/${nUser.avatar}`
									: null,
							)
							.addFields([
								{ name: "ID", value: nUser.uid.toString(), inline: true },
								{
									name: "Rank",
									value: capitalizeString(nUser.rank),
									inline: true,
								},
								{
									name: "Contributor",
									value: nUser.contributor ? "Yes" : "No",
									inline: true,
								},
								// { name: 'Banned', value: nUser.banned ? 'Yes' : 'No', inline: true },
								{
									name: "Storage Used",
									value: numeral(nUser.storage_used).format("0.00b"),
									inline: true,
								},
								{
									name: "Uploads",
									value: numeral(nUser.uploads).format("0,0"),
									inline: true,
								},
							])
							.setDescription(
								!nUser || !nUser.bio || nUser.bio.trim() === ""
									? null
									: nUser.bio,
							)
							.setFooter({
								text: `Invited by ${nUser.invited_by ? (nUser.invited_by.username ?? "No one") : "No one"}`,
							})
							.setColor(
								nUser.avatar
									? getTwoMostUsedColors(
											await loadImg(
												`https://cdn.nest.rip/avatars/${nUser.avatar}`,
											),
										)[0]
									: "Random",
							)
							.setTimestamp(new Date(nUser.created_at)),
					],
				};
			}
			case "tiktok": {
				const tData = await getTikTokUser(query);
				if (!tData)
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				const embed = new EmbedBuilder()
					// .setAuthor({ name: data..nickname, url: `https://www.tiktok.com/@${data..uniqueId}`, iconURL: data..avatarThumb })
					.setTitle(
						`${tData.nickname} ${tData.verified ? getEmoji("verified").toString() : ""}`,
					)
					.setURL(`https://www.tiktok.com/@${tData.uniqueId}`)
					.setThumbnail(tData.avatarLarger)
					.addFields([
						// { name: 'Username', value: data..uniqueId, inline: true },
						{
							name: "Followers",
							value: numeral(tData.followerCount).format("0,0"),
							inline: true,
						},
						{
							name: "Following",
							value: numeral(tData.followingCount).format("0,0"),
							inline: true,
						},
						{
							name: "Friends",
							value: numeral(tData.friendCount).format("0,0"),
							inline: true,
						},
						{
							name: "Hearts",
							value: numeral(tData.heart).format("0,0"),
							inline: true,
						},
						{
							name: "Videos",
							value: numeral(tData.videoCount).format("0,0"),
							inline: true,
						},
						// { name: 'Verified', value: data..verified ? 'Yes' : 'No', inline: true },
					])
					.setDescription(tData.signature || "No bio")
					.setColor(
						tData.avatarLarger
							? getTwoMostUsedColors(await loadImg(tData.avatarLarger))[0]
							: "Random",
					)
					.setTimestamp(new Date(tData.createTime * 1000))
					.setFooter({ text: "Account created on" });
				return {
					embeds: [embed],
				};
			}
			case "socl.gg": {
				const sHtml = (await axios.get(`https://socl.gg/${query}`)).data;
				const sMatch = sHtml.match(regex);
				if (!sMatch) {
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				}
				const sData = JSON.parse(sMatch[1]) as SoclUserResponse;
				const sUser = sData.props.pageProps.user;
				if (!sUser || !sUser.createdAt) {
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				}
				const sColor: ColorResolvable =
					sUser.bio.customization.metaThemeColor || "Random";
				const sEmbed = new EmbedBuilder()
					.setAuthor({
						name: sUser.username,
						iconURL: `https://r2.socl.gg${sUser.bio.avatarURL}`,
						url: `https://socl.gg/${sUser.username}`,
					})
					.setDescription(
						`${sUser.bio.description || "No bio"}\n\n${sUser.bio.location ? `**Location:** ${sUser.bio.location}\n` : ""}${sUser.bio.education ? `**Education:** ${sUser.bio.education}\n` : ""}${sUser.bio.jobTitle ? `**Job Title:** ${sUser.bio.jobTitle}\n` : ""}\n${sUser.bio.profileButtons.map((button) => button.value).join("\n")}`,
					)
					.setThumbnail(`https://r2.socl.gg${sUser.bio.avatarURL}` || null)
					.setColor(sColor)
					.addFields({
						name: "Discord",
						value: sUser.discordConnection.discordId
							? `<@${sUser.discordConnection.discordId}>`
							: "Not linked",
						inline: true,
					})
					// .setFooter({ text: `Created` })
					.setTimestamp(new Date(sUser.createdAt));
				return {
					embeds: [sEmbed],
				};
			}
			case "ammo.lol": {
				const aRes = await axios.get("https://ammo.lol/api/v1/public/user", {
					params: {
						username: query,
					},
					headers: {
						"API-KEY": import.meta.env.AMMO_LOL_API_KEY,
					},
				});
				const aData = aRes.data as AmmoUser;
				if (!aData)
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				const hasBackground =
					aData.background_url && isURL(aData.background_url);
				const hasAvatar = aData.avatar_url && isURL(aData.avatar_url);
				const hasURL = aData.url && isURL(aData.url);
				const aColor: ColorResolvable = hasAvatar
					? getTwoMostUsedColors(await loadImg(aData.avatar_url))[0]
					: "Random";
				const [day, month, year] = aData.created.split("/").map(Number);
				const date = new Date(year, month - 1, day);
				return {
					embeds: [
						new EmbedBuilder()
							.setAuthor({
								name: aData.username,
								iconURL: hasAvatar ? aData.avatar_url : undefined,
								url: hasURL ? aData.url : undefined,
							})
							.setDescription(aData.description)
							.setThumbnail(hasAvatar ? aData.avatar_url : null)
							.setImage(hasBackground ? aData.background_url : null)
							.addFields([
								{
									name: "Profile Views",
									value: numeral(aData.profile_views).format("0,0"),
									inline: true,
								},
								{
									name: "Premium",
									value: aData.premium ? "Yes" : "No",
									inline: true,
								},
							])
							.setColor(aColor)
							.setFooter({ text: `UID: ${aData.uid} • Created` })
							.setTimestamp(date),
					],
				};
			}
			case "guns.lol": {
				const gRes = await axios.post(
					"https://guns.lol/api/user/lookup?type=username",
					{
						key: import.meta.env.GUNS_API_KEY!,
						username: query,
					},
				);
				const gData = gRes.data as GunsUser;
				if (!gData || gData.error)
					return {
						ephemeral: true,
						content: `I'm sorry, but I couldn't find a user with the query \`${query}\` on \`${service}\``,
					};
				let gColor: ColorResolvable = "Random";
				if (gData.config.color) {
					gColor = gData.config.color as ColorResolvable;
				} else {
					try {
						gColor = gData.config.avatar
							? getTwoMostUsedColors(await loadImg(gData.config.avatar))[0]
							: "Random";
					} catch (error) {}
				}
				let gEmojis = "";
				if (gData.config.user_badges && gData.config.user_badges.length !== 0) {
					for (const badge of gData.config.user_badges) {
						if (typeof badge === "string") {
							const emoji = getEmoji(`guns_${badge}_badge`);
							if (emoji) gEmojis += emoji.toString();
							continue;
						}
						if (badge.enabled) {
							const emoji = getEmoji(`guns_${badge.name}_badge`);
							if (emoji) gEmojis += emoji.toString();
						}
					}
				}
				if (gData.config.custom_badges) {
					for (const badge of gData.config.custom_badges) {
						const emoji = await addEmojiByURL(
							`guns_${badge[0]}`,
							badge[1],
							ems,
						);
						gEmojis += emoji?.toString()!;
					}
				}
				const rows: ActionRowBuilder<ButtonBuilder>[] = [];
				if (gData.config.premium.buttons.length > 0) {
					const buttons = gData.config.premium.buttons;
					for (let i = 0; i < buttons.length; i += 5) {
						const row = new ActionRowBuilder<ButtonBuilder>();
						for (let j = i; j < i + 5; j++) {
							const button = buttons[j];
							if (!button) break;
							const urlRegex =
								/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
							if (!urlRegex.test(button.button_url)) continue;
							row.addComponents(
								new ButtonBuilder()
									.setLabel(button.button_title)
									.setStyle(ButtonStyle.Link)
									.setURL(button.button_url),
							);
						}
						if (row.components.length > 0) rows.push(row);
					}
				}
				return {
					embeds: [
						new EmbedBuilder()
							.setAuthor({
								name: gData.username,
								iconURL: isNullish(gData.config.avatar)
									? undefined
									: gData.config.avatar,
								url: `https://guns.lol/${gData.alias}`,
							})
							.setDescription(`## ${gEmojis}\n${gData.config.description}`)
							.setThumbnail(
								isNullish(gData.config.avatar) ? null : gData.config.avatar,
							)
							.addFields(
								gData.config.socials.map((social) => ({
									name: capitalizeString(social.social),
									value: social.value,
									inline: true,
								})),
							)
							.setColor(gColor)
							.setFooter({
								text: `UID: ${gData.uid} • Views: ${numeral(gData.config.page_views).format("0,0")} • Created`,
							})
							.setTimestamp(new Date(gData.account_created * 1000)),
					],
					components: rows,
				};
			}
			default:
				return {
					ephemeral: true,
					content: `I'm sorry, but the service "${service}" is not yet supported.\n-# If you want it added, feel free to contact the developer of the service and the bot.`,
				};
		}
	},
} as ICommand;
