import { getUser } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';
export default async function (command: ICommand, ctx: CommandContext) {
	const { handler, member } = ctx;
	const { banned } = await getUser(member, { banned: true });
	if (banned) return 'You are banned from using VOT.';
	return true;
}
