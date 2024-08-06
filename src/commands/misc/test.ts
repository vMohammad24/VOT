import type ICommand from '../../handler/interfaces/ICommand';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration'; // import plugin
import puppeteer from 'puppeteer';
dayjs.extend(duration); // use plugin

export default {
	description: 'test command for devs',
	perms: 'dev',
	execute: async ({ interaction, handler, args }) => {
		const url = `https://google.com`;
		const browser = await puppeteer.launch({ headless: true });
		// Create a new page
		const page = await browser.newPage();
		// Navigate to the URL
		await page.goto(url);
		// Capture a screenshot
		const screenshot = await page.screenshot({ optimizeForSpeed: true });

		return {
			files: [screenshot],
		};
	},
} as ICommand;
