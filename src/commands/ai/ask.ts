import axios from 'axios';
import { ApplicationCommandOptionType, GuildTextBasedChannel } from 'discord.js';
import { Page } from 'puppeteer';
import TurndownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';
import { launchPuppeteer } from '../../util/puppeteer';

const browser = await launchPuppeteer();
const turndownService = new TurndownService();

const discordmarkDownTutorialFn = async (page: Page) => {
	await page.goto('https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline')
	const content = await page.content();
	return content;
}
let discordmarkDownTutorial: string | undefined = undefined;
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

		const users = guild ? await guild.members.cache.map(user => `username: ${user.displayName}, id: ${user.id}, role: ${user.roles.highest.name}`).join('\n') : undefined;

		const webRes = await axios.get(`https://api.evade.rest/search?query=${encodeURIComponent(question)}`);
		const { data: webData } = webRes;
		const webResults: {
			profile: { name: string };
			title: string;
			description: string;
			url: string;
			page_age: string;
			content: string;
		}[] = webData.response.web.results || [];
		const page = await browser.newPage();
		Promise.all(webResults.map(async (result) => {
			try {
				await page.goto(result.url, { timeout: 3000 });
				result.content = await page.content();
			} catch (e) {
				result.content = 'no content found.';
			}
		}))
		if (!discordmarkDownTutorial) discordmarkDownTutorial = await discordmarkDownTutorialFn(page);
		await page.close();
		const webMessage = webResults ? webResults.map((result) =>
			`WEBRESULT: ${result.title} (${result.description}) from ${result.url} (page age: ${result.page_age}) with the content: *CONTENT START* ${turndownService.turndown(result.content ?? '')} *CONTENT END*`
		).join('\n') : 'No web results found';
		const trainingData = await handler.prisma.trainingData.findMany({
			where: {
				userId: user.id
			}
		})
		const messages = [
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
				content: question,
			}
		];
		const res = await axios
			.post(
				'https://api.evade.rest/streamingchat',
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
		const response = res.data || '';
		if (!response) {
			return {
				content: 'API returned an empty response',
				ephemeral: true
			}
		}
		await pagination({
			interaction,
			message,
			pages: response.match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text + `\n\n-# Found ${webResults.length} results on the web`,
					allowedMentions: {}
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
