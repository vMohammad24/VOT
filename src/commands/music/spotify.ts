import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { getCurrentlyPlaying, pausePlayer } from '../../util/spotify';
import { getFrontEndURL } from '../../util/urls';

export default {
	description: 'Gets your current playing song from spotify and adds it to the queue',
	needsPlayer: true,
	aliases: ['sp'],
	execute: async ({ member, handler, player, interaction, guild }) => {
		await interaction?.deferReply({ ephemeral: true });
		const res = await getCurrentlyPlaying(member.id);
		if (res.error) {
			if (res.error == 1) {
				return {
					embeds: [
						new EmbedBuilder()
							.setTitle('Spotify')
							.setColor('Red')
							.setDescription('You have not linked your spotify account yet.')
							.setTimestamp()
					],
					components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel('Link Spotify').setStyle(ButtonStyle.Link).setURL(`${getFrontEndURL()}/settings/spotify`))],
					ephemeral: true,
				};
			}
			return {
				content: res.error,
				ephemeral: true,
			};
		}
		if (!player)
			return {
				content: 'Notihg is currently being played',
				ephemeral: true,
			};
		const trackURI = res.item.external_urls.spotify;
		if (!trackURI)
			return {
				content: 'No track playing',
				ephemeral: true,
			};
		const track = (
			await handler.kazagumo.search(trackURI, {
				requester: member as GuildMember,
				engine: 'spotify',
			})
		).tracks[0];
		if (!track)
			return {
				content: 'No track found',
				ephemeral: true,
			};
		if (player.queue.current) {
			await player.queue.add(track);
			if (!player.playing) player.play();
		} else {
			await player.play(track);
		}
		const a = await pausePlayer(member.id);
		const embed = new EmbedBuilder()
			.setTitle('Added to queue')
			.setColor('Green')
			.setDescription(`Added [${track.title || 'Error getting title'}](${track.uri}) to the queue`)
			.setThumbnail(track.thumbnail || null)
			.setFooter({ text: a ? a.error : 'Paused spotify.' });
		if (player.queue.current?.realUri == track.realUri && res.progress_ms) {
			await player.seek(parseInt(res.progress_ms));
			// minute:second
			const seekedTo = new Date(parseInt(res.progress_ms)).toISOString().substr(14, 5);
			embed.setDescription(embed.data.description + ` and seeked to ${seekedTo}`);
		}
		return {
			embeds: [embed],
			ephemeral: true,
		};
	},
} as ICommand;
