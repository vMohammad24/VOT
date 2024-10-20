import axios from 'axios';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import { launchPuppeteer } from '../../util/puppeteer';
import { pagination } from '../../util/pagination';
const hasher = new Bun.CryptoHasher('sha256');
function generateBraveServicesKey(apiKey: string): string {
	hasher.update(apiKey);
	return hasher.digest('hex');
}
const browser = await launchPuppeteer();


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
const turndownService = new TurnDownService();
export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'all',
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
		const searchRes = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`);
		const data = searchRes.data as string;
		const lookFor = 'const data = ';
		const index = data.indexOf(lookFor);
		const endIndex = data.indexOf('];', index);
		const end = data.substring(index + lookFor.length, endIndex + 1);
		// end is a string of a javascript json object
		// const json = JSON.parse(JSON.stringify(end));
		const json = new Function(`return ${end}`)();
		// console.log()
		const results: {
			profile: { name: string };
			title: string;
			description: string;
			url: string;
		}[] = json[1].data.body.response.web.results;
		const pages = results.map((result, index) => {
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
			};
		});
		await pagination({ interaction, message, pages, type: 'select' });
	},
} as ICommand;
