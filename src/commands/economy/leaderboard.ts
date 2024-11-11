import { EmbedBuilder } from 'discord.js';
import numeral from 'numeral';
import ICommand from '../../handler/interfaces/ICommand';

export default {
	name: 'leaderboard',
	description: 'View the economy leaderboard',
	aliases: ['lb'],
	type: 'all',
	execute: async ({ handler: { prisma }, args }) => {
		const users = await prisma.economy.findMany({
			orderBy: {
				balance: 'desc',
			},
			select: {
				user: {
					select: {
						name: true,
					},
				},
				balance: true,
			},
			take: 10,
		});

		const embed = new EmbedBuilder()
			.setTitle('Economy Leaderboard')
			.setDescription(
				users.map((u, i) => `${i + 1}. **${u.user.name}** - $${numeral(u.balance).format('0,0')}`).join('\n'),
			)
			.setColor('Random');
		return {
			embeds: [embed],
		};
	},
} as ICommand;
