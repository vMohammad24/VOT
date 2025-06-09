import { ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import { Client } from "genius-lyrics";
import { apiAxios } from "../../api";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { pagination } from "../../util/pagination";
import { getSpotifyRPC } from "../../util/spotify";
const genius = new Client();

interface Release_date_components {
	year: number;
	month: number;
	day: number;
}

interface Stats {
	unreviewed_annotations: number;
	concurrents: number;
	hot: boolean;
	pageviews: number;
}

interface Featured_artists {
	_type: string;
	api_path: string;
	header_image_url: string;
	id: number;
	image_url: string;
	index_character: string;
	is_meme_verified: boolean;
	is_verified: boolean;
	name: string;
	slug: string;
	url: string;
	iq: number;
}

interface Primary_artist {
	_type: string;
	api_path: string;
	header_image_url: string;
	id: number;
	image_url: string;
	index_character: string;
	is_meme_verified: boolean;
	is_verified: boolean;
	name: string;
	slug: string;
	url: string;
	iq: number;
}

interface Primary_artists {
	_type: string;
	api_path: string;
	header_image_url: string;
	id: number;
	image_url: string;
	index_character: string;
	is_meme_verified: boolean;
	is_verified: boolean;
	name: string;
	slug: string;
	url: string;
	iq: number;
}

interface Response {
	lyrics: string;
	_type: string;
	annotation_count: number;
	api_path: string;
	artist_names: string;
	full_title: string;
	header_image_thumbnail_url: string;
	header_image_url: string;
	id: number;
	instrumental: boolean;
	lyrics_owner_id: number;
	lyrics_state: string;
	lyrics_updated_at: number;
	path: string;
	primary_artist_names: string;
	pyongs_count: number;
	relationships_index_url: string;
	release_date_components: Release_date_components;
	release_date_for_display: string;
	release_date_with_abbreviated_month_for_display: string;
	song_art_image_thumbnail_url: string;
	song_art_image_url: string;
	stats: Stats;
	title: string;
	title_with_featured: string;
	updated_by_human_at: number;
	url: string;
	featured_artists: Featured_artists[];
	primary_artist: Primary_artist;
	primary_artists: Primary_artists[];
	previewURL: string;
}

export default {
	description: "Get the lyrics of the current song",
	aliases: ["ly"],
	type: "all",
	options: [
		{
			name: "song",
			description: "The song you want to get the lyrics for",
			type: ApplicationCommandOptionType.String,
			required: false,
			autocomplete: true,
		},
	],
	autocomplete: async (interaction) => {
		const query = await interaction.options.getFocused();
		if (!query)
			return await interaction.respond([
				{ name: "Provide a query to continue", value: "" },
			]);
		const songs = await genius.songs.search(query, { sanitizeQuery: false });
		await interaction.respond(
			songs
				.map((song) => ({
					name: song.title.substring(0, 99),
					value: song.fullTitle.substring(0, 99),
				}))
				.slice(0, 20),
		);
	},
	execute: async ({ player, args, interaction, message, user }) => {
		let query =
			args.get("song") || (player ? player.queue.current?.title : null);
		if (!query) {
			const r = await getSpotifyRPC(user.id);
			if (r.error)
				return {
					content: "Please provide a query to continue",
					ephemeral: true,
				};
			query = `${r.raw?.details}|${r.raw?.state}`;
		}
		const song = (
			await apiAxios.get<Response>(`/lyrics?query=${encodeURIComponent(query)}`)
		).data;
		const lyrics = song.lyrics;
		const splitText = lyrics.match(/[\s\S]{1,768}/g)!;
		const embeds = splitText.map(async (text, i) => ({
			page: {
				embeds: [
					await new VOTEmbed()
						.setTitle(`${song.title}`)
						.setAuthor({
							name: song.primary_artist.name,
							iconURL: song.primary_artist.image_url,
							url: song.primary_artist.url,
						})
						.setURL(song.url)
						.setThumbnail(
							song.song_art_image_thumbnail_url ||
								song.header_image_thumbnail_url,
						)
						.setDescription(text)
						.setTimestamp(
							song.release_date_components
								? new Date(
										song.release_date_components.year,
										song.release_date_components.month,
										song.release_date_components.day,
									)
								: null,
						)
						.setFooter(
							song.release_date_components ? { text: "Released" } : null,
						)
						.dominant(),
				],
				files:
					song.previewURL && i === 0
						? [
								new AttachmentBuilder(song.previewURL, {
									name: `${song.title} Preview.m4a`,
									description: `A preview of the song: "${song.full_title}"`,
								}),
							]
						: [],
			},
		}));
		const pag = await pagination({
			interaction,
			message,
			pages: await Promise.all(embeds),
			type: "buttons",
		});
	},
} as ICommand;
