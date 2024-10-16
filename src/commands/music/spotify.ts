import axios from 'axios';
import { EmbedBuilder, GuildMember } from 'discord.js';
import { KazagumoTrack } from 'kazagumo';
import numeral from 'numeral';
import type ICommand from '../../handler/interfaces/ICommand';


interface UserStatus {
	online: string[];
	idle: string[];
	dnd: string[];
	status: string;
	activities: Activity[];
	messages: Record<string, unknown>;
	voice: unknown[];
}

interface Activity {
	type: number;
	state: string;
	name: string;
	flags?: number;
	assets?: Assets;
	party?: Party;
	sync_id?: string;
	session_id?: string;
	timestamps?: Timestamps;
	details?: string;
	application_id?: number;
	buttons?: string[];
}

interface Assets {
	large_text: string;
	large_image: string;
	small_text?: string;
	small_image?: string;
}

interface Party {
	id: string;
}

interface Timestamps {
	start: number;
	end?: number;
}

export default {
	description: 'Gets your current playing song from spotify and adds it to the queue',
	// needsPlayer: true,
	aliases: ['sp'],
	execute: async ({ member, handler, player, interaction, guild, user }) => {
		await interaction?.deferReply({ ephemeral: true });

		const res = await axios.get<UserStatus>(`https://us-atlanta2.evade.rest/users/${user.id}/status`)
		if (!res.data.activities) {
			return {
				content: 'No activity found',
				ephemeral: true,
			};
		}
		const spotify = res.data.activities.find((activity) => activity.assets?.large_image.startsWith('spotify:'));
		if (!spotify) {
			return {
				content: 'No spotify activity found',
				ephemeral: true,
			};
		}
		const trackURI = `https://open.spotify.com/track/${spotify.sync_id}`;
		if (!trackURI) {
			return {
				content: 'No track playing',
				ephemeral: true,
			};
		}
		const track = (
			await handler.kazagumo.search(trackURI, {
				requester: member as GuildMember,
				engine: 'spotify',
			})
		).tracks[0];
		if (!track) {
			return {
				content: 'No track found',
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
			const cTrack = new KazagumoTrack(track.getRaw()._raw, track.requester)
			if (player.queue.current) {
				await player.queue.add(cTrack);
				if (!player.playing) player.play();
			} else {
				await player.play(cTrack);
			}
			const embed = new EmbedBuilder()
				.setTitle('Added to queue')
				.setColor('Green')
				.setDescription(`Added [${cTrack.title || 'Error getting title'}](${cTrack.uri}) to the queue`)
				.setThumbnail(cTrack.thumbnail || null)
			if (player.queue.current?.realUri == cTrack.realUri && spotify.timestamps?.start) {
				const progress = Math.floor((Date.now() - spotify.timestamps.start) / 1000);
				await player.seek(progress);
				// minute:second
				embed.setDescription(embed.data.description + ` and seeked to ${numeral(progress).format('00:00')} (May not be accurate)`);
			}
			return {
				embeds: [embed],
				ephemeral: true,
			};
		} else {
			return {
				embeds: [
					new EmbedBuilder()
						.setTitle('Spotify - Currently Playing')
						.setColor('Green')
						.setDescription(`[${track.title || 'Error getting title'}](${track.uri})`)
						.setThumbnail(track.thumbnail || null)
						.setAuthor({ name: track.author || 'Error getting author' })
				]
			}
		}

	},
} as ICommand;
