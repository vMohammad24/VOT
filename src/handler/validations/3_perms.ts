import { EmbedBuilder } from 'discord.js';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

export default function (command: ICommand, ctx: CommandContext) {
	if (!command.perms) return true;
	const { perms } = command;
	const { member, user } = ctx;
	if (perms === 'dev') {
		if (!ctx.handler.developers.includes(user.id))
			return false;
		else return true;
	}
	const missingPerms = perms.filter((a) => !member.permissions.has(a));
	if (missingPerms.length > 0)
		return {
			// content: `You are missing the following permissions: ${missingPerms.map((a) => '``' + a + '``').join(', ')}`,
			embeds: [
				new EmbedBuilder()
					.setTitle('Missing Permissions')
					.setColor('Red')
					.setDescription(
						`You are missing the following permissions: ${missingPerms
							.map((a) => '``' + a.toString()
								.replace(/([a-z])([A-Z])/g, '$1 $2')
								.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
								.trim() + '``')
							.join(', ')}`
					)
			],
			ephemeral: true,
		};
	return true;
}
