import { ApplicationCommandOptionType } from 'discord.js';
import { Client } from 'genius-lyrics';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';
import { getSpotifyRPC } from '../../util/spotify';
import VOTEmbed from '../../util/VOTEmbed';
const genius = new Client();
export default {
	description: 'Get the lyrics of the current song',
	aliases: ['ly'],
	type: 'all',
	options: [
		{
			name: 'song',
			description: 'The song you want to get the lyrics for',
			type: ApplicationCommandOptionType.String,
			required: false,
			autocomplete: true,
		},
	],
	autocomplete: async (interaction) => {
		const query = await interaction.options.getFocused();
		if (!query) return await interaction.respond([{ name: 'Provide a query to continue', value: '' }]);
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
		let query = args.get('song') || (player ? player.queue.current?.title : null);
		if (!query) {
			const r = await getSpotifyRPC(user.id)
			if (r.error) return {
				content: 'Please provide a query to continue',
				ephemeral: true,
			}
			query = `${r.raw?.details}|${r.raw?.state}`;
		};
		await interaction?.deferReply();
		const songs = await genius.songs.search(query, { sanitizeQuery: true });
		const song = songs[0];
		if (!song) return { content: 'Song not found! Sorry.', ephemeral: true };
		const lyrics = await song.lyrics();
		if (!lyrics) return { content: 'Lyrics not found! Sorry.', ephemeral: true };
		const splitText = lyrics.match(/[\s\S]{1,2048}/g)!;
		const embeds = splitText.map(async (text, i) => ({
			page: await new VOTEmbed()
				.setTitle(`${song.title}`)
				.setAuthor({ name: song.artist.name, iconURL: song.artist.image })
				.setURL(song.url)
				.setThumbnail(song.thumbnail)
				.setDescription(text)
				.setTimestamp(song.releasedAt)
				.setFooter(song.releasedAt ? { text: `Released` } : null)
				.dominant(),
		}));
		const pag = await pagination({
			interaction,
			message,
			pages: await Promise.all(embeds),
			type: 'buttons',
		});
	},
} as ICommand;
