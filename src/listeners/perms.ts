import type { IListener } from '../handler/ListenerHandler';

export default {
	name: 'Permission updater',
	description: 'Listens for permission changes for the dashboard',
	execute: ({ client, prisma }) => {
		// client.on('guildMemberUpdate', async (oldUser, user) => {
		// 	 if (oldUser.roles != user.roles) await updateGuilds(user.id);
		// });
	},
} as IListener;
