import axios from 'axios';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';


import TurnDownService from 'turndown';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';
import { isNullish } from '../../util/util';
const turndownService = new TurnDownService();
const parseDDG = async (query: string) => {
	const res1 = (await axios.get(`https://duckduckgo.com/?t=ffab&q=${encodeURIComponent(query)}&ia=web`)).data;
	const lookFor = '<link id="deep_preload_link" rel="preload" as="script" href=';
	const index = res1.indexOf(lookFor);
	const index2 = res1.indexOf('>', index);
	const url = res1.substring(index + lookFor.length + 1, index2 - 2);
	const res2 = (await axios.get(url)).data;
	const urlRegex = /(?:http[s]?:\/\/.)(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
	const urls = res2.match(urlRegex);
	console.log(urls)
}





export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'dmOnly',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	options: [{
		name: 'query',
		description: 'The search query',
		type: ApplicationCommandOptionType.String,
		required: false
	}],
	execute: async ({ user, interaction, handler, args, guild, channel, message }) => {
		const query = args.get('query') as string || 'test';
		const b = await searchBrave(query)
		if (!b.data.body.response.videos.results.length) return {
			content: 'No results found',
			ephemeral: true
		}
		await pagination({
			interaction,
			message,
			type: 'select',
			pages: b.data.body.response.videos.results.map(v => {
				if (isNullish(v.title) || isNullish(v.description)) return null;
				const description = turndownService.turndown(v.description);
				return {
					name: v.title.slice(0, 99) || 'No title',
					description: description.slice(0, 99) || 'No description',
					emoji: (getEmoji(v.meta_url.netloc.split('.')[0]) || '🔗').toString(),
					page: new EmbedBuilder().setTitle(
						v.title
					).setDescription(
						description
					).setURL(
						v.url
					).setAuthor({ iconURL: v.meta_url.favicon, name: v.meta_url.netloc })
						.setThumbnail(v.thumbnail.original)
						.setURL(v.url)
				}
			}).filter(v => v != null)
		})
	},
} as ICommand;
