import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";
export default async function (
	command: ICommand,
	{ handler, user, guild }: CommandContext,
) {
	return (
		handler.prodMode ||
		handler.developers.includes(user.id) ||
		(guild && handler.developers.includes(guild.id))
	);
}
