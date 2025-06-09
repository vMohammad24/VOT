import { AttachmentBuilder } from "discord.js";
import numeral from "numeral";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getUser } from "../../util/database";
import { getSpotifyFeatures, getUserCurrentStream } from "../../util/statsfm";

export default {
	name: "statsfm nowplaying",
	aliases: ["sfm np"],
	type: "all",
	description: "Get the currently playing song on stats.fm",
	execute: async ({ user }) => {
		const statsFm = (await getUser(user, { statsfmUser: true })).statsfmUser;
		if (!statsFm)
			return {
				content: "Please set your stats.fm username with `/statsfm set`",
				ephemeral: true,
			};
		const np = await getUserCurrentStream(statsFm);
		if (!np || !np.item || !np.item.track)
			return {
				content: "Nothing is currently playing",
				ephemeral: true,
			};

		const [previewURL, fileEx] = (() => {
			if (np.item.track.appleMusicPreview)
				return [np.item.track.appleMusicPreview, "m4a"];
			if (np.item.track.spotifyPreview)
				return [np.item.track.spotifyPreview, "mp3"];
			return [];
		})();
		const embed = await new VOTEmbed()
			.setAuthor({
				name: np.item.track.artists[0].name,
				iconURL: np.item.track.artists[0].image,
			})
			.setTitle(np.item.track.name)
			.setURL(
				`https://open.spotify.com/track/${np.item.track.externalIds.spotify[0]}`,
			)
			.setThumbnail(np.item.track.albums[0].image)
			.dominant();
		const features = np.item.track.externalIds.spotify[0]
			? await getSpotifyFeatures(np.item.track.externalIds.spotify[0])
			: null;
		if (features) {
			const fP = (v: number) => numeral(v).format("0%");
			embed.setFields([
				{
					name: "Acousticness",
					value: fP(features.acousticness),
					inline: true,
				},
				{
					name: "Danceability",
					value: fP(features.danceability),
					inline: true,
				},
				{ name: "Energy", value: fP(features.energy), inline: true },
				{ name: "Speechiness", value: fP(features.speechiness), inline: true },
				{ name: "Loudness", value: `${features.loudness}db`, inline: true },
			]);
		}
		if (np.item.progressMs !== 0) {
			const formatTime = (ms: number) => {
				return new Date(ms).toISOString().slice(11, 19).replace(/^00:/, "");
			};
			embed.setDescription(
				`Progress: ${numeral(np.item.progressMs / np.item.track.durationMs).format("0%")} (${formatTime(np.item.progressMs)}/${formatTime(np.item.track.durationMs)})`,
			);
		}
		return {
			embeds: [embed],
			files: previewURL
				? [
						new AttachmentBuilder(previewURL, {
							name: `preview.${fileEx}`,
						}),
					]
				: [],
		};
	},
} as ICommand;
