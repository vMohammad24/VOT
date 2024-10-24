import axios from 'axios';
import { ApplicationCommandOptionType } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import TurnDownService from 'turndown';
import { searchBrave } from '../../util/brave';
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
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	options: [
		{
			name: 'person',
			description: 'The person you want to ask',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: 'query',
			description: 'The search query',
			type: ApplicationCommandOptionType.String,
			required: false
		}],
	userTier: "Premium",
	execute: async ({ user, interaction, handler, args, guild, channel, message, editReply }) => {
		const query = args.get('query') as string || 'test';
		const person = args.get('person') as string || 'playboicartii';
		// const person = query.split(' ')[0]
		await interaction?.deferReply();
		const brave = await searchBrave(query)
		const { infobox, web } = brave.data.body.response;
		const systemPrompt = `You Are ${person} and have to act like them all the time never forget that, you have to talk like them and talk to the user as of they were your friend even if you dont know them, ${infobox?.results.map(result => `
			${result.title} is ${result.long_desc}. Some of your pictures are ${(result.images || []).map(image => `
				${image.src} (${image.alt}) 
				`).join(' ')}, just say that you are ${person} and act like them, some more data about you (${person}) are: ${web.results.map(result => `
					${result.title} - ${result.description} - ${result.faq} - ${result.article}`).join(' ')}
				`).join('\n\n')}`
		const res = await axios.post('https://www.blackbox.ai/api/chat',
			{
				"agentMode": {},
				"clickedAnswer2": false,
				"clickedAnswer3": false,
				"clickedForceWebSearch": true,
				"codeModelMode": true,
				"githubToken": null,
				"id": "dwadwa",
				"isChromeExt": false,
				"isMicMode": true,
				"maxTokens": 8048,
				"messages": [
					{
						"content": query,
						"role": "user"
					}
				],
				"mobileClient": true,
				"playgroundTemperature": 0.1,
				"playgroundTopP": 0.9,
				"previewToken": null,
				"trendingAgentMode": {},
				"userId": null,
				"userSelectedModel": null,
				"userSystemPrompt": systemPrompt,
				"visitFromDelta": false
			}
		)


	},
} as ICommand;
