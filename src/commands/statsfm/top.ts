import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getUser as getUserDB } from "../../util/database";
import {
	getUser,
	getUserTopArtists,
	getUserTopGenres,
	getUserTopTracks,
} from "../../util/statsfm";

export default {
	name: "statsfm top",
	aliases: ["sfm top"],
	description: "Get the top 10 songs on stats.fm",
	type: "all",
	options: [
		{
			name: "type",
			type: ApplicationCommandOptionType.String,
			choices: ["tracks", "genres", "artists"].map((a) => ({
				name: a,
				value: a,
			})),
			description: "What to get statistics for?",
			required: true,
		},
	],
	execute: async ({ args, user }) => {
		const statsFm = (await getUserDB(user, { statsfmUser: true })).statsfmUser;
		if (!statsFm)
			return {
				content: "Please set your stats.fm username with `/statsfm set`",
				ephemeral: true,
			};
		const fmUser = await getUser(statsFm);
		if (!fmUser)
			return {
				content: "Invalid stats.fm username, please set it with `/statsfm set`",
				ephemeral: true,
			};
		const type = args.get("type") as "tracks" | "genres" | "artists";

		switch (type) {
			case "genres": {
				const genres = await getUserTopGenres(statsFm);
				if (!genres)
					return {
						content: "No genres found",
						ephemeral: true,
					};
				return {
					embeds: [
						await new VOTEmbed()
							.setThumbnail(fmUser.item.image)
							.setDescription(
								genres.items
									.slice(0, 10)
									.sort((a, b) => a.position - b.position)
									.map((g, i) =>
										`${i + 1}. ${g.genre.tag} - ${g.artistCount ?? "??"} artist${g.artistCount === 1 ? "" : "s"}`.trim(),
									)
									.join("\n"),
							)
							.dominant(),
					],
				};
			}
			case "artists": {
				const artists = await getUserTopArtists(statsFm);
				if (!artists)
					return {
						content: "No artists found",
						ephemeral: true,
					};
				return {
					embeds: [
						await new VOTEmbed()
							.setThumbnail(fmUser.item.image)
							.setDescription(
								artists.items
									.slice(0, 10)
									.sort((a, b) => a.position - b.position)
									.map((a, i) =>
										`${i + 1}. [${a.artist.name}](${`https://open.spotify.com/artist/${a.artist.externalIds.spotify}`})`.trim(),
									)
									.join("\n"),
							)
							.dominant(),
					],
				};
			}
			case "tracks": {
				const tracks = await getUserTopTracks(statsFm, "weeks");
				if (!tracks)
					return {
						content: "No tracks found",
						ephemeral: true,
					};
				return {
					embeds: [
						await new VOTEmbed()
							.setThumbnail(fmUser.item.image)
							.setDescription(
								tracks.items
									.slice(0, 10)
									.sort((a, b) => a.position - b.position)
									.map((t, i) => {
										const trackName = t.track.name;
										const artist = t.track.artists?.[0];

										const trackLink = t.track.externalIds?.spotify?.[0]
											? `[${trackName}](https://open.spotify.com/track/${t.track.externalIds.spotify[0]})`
											: trackName;
										const artistLink = artist?.externalIds?.spotify
											? `[${artist.name}](https://open.spotify.com/artist/${artist.externalIds.spotify})`
											: artist?.name;

										return `${i + 1}. ${trackLink} - ${artistLink}`;
									})
									.join("\n"),
							)
							.dominant(),
					],
				};
			}
			default:
				return {
					content: "Invalid type",
					ephemeral: true,
				};
		}
	},
} as ICommand;
