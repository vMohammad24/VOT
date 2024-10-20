import { UserTier } from '@prisma/client';
import { getUserByID } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import { type CommandContext } from '../interfaces/ICommand';

export default async function (command: ICommand, ctx: CommandContext) {
	if (!command.userTier) return true;
	const { userTier } = command;
	const { user, handler: { logger } } = ctx;
	if (userTier != 'Normal') {
		const u = await getUserByID(user.id, { tier: true });
		if (!u) return 'You are not in the database';
		if (u.tier == UserTier.Staff) return true;
		return u.tier == userTier;
	}
	return true;
}
