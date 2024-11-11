import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';
import { isNullish } from '../../util/util';
const turndownService = new TurnDownService();

export default {
	description: 'Search for videos on the internet',
	aliases: ['yt', 'youtube'],
	options: [
		{
			name: 'query',
			description: 'The query you want to search for',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: 'all',
	execute: async ({ args, interaction, message }) => {
		const query = args.get('query') as string | undefined;
		if (!query)
			return {
				content: 'Please provide a query to search for',
				ephemeral: true,
			};
		const videos = await searchBrave(query);
		if (!videos.data.body.response.videos)
			return {
				content: 'No results found',
				ephemeral: true,
			};
		const results = videos.data.body.response.videos.results;
		await pagination({
			interaction,
			message,
			type: 'select',
			name: 'Select a video',
			pages: results
				.map((v) => {
					if (isNullish(v.title) || isNullish(v.description)) return null;
					const description = turndownService.turndown(v.description);
					return {
						name: v.title.slice(0, 99) || 'No title',
						description: description.slice(0, 99) || 'No description',
						emoji: (getEmoji(v.meta_url.netloc.split('.')[0]) || '🔗').toString(),
						page: new EmbedBuilder()
							.setTitle(v.title)
							.setDescription(description)
							.setURL(v.url)
							.setAuthor({ iconURL: v.meta_url.favicon, name: v.meta_url.netloc })
							.setThumbnail(v.video.thumbnail ? v.video.thumbnail.original : null)
							.setURL(v.url),
					};
				})
				.filter((v) => v != null),
		});
	},
} as ICommand;
