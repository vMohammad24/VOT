import axios from 'axios';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';

const turndownService = new TurnDownService();
export default {
	description: 'Search for a query on the internet',
	category: 'misc',
	aliases: ['google'],
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
		const searchRes = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`);
		const data = searchRes.data as string;
		const lookFor = 'const data = ';
		const index = data.indexOf(lookFor);
		const endIndex = data.indexOf('];', index);
		const end = data.substring(index + lookFor.length, endIndex + 1);
		const json = new Function(`"use strict";return ${end}`)();
		const results: {
			profile: { name: string };
			title: string;
			description: string;
			url: string;
		}[] = json[1].data.body.response.web.results;
		const pages = results.map((result, index) => {
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
