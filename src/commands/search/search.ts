import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave, searchBraveSuggest } from '../../util/brave';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';
import { isNullish } from '../../util/util';

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
			autocomplete: true,
		},
	],
	autocomplete: async (interaction) => {
		const query = interaction.options.getString('query');
		if (!query) return interaction.respond([{ name: 'No query provided', value: '' }]);
		const json = await searchBraveSuggest(query);
		return interaction.respond(json.map(r => ({ name: r, value: r })));
	},
	type: 'all',
	execute: async ({ args, interaction, message, handler: { client } }) => {
		const query = args.get('query') as string | undefined;
		if (isNullish(query) || !query) return { ephemeral: true, content: 'Please provide a query to search for' };
		const json = await searchBrave(query);
		const { web, infobox } = json.data.body.response;
		const results = web.results;
		let pages = results.map((result) => {
			const emojiName = (() => {
				let r = result.profile.name.toLowerCase().split(' ')[0].trim();
				if (r == 'x') r = 'twitter';
				return r;
			})();
			return {
				page: {
					embeds: [
						new EmbedBuilder()
							.setTitle(result.title)
							.setAuthor({ name: result.profile.name, iconURL: result.meta_url.favicon, url: result.profile.url })
							.setDescription(turndownService.turndown(result.description))
							.setURL(result.url),
					],
				},
				name: result.profile.name,
				description: result.title.substring(0, 99) || 'No title',
				emoji: (getEmoji(emojiName) || '').toString() || '🔍',
			};
		});
		if (infobox) {
			const ib = infobox.results[0];
			if (!isNullish(ib.description)) {
				const description = turndownService.turndown(ib.description);
				const infoPage = {
					page: {
						embeds: [
							new EmbedBuilder()
								.setTitle(ib.title)
								.setDescription(turndownService.turndown(ib.long_desc))
								.setThumbnail(ib.images[0].original)
								.setURL(ib.url)
								.setAuthor({
									name: ib.providers[0].name || 'No title',
									iconURL: ib.providers[0].img || undefined,
									url: ib.providers[0].url || undefined,
								}),
						],
					},
					name: ib.title.slice(0, 99),
					description: description.substring(0, 99) || 'No description',
					emoji: (getEmoji('info') || '').toString() || '🔍',
				};
				pages = [infoPage, ...pages];
			}
		}
		await pagination({ interaction, message, pages, type: 'select', name: 'Select a result' });
	},
} as ICommand;
