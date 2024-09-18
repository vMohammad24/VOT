import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'test command for devs',
	perms: 'dev',
	disabled: true,
	execute: async ({ member, interaction, handler, args, message }) => {
		const urlS = message?.attachments.first()?.url!;
		const Rurl = new URL(urlS);
		const url = urlS.replace(Rurl.search, '');
	},
} as ICommand;
