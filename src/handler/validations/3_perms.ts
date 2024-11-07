import { EmbedBuilder } from 'discord.js';
import { camelToTitleCase } from '../../util/util';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

export default function (command: ICommand, ctx: CommandContext) {
	if (!command.perms) return true;
	const { perms } = command;
	const { member, user } = ctx;
	if (perms === 'dev') {
		return ctx.handler.developers.includes(user.id);
	}
	const missingPerms = perms.filter((a) => !member.permissions.has(a));
	if (missingPerms.length > 0)
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle('Missing Permissions')
					.setColor('Red')
					.setDescription(
						`You're missing the following permissions: ${missingPerms
							.map((a) => '``' + camelToTitleCase(a.toString()) + '``')
							.join(', ')}`
					)
			],
			ephemeral: true,
		};
	return true;
}
