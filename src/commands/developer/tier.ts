import { UserTier } from '@prisma/client';
import { ApplicationCommandOptionType, User } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import VOTEmbed from '../../util/VOTEmbed';

export default {
	description: "Update a user's tier",
	perms: 'dev',
	type: 'dmOnly',
	options: [
		{
			name: 'user',
			description: 'the user to give the tier to',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'tier',
			description: 'the tier to give the user',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: Object.values(UserTier).map((tier) => ({
				name: tier,
				value: tier,
			})),
		},
	],
	execute: async ({ handler, args }) => {
		const { prisma } = handler;
		const user = args.get('user') as User | undefined;
		const tier = (args.get('tier') as UserTier) || 'Normal';
		if (!user) return { content: 'User not found', ephemeral: true };
		const pUser = await prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				tier,
			},
		});
		// return `Updated ${pUser.name} to ${pUser.tier}`;
		return {
			embeds: [
				new VOTEmbed()
					.setTitle('Tier Updated')
					.setDescription(`Updated ${pUser.name} to ${pUser.tier}`)
					.setAuthor({ name: pUser.name!, iconURL: pUser.avatar || undefined })
				// .setColor('GREEN'),
			],
			ephemeral: true,
		};
	},
} as ICommand;
