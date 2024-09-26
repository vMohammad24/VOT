import { ApplicationCommandOptionType, EmbedBuilder, Events } from 'discord.js';
import { Client } from 'genius-lyrics';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

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
	init: async ({ client }) => {
		client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isAutocomplete()) return;
			if (interaction.commandName !== 'lyrics') return;
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
		});
	},
	execute: async ({ player, args, interaction, message }) => {
		const query = args.get('song') || (player ? player.queue.current?.title : null);
		if (!query) return { content: "Couldn't retrive song", ephemeral: true };
		await interaction?.deferReply();
		const songs = await genius.songs.search(query, { sanitizeQuery: true });
		const song = songs[0];
		if (!song) return { content: 'Song not found! Sorry.', ephemeral: true };
		const lyrics = await song.lyrics();
		if (!lyrics) return { content: 'Lyrics not found! Sorry.', ephemeral: true };
		const splitText = lyrics.match(/[\s\S]{1,2048}/g)!;
		const embeds = splitText.map((text, i) => ({
			page: new EmbedBuilder().setTitle(song.title).setURL(song.url).setThumbnail(song.thumbnail).setDescription(text),
		}));
		const pag = await pagination({
			interaction,
			message,
			pages: await Promise.all(embeds),
			type: 'buttons',
		});
	},
} as ICommand;
