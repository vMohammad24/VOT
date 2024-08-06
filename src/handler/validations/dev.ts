import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';
export default async function (command: ICommand, ctx: CommandContext) {
	const { handler, user } = ctx;
	if (handler.prodMode || handler.developers.includes(user.id)) return true;
	return false;
}
