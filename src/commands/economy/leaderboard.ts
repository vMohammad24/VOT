import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import numeral from 'numeral';
import ICommand from '../../handler/interfaces/ICommand';

export default {
	name: 'leaderboard',
	description: 'View the economy leaderboard',
	aliases: ['lb'],
	options: [
		{
			name: 'type',
			description: 'The type of leaderboard to view (default: Balance)',
			type: ApplicationCommandOptionType.String,
			required: false,
			choices: [
				'Balance',
				'Commands',
				'Commands Used'
			].map((c) => ({ name: c, value: c })),
		}
	],
	type: 'all',
	execute: async ({ handler: { prisma }, args }) => {
		const f = args.get('type') as string || 'Balance';
		switch (f) {
			case 'Balance':
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
				break;
			case 'Commands':
				const commands = await prisma.command.findMany({
					select: { commandId: true },
				});
				const map = new Map<string, number>();
				commands.forEach((c) => {
					map.set(c.commandId, (map.get(c.commandId) || 0) + 1);
				});
				return {
					embeds: [
						new EmbedBuilder()
							.setTitle('Commands Leaderboard')
							.setDescription(
								Array.from(map)
									.sort((a, b) => b[1] - a[1])
									.map((c, i) => `${i + 1}. **${c[0]}** - ${c[1]}`)
									.slice(0, 10)
									.join('\n'),
							)
							.setColor('Random')
					]
				}
			case 'Commands Used':
				const users2 = await prisma.user.findMany({
					orderBy: {
						commands: {
							_count: 'desc',
						},
					},
					select: {
						id: true,
						commands: true,
					},
					take: 10,
				});
				return {
					embeds: [
						new EmbedBuilder()
							.setTitle('Commands Used Leaderboard')
							.setDescription(
								users2.map((u, i) => `${i + 1}. <@${u.id}> - ${u.commands.length}`).join('\n'),
							)
							.setColor('Random')
					]
				}
		}

	},
} as ICommand;
