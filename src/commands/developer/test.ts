import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'dmOnly',
	cooldown: 60000,
	disabled: true,
	execute: async ({ user, interaction, handler, args, message }) => {
		return 'hi!';
	},
} as ICommand;
