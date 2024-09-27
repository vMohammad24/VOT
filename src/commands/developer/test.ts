import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'all',
	disabled: true,
	options: [
		{
			name: 'test',
			description: 'test',
			type: ApplicationCommandOptionType.String,
		},
	],
	execute: async ({ user, interaction, handler, args, message }) => {
		return { tts: true, content: 'test' };
		// return await handler.prisma.discord.delete({ where: { userId: user.id } })
	},
} as ICommand;
