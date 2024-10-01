import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';
export default async function (command: ICommand, ctx: CommandContext) {
	const { handler, user, guild } = ctx;
	if (handler.prodMode || handler.developers.includes(user.id) || (guild && handler.developers.includes(guild.id))) return true;
	return false;
}
