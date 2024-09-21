import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'dmOnly',
	// disabled: true,
	execute: async ({ user, interaction, handler, args, message }) => {
		return await handler.prisma.discord.delete({ where: { userId: user.id } })
	},
} as ICommand;
