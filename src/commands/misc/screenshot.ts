import { ApplicationCommandOptionType } from 'discord.js';
import { join } from 'path';
import commandHandler from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { launchPuppeteer } from '../../util/puppeteer';
const browser = await launchPuppeteer();
const page = await browser.newPage();
const blacklist = await (async () => {
	if (commandHandler.verbose)
		commandHandler.logger.info('Loading domain blacklist');
	const path = join(import.meta.dir, '..', '..', '..', 'assets', 'domain_blacklist.txt');
	const text = await Bun.file(path).text();
	const domainRegex = /(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
	if (commandHandler.verbose)
		commandHandler.logger.info('Loaded domain blacklist');
	return text.split('\n').map((a) => a.match(domainRegex)?.[0]);
})()
export default {
	description: 'Takes a screenshot of a website',
	aliases: ['ss'],
	options: [
		{
			name: 'url',
			description: 'The URL of the website to screenshot',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: 'all',
	execute: async ({ interaction, args }) => {
		let url = args.get('url') as string;
		if (!url)
			return {
				content: 'Please provide a URL',
				ephemeral: true,
			};
		if (!url.startsWith('http')) url = `https://${url}`;
		const urlRegex = /^(https?:\/\/)?([\w\d]+\.)?[\w\d]+\.\w+\/?/;
		if (!urlRegex.test(url))
			return {
				content: 'Please provide a valid URL',
				ephemeral: true,
			};
		await interaction?.deferReply();
		if (blacklist.includes(new URL(url).hostname)) return {
			ephemeral: true,
			content: `This site is blacklisted.`
		}
		await page.goto(url);
		const b = await page.$('body');
		try {
			await b?.evaluate((body) => {
				const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
				body.innerHTML = body.innerHTML.replace(ipRegex, 'nuh uh');
			});
		} catch (e) {
			return {
				ephemeral: true,
				content: `This site has screenshotting disabled.`
			}
		}
		const screenshot = await page.screenshot();
		return {
			files: [
				{
					attachment: Buffer.from(screenshot),
					name: 'screenshot.png',
				},
			],
		};
	},
} as ICommand;
