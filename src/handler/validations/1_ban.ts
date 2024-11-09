import { getUser } from '../../util/database';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';
export default async function (command: ICommand, { user }: CommandContext) {
	const { banned } = await getUser(user, { banned: true })
	return !banned;
}
