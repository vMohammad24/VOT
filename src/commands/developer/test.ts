import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

import { launchPuppeteer } from '../../util/puppeteer';
const hasher = new Bun.CryptoHasher('sha256');
function generateBraveServicesKey(apiKey: string): string {
	hasher.update(apiKey);
	return hasher.digest('hex');
}
const browser = await launchPuppeteer();



export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	execute: async ({ user, interaction, handler, args, guild, channel, message }) => {

	},
} as ICommand;
