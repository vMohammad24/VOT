import type { IListener } from '../handler/ListenerHandler';

export default {
	name: 'New Guild Event',
	description: 'why did i evnee put a desciprioptn her lmao',
	execute: async ({ client, prisma }) => {
		client.on('guildCreate', async (guild) => {
			const guildMembers = await guild.members.cache;
			await prisma.guild.upsert({
				where: {
					id: guild.id,
				},
				update: {
					name: guild.name,
					icon: guild.icon,
				},
				create: {
					id: guild.id,
					name: guild.name,
					icon: guild.icon,
					members: {
						createMany: {
							skipDuplicates: true,
							data: guildMembers.map((member) => ({
								userId: member.id,
							})),
						},
					},
				},
			});
		});
	},
} as IListener;
