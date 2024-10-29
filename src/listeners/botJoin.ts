import { Events } from 'discord.js';
import type { IListener } from '../handler/ListenerHandler';

export default {
	name: 'New Guild Event',
	description: 'why did i evnee put a desciprioptn her lmao',
	execute: async ({ client, prisma }) => {
		client.on(Events.GuildCreate, async (guild) => {
			const guildMembers = await guild.members.cache;
			const bans = await guild.bans.fetch();
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
							})).concat(bans.map((ban) => ({
								userId: ban.user.id,
								banned: true,
							}))),
						},
					},
				},
			});

		});
	},
} as IListener;
