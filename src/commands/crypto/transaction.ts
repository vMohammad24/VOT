import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { launchPuppeteer } from '../../util/puppeteer';

const browser = await launchPuppeteer();
export default {
	description: 'Dispalys information about a specefic crypto transaction',
	aliases: ['txid'],
	options: [
		{
			name: 'txid',
			description: 'your transaction id',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: 'all',
	cooldown: 60 * 1000,
	disabled: false,
	execute: async ({ args, interaction }) => {
		const txid = args.get('txid') as string;
		if (!txid)
			return {
				content: 'Invalid txid',
				ephemeral: true,
			};
		await interaction?.deferReply();
		const url = `https://blockchair.com/litecoin/transaction/${txid}`;
		const page = await browser.newPage();
		await page.goto(url);
		await page.setViewport({ width: 2560, height: 1440 });
		await page.locator('span').scroll();
		const screenshot = await page.screenshot({ optimizeForSpeed: true });
		await page.close();
		return {
			files: [{
				attachment: Buffer.from(screenshot),
				name: 'screenshot.png',
			}],
		};
	},
} as ICommand;
