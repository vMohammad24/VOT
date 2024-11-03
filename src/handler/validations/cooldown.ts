import { Collection } from 'discord.js';
import { getUserByID } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

const cooldowns = new Collection();

export default async function (command: ICommand, ctx: CommandContext) {
	const { cooldown } = command;
	const { user, handler: { prisma } } = ctx;
	if (!cooldown) return true;
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Collection());
	}
	const { tier } = await getUserByID(user.id, { tier: true });
	if (tier && (tier == 'Premium' || tier == 'Beta' || tier == 'Staff')) return true;
	const now = Date.now();
	const timestamps = cooldowns.get(command.name) as Collection<string, number>;
	if (timestamps.has(user.id)) {
		const expirationTime = timestamps.get(user.id)! + cooldown;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1_000);
			return 'You are on cooldown, please wait ' + (expiredTimestamp - Math.round(now / 1_000)) + ' seconds.';
		}
	}
	timestamps.set(user.id, now);
	setTimeout(() => timestamps.delete(user.id), cooldown);
	return true;
}
