import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import TurnDownService from 'turndown';

const turndownService = new TurnDownService();




export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	options: [{
		name: 'query',
		description: 'The query to search for',
		type: ApplicationCommandOptionType.String,
		required: true,
	}],
	disabled: commandHandler.prodMode,
	execute: async ({ user, interaction, handler, args, guild }) => {
		await handler.prisma.user.update({ where: { id: user.id }, data: { prefix: null } })
		await handler.prisma.guild.update({ where: { id: guild.id }, data: { prefix: "$" } })
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle('Test')
					.setDescription('# This is a test command')
					.addFields({
						name: '# User',
						value: `# ${user.tag}\n${user.id}`,
					})
			]
		}
		// // handler.prisma.guild.update({ where: { id: "1283542021231087728" }, data: { prefix: "!" } })
		// const query = args.get('query') as string;
		// if (!query) return { content: 'Please provide a query to search for', ephemeral: true };
		// // const regex = /const data = (.*?)(\n|$)/s;
		// const res = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`)
		// const regex = /const\s+data\s*=\s*(\[.*?\]|\{.*?\})\s*;/s; // Matches the JSON array/object, stops before any trailing semicolons or code
		// const match = (res.data as string).match(regex);
		// if (!match) return { content: 'No results found', ephemeral: true };
		// let serverResponse = match[1]
		// serverResponse = serverResponse.replace(/void 0/g, 'null');

		// // Step 2: Add quotes around keys
		// serverResponse = serverResponse.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
		// const jsonResponse = JSON.parse(serverResponse);
		// console.log(jsonResponse);
		// let st = '';
		// const response: {
		// 	videos?: { title: string; url: string; description: string }[];
		// 	web?: { title: string; url: string; description: string, name: string; }[];
		// } = {}
		// jsonResponse.forEach((result) => {
		// 	response.videos = [
		// 		...(response.videos ?? []),
		// 		...(result.data.body?.response.videos.results.map((video) => ({
		// 			description: video.description,
		// 			title: video.title,
		// 			url: video.url,
		// 		})) ?? [])
		// 	];
		// 	response.web = [
		// 		...(response.web ?? []),
		// 		...(result.data.body?.response.web.results.map((web) => ({
		// 			description: web.description,
		// 			title: web.title,
		// 			url: web.url,
		// 			name: web.profile.name,
		// 		})) ?? [])
		// 	];
		// })
		// if (!response.web) return { content: 'No web results found', ephemeral: true };
		// const results = response.web;
		// const pages = results.map((result, index) => {
		// 	return {
		// 		page: {
		// 			embeds: [
		// 				new EmbedBuilder()
		// 					.setTitle(result.title)
		// 					.setDescription(turndownService.turndown(result.description))
		// 					.setURL(result.url)
		// 			],
		// 		},
		// 		name: result.name,
		// 	};
		// });
		// const vids = response.videos ? response.videos.map((result, index) => {
		// 	return {
		// 		page: {
		// 			embeds: [
		// 				new EmbedBuilder()
		// 					.setTitle(result.title)
		// 					.setDescription(turndownService.turndown(result.description))
		// 					.setURL(result.url)
		// 			],
		// 		},
		// 		name: result.title.substring(0, 25),
		// 	};
		// }) : [];
		// const msg = await pagination({ interaction, message, pages, type: 'select' });
		// await pagination({ interaction, message: msg, pages: vids, type: 'select' });

		// // console.log(data[0])
		// // console.log(data)
		// // console.log(webResults);
		// // // if (!webResults) return { content: 'No web results found', ephemeral: true };
		// // getWebResults(data);
		// // const pages = webResults!.map((result) => {
		// // 	return {
		// // 		page: {
		// // 			embeds: [new EmbedBuilder()
		// // 				.setTitle(result.title)
		// // 				.setURL(result.url)
		// // 				.setDescription(result.description)]
		// // 		}
		// // 	}
		// // });
		// // await pagination({ interaction, pages, message });
	},
} as ICommand;
