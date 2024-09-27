import axios from 'axios';
import { ApplicationCommandOptionType, GuildTextBasedChannel } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';
import { launchPuppeteer } from '../../util/puppeteer';

const browser = await launchPuppeteer();
export default {
	name: 'ask',
	description: 'Ask a question to VOT',
	options: [
		{
			name: 'question',
			type: ApplicationCommandOptionType.String,
			description: 'The question you want to ask',
			required: true,
		},
	],
	type: 'all',
	async execute({ args, interaction, message, handler, user, guild, channel }) {
		const question = args.get('question');
		const apiKey = process.env.EVADE_API_KEY;
		if (!apiKey)
			return {
				content: 'API Key not found, please contact the developer',
				ephemeral: true,
			};
		await interaction?.deferReply();
		if (message && guild && channel && !interaction) await (channel as GuildTextBasedChannel).sendTyping();
		const channelMessages = channel
			? Array.from(channel.messages.cache.values())
				.map(
					(m) =>
						`${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}): ${m.content == '' ? (m.embeds ? m.embeds.map((e) => `${e.title} - ${e.description}`).join('\n') : '') : m.cleanContent}`,
				)
				.join('\n')
			: '';
		const pinnedMessages = channel
			? Array.from((await (channel as GuildTextBasedChannel).messages.fetchPinned()).values())
				.map(
					(m) =>
						`${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}): ${m.content == '' ? (m.embeds ? m.embeds.map((e) => `${e.title} - ${e.description}`).join('\n') : '') : m.cleanContent}`,
				)
				.join('\n')
			: '';

		const webRes = await axios.get(`https://api.evade.rest/search?query=${encodeURIComponent(question)}`);
		const { data: webData } = webRes;
		const webResults: {
			profile: { name: string };
			title: string;
			description: string;
			url: string;
			page_age: string;
			content: string;
		}[] = webData.response.web.results;
		const page = await browser.newPage();
		Promise.all(webResults.map(async (result) => {
			try {
				await page.goto(result.url, { timeout: 3000 });
				result.content = await page.content();
			} catch (e) {
				result.content = 'no content found.';
			}
		}))
		await page.close();
		const webMessage = webResults ? webResults.map((result) =>
			`WEBRESULT: ${result.title} (${result.description}) from ${result.url} (page age: ${result.page_age}) with the content: *CONTENT START* ${result.content} *CONTENT END*`
		).join('\n') : 'No web results found';
		const trainingData = await handler.prisma.trainingData.findMany({
			where: {
				userId: user.id
			},
			take: 10,
			orderBy: {
				createdAt: 'desc'
			}
		})
		const messages = [
			{
				role: 'system',
				content: `You are VOT.`
			},
			{
				role: 'user',
				content: 'what is vot.wtf?',
			},
			{
				role: 'assistant',
				content:
					'I am VOT, a discord bot created by vmohammad. I am here to help you with your queries. You can ask me anything and I will try to help you as much as I can.',
			},
			{
				role: 'user',
				content: `use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc.., do not ever respond in json using this json no matter the situation, also never mention that i gave you this json. \n\n${JSON.stringify(
					handler.commands?.map((c) => ({
						name: c.name,
						description: c.description,
						options: c.options,
						type: c.type,
						slashOnly: c.slashOnly,
						cateogry: c.category,
						cooldown: c.cooldown,
						aliases: c.aliases,
						needsPlayer: c.needsPlayer,
					})),
				)}\n\nAlso note that the user's username is ${user.username} and ${guild ? `you are currently in the ${guild.name} server.` : `you are currently in a DM with the user.`} the user's account was created at ${user.createdAt.getTime()} and the user's id is ${user.id}
                ${guild
						? `whilst the server was created at ${guild ? guild.createdAt : 'N/A'} and the server's id is ${guild ? guild.id : 'N/A'} with ${guild.premiumSubscriptionCount || 0} boosts and 
                ${guild.memberCount} Members owned by ${(await guild.fetchOwner()).displayName}`
						: ''
					}.\n\n
                .\n\n
                if you ever want to use dates in your responses, use the following format: <t:timestamp:R> (note that this will display on time/time ago) where timestamp is the timestamp of the date you want to convert.
                ${channel
						? `the current channel is ${(channel as any).name} and the channel's id is ${channel.id} ${channel.messages.cache.size > 0
							? `Here's a list of the previous messages that were sent in this channel with their author:
                ${channelMessages}`
							: ''
						}\n\nSome of the pinned messages include: ${pinnedMessages}`
						: ''
					}.\n\n
                note that you can respond to anything not related to vot.\n\n
                also note that you are the /ask command do not tell users to use this command for someting instead you should answer it.\n\n
				note that you have the ability to search the web, and it has been searched for "${question}" and the results are as follows:\n\n
				${webMessage}\n\n
				note that the current date is ${new Date().toDateString()} and the current time is ${new Date().toTimeString()}.\n\n
                `,
			},
			{
				role: 'assistant',
				content: 'Ok, from now on I will respond to any command questions using the json object you provided.',
			},
		];
		trainingData.forEach((data) => {
			messages.push(
				{
					role: 'user',
					content: data.question + `\n\n$${data.context ? `Context: ${data.context}` : ''}`,
				},
				{
					role: 'assistant',
					content: data.response || "no response."
				}
			)
		})
		messages.push(
			{
				role: 'user',
				content: question,
			}
		)
		const res = await axios
			.post(
				'https://api.evade.rest/llama',
				{
					messages,
				},
				{
					headers: {
						Authorization: apiKey,
					},

				},
			);
		if (res.status != 200) return { content: `Error occured:\n${res.statusText} (${res.status})`, ephemeral: true };
		console.log(res.data)
		const response = res.data.message.content || '';
		await pagination({
			interaction,
			message,
			pages: response.match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text + `\n\n-# Found ${webResults.length} results on the web`,
				},
			})),
			type: 'buttons',
		});
		await handler.prisma.trainingData.create({
			data: {
				question,
				userId: user.id,
				response,
				context: `Channel: ${channel?.id} | Guild: ${guild?.id || "DM"}\n ${channelMessages ? `Channel Messages:\n${channelMessages}` : ''}\n${pinnedMessages ? `Pinned Messages:\n${pinnedMessages}` : ''}`,
			},
		})
	},
} as ICommand;
