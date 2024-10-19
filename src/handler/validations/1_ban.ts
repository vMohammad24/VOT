import { getUser } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';
export default async function (command: ICommand, ctx: CommandContext) {
	const { handler, user } = ctx;
	const { banned } = await getUser(user, { banned: true });
	if (banned) return false;
	return true;
}
