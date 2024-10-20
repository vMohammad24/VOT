import axios from 'axios';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import { ApplicationCommandOptionType } from 'discord.js';
import TurnDownService from 'turndown';
import { launchPuppeteer } from '../../util/puppeteer';
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
	userTier: 'Beta',
	execute: async ({ user, interaction, handler, args, guild, channel, message }) => {
		return 'hi'
	},
} as ICommand;
