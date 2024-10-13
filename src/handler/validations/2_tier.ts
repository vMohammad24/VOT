import { UserTier } from '@prisma/client';
import { getUserByID } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import { type CommandContext } from '../interfaces/ICommand';

export default async function (command: ICommand, ctx: CommandContext) {
	// TODO: make a way for ppl to parchase tiers

	if (!command.userTier) return true;
	const { userTier } = command;
	const { user } = ctx;
	if (userTier != 'Normal') {
		const u = await getUserByID(user.id, { tier: true });
		if (!u) return 'You are not in the database';
		switch (userTier) {
			case 'Beta':
				if (u.tier != 'Beta') return 'You need to be a beta tester to use this command';
				break;
			case 'Premium':
				if (u.tier != UserTier.Premium && u.tier != UserTier.Beta && u.tier != UserTier.Staff) return 'You need to be a premium user to use this command';
				break;
			default:
				return 'Invalid tier';
		}
	}
	return true;
}
