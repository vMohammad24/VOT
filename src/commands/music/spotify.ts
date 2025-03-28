import { EmbedBuilder, type GuildMember } from "discord.js";
import { KazagumoTrack } from "kazagumo";
import numeral from "numeral";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getEmoji } from "../../util/emojis";
import { getSpotifyRPC, getTrackFeatures } from "../../util/spotify";

export default {
	description:
		"Gets your current playing song from spotify and adds it to the queue",
	// needsPlayer: true,
	aliases: ["sp"],
	type: "all",
	execute: async ({ member, handler, player, interaction, guild, user }) => {
		const res = await getSpotifyRPC(user.id);
		if (res.error) {
			return {
				content: res.error,
				ephemeral: true,
			};
		}
		const { trackURI, raw: spotify } = res;
		if (!trackURI) {
			return {
				content: "No track playing",
				ephemeral: true,
			};
		}
		const track = (
			await handler.kazagumo.search(trackURI, {
				requester: member as GuildMember,
				engine: "spotify",
			})
		).tracks[0];
		if (!track) {
			return {
				content: "No track found",
				ephemeral: true,
			};
		}
		// const res = await getCurrentlyPlaying(member.id);
		// if (res.error) {
		// 	if (res.error == 1) {
		// 		return {
		// 			embeds: [
		// 				new EmbedBuilder()
		// 					.setTitle('Spotify')
		// 					.setColor('Red')
		// 					.setDescription('You have not linked your spotify account yet.')
		// 					.setTimestamp()
		// 			],
		// 			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel('Link Spotify').setStyle(ButtonStyle.Link).setURL(`${getFrontEndURL()}/settings/spotify`))],
		// 			ephemeral: true,
		// 		};
		// 	}
		// 	return {
		// 		content: res.error,
		// 		ephemeral: true,
		// 	};
		// }
		// if (!player)
		// 	return {
		// 		content: 'Notihg is currently being played',
		// 		ephemeral: true,
		// 	};
		// const trackURI = res.item.external_urls.spotify;
		// if (!trackURI)
		// 	return {
		// 		content: 'No track playing',
		// 		ephemeral: true,
		// 	};
		// const track = (
		// 	await handler.kazagumo.search(trackURI, {
		// 		requester: member as GuildMember,
		// 		engine: 'spotify',
		// 	})
		// ).tracks[0];
		// if (!track)
		// 	return {
		// 		content: 'No track found',
		// 		ephemeral: true,
		// 	};

		if (player) {
			const t = (await (
				await handler.kazagumo.getLeastUsedNode()
			).rest.resolve(track.uri!))!.data as any;
			const cTrack = new KazagumoTrack(t, member as GuildMember);
			if (player.queue.current) {
				await player.queue.add(cTrack);
				if (!player.playing) player.play();
			} else {
				await player.play(cTrack);
			}
			const embed = new EmbedBuilder()
				.setTitle("Added to queue")
				.setColor("Green")
				.setDescription(
					`Added [${cTrack.title || "Error getting title"}](${cTrack.uri}) to the queue`,
				)
				.setThumbnail(cTrack.thumbnail || null);
			if (
				player.queue.current?.realUri == cTrack.realUri &&
				spotify.timestamps?.start
			) {
				const progress = Math.floor(Date.now() - spotify.timestamps.start);
				await player.seek(progress);
				// minute:second
				embed.setDescription(
					embed.data.description +
						` and seeked to ${numeral(progress / 1000).format("00:00")}`,
				);
			}
			return {
				embeds: [embed],
			};
		} else {
			const info = track.getRaw()._raw.pluginInfo as {
				artistUrl: string;
				artistArtworkUrl: string;
			};
			const embed = await new VOTEmbed()
				.setDescription(
					`### [${track.title || "Error getting title"}](${track.uri})`,
				)
				.setThumbnail(track.thumbnail || null)
				.setAuthor({
					name: track.author || "Error getting author",
					iconURL: info.artistArtworkUrl,
					url: info.artistUrl,
				})
				.setFooter({
					text: "Spotify",
					iconURL: getEmoji("spotify").imageURL() ?? undefined,
				})
				.dominant();
			const trackId = track.identifier;
			const features = await getTrackFeatures(trackId, user.id);
			if (typeof features != "string") {
				if (features.analysis_url) {
					embed.addFields([
						{
							name: "Danceability",
							value: `${(features.danceability * 100).toFixed(1)}%`,
							inline: true,
						},
						{
							name: "Energy",
							value: `${(features.energy * 100).toFixed(1)}%`,
							inline: true,
						},
						{
							name: "Mode",
							value: `${(features.mode * 100).toFixed(1)}%`,
							inline: true,
						},
					]);
				}
			}
			return {
				embeds: [embed],
			};
		}
	},
} as ICommand;
