import { ApplicationCommandOptionType } from 'discord.js';
import { join } from 'path';
import { URL } from 'url';
import commandHandler from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { launchPuppeteer } from '../../util/puppeteer';
const browser = await launchPuppeteer();
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
		{
			name: 'wait',
			description: 'Whether to wait for the page to finish loading',
			type: ApplicationCommandOptionType.Boolean,
			required: false,
		}
	],
	type: 'all',
	execute: async ({ interaction, args }) => {
		let url = args.get('url') as string;
		const wait = args.get('wait') as boolean || false;
		if (!url)
			return {
				content: 'Please provide a URL',
				ephemeral: true,
			};
		if (!url.startsWith('http')) url = `https://${url}`;
		let urlObject: URL | null = null;
		try {
			urlObject = new URL(url);
		} catch (e) {
			return {
				content: 'Please provide a valid URL',
				ephemeral: true
			}
		}
		if (!urlObject) return {
			content: 'Please provide a valid URL',
			ephemeral: true
		}
		if (!urlObject.hostname)
			return {
				content: 'Please provide a valid URL',
				ephemeral: true
			}
		await interaction?.deferReply();
		const time = Date.now();

		if (blacklist.includes(urlObject.hostname)) return {
			ephemeral: true,
			content: `This site is blacklisted.`
		}
		const page = await browser.newPage();
		await page.goto(url);
		const b = await page.$('body');
		try {
			await b?.evaluate((body) => {
				const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
				body.innerHTML = (body.innerHTML as string).replaceAll(ipRegex, 'nuh uh');
			});
		} catch (e) {
			return {
				ephemeral: true,
				content: `This site has screenshotting disabled.`
			}
		}
		if (wait) await page.waitForNetworkIdle();
		const screenshot = await page.screenshot({
			// quality: 50,
			// optimizeForSpeed: true,
			// type: 'jpeg',
		});
		page.close();
		return {
			files: [
				{
					attachment: Buffer.from(screenshot),
					name: 'screenshot.jpg',
				},
			],
			content: `-# Total: ${Date.now() - time}`,
		};
	},
} as ICommand;
