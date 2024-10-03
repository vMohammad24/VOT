import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	execute: async ({ user, interaction, handler, args, message }) => {
		const start = interaction ? interaction.createdTimestamp : message!.createdTimestamp;
		return `Executed in ${Date.now() - start}ms`;
	},
} as ICommand;
