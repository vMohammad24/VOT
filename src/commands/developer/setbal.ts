import { ApplicationCommandOptionType } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { getUserByID } from '../../util/database';

export default {
	name: 'setbal',
	description: 'Set the balance of a user',
	aliases: ['setbalance'],
	perms: 'dev',
	type: 'dmOnly',
	options: [
		{
			name: 'user',
			description: 'The user whose balance you want to set',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'amount',
			description: 'The amount to set the balance to',
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
	],
	execute: async ({ user: author, args, handler: { prisma } }) => {
		const userId = args.get('user').id;
		const amount = args.get('amount');
		const p = await getUserByID(userId, { id: true });
		const pUser = await prisma.economy.findFirst({
			where: {
				userId: p.id,
			},
		});
		if (!pUser)
			return {
				content: 'User does not have an economy account',
				ephemeral: true,
			};
		const up = await prisma.economy.update({
			where: {
				userId: userId,
			},
			data: {
				balance: amount,
			},
			include: {
				user: {
					select: {
						name: true,
					},
				},
			},
		});
		return `Set balance of <@${userId}> (${up.user.name}) to ${up.balance}`;
	},
} as ICommand;
