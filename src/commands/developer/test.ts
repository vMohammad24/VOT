import axios from 'axios';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { pagination } from '../../util/pagination';


import TurnDownService from 'turndown';
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
		await pagination({
			interaction,
			message,
			type: 'select',
			pages: b.data.body.response.news.results.map(x => {
				const description = turndownService.turndown(x.description);
				return {
					name: x.title.slice(0, 99) || 'No title',
					description: description.slice(0, 99) || 'No description',
					page: new EmbedBuilder().setTitle(
						x.title
					).setDescription(
						description
					).setURL(
						x.url
					).setAuthor({ iconURL: x.meta_url.favicon, name: x.meta_url.hostname })
						.setURL(x.url)
				}
			})
		})
	},
} as ICommand;
