import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';

const turndownService = new TurnDownService();
export default {
	description: 'Search for a query on the internet',
	aliases: ['google', 'ddg', 'brave', 'duckduckgo'],
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'query',
			description: 'The query you want to search for',
			required: true,
		},
	],
	type: 'all',
	execute: async ({ args, interaction, message, handler: { client } }) => {
		const query = args.get('query') as string | undefined;
		if (!query) return { ephemeral: true, content: 'Please provide a query to search for' };
		interaction?.deferReply();
		const json = await searchBrave(query);
		const results = json.data.body.response.web.results;
		const pages = results.map(result => {
			const emojiName = (() => {
				let r = result.profile.name.toLowerCase().split(' ')[0].trim()
				if (r == 'x') r = 'twitter'
				return r
			})()
			return {
				page: {
					embeds: [
						new EmbedBuilder()
							.setTitle(result.title)
							.setAuthor({ name: result.profile.name, iconURL: result.meta_url.favicon, url: result.profile.url })
							.setDescription(turndownService.turndown(result.description))
							.setURL(result.url)
					],
				},
				name: result.profile.name,
				description: result.title.substring(0, 99) || 'No title',
				emoji: (getEmoji(emojiName) || '').toString() || '🔍',
			};
		});
		await pagination({ interaction, message, pages, type: 'select' });
	},
} as ICommand;
