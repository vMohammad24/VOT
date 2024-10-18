import { ApplicationCommandOptionType } from 'discord.js';
import { join } from 'path';
import { URL } from 'url';
import commandHandler from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { cacheSite, getCachedSite } from '../../util/database';
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
		if (!url) {
			return {
				content: 'Please provide a URL',
				ephemeral: true,
			};
		}
		if (!url.startsWith('http')) url = `https://${url}`;
		let urlObject: URL;
		try {
			urlObject = new URL(url);
		} catch {
			return {
				content: 'Please provide a valid URL',
				ephemeral: true
			};
		}
		if (!urlObject.hostname) {
			return {
				content: 'Please provide a valid URL',
				ephemeral: true
			};
		}
		if (blacklist.includes(urlObject.hostname)) return {
			ephemeral: true,
			content: `This site is blacklisted.`
		}
		const time = Date.now();
		const cached = await getCachedSite(url, wait);
		if (cached) return {
			files: [
				{
					attachment: cached,
					name: 'screenshot.png',
				},
			],
			content: `-# Took ${Date.now() - time}ms`
		}
		await interaction?.deferReply();
		const page = await browser.newPage();
		try {
			await page.goto(url, {
				timeout: 3000
			});
		} catch (e) {
			return {
				ephemeral: true,
				content: `This site is not reachable.`
			}
		}
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
		if (wait) await page.waitForNetworkIdle({
			timeout: 3000,
			idleTime: 100,
		});
		// if (wait) await page.waitForNavigation();
		const screenshot = await page.screenshot({
			// quality: 50,
			// optimizeForSpeed: true,
			type: 'png',
		});
		const buffer = Buffer.from(screenshot);
		page.close();
		cacheSite(url, wait, buffer);
		return {
			files: [
				{
					attachment: buffer,
					name: 'screenshot.png',
				},
			],
			content: `-# Took ${Date.now() - time}ms`,
		};
	},
} as ICommand;
