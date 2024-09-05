import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	disabled: true,
	execute: async ({ user, interaction, handler, args }) => {
	},
} as ICommand;
