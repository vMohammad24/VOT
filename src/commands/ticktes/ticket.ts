import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	name: 'ticket',
	description: 'Ticket commands',
	options: [
		{
			name: 'add',
			description: 'Add another member to your ticket',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'member',
					description: 'The user to add',
					type: ApplicationCommandOptionType.User,
					required: true,
				},
			],
		},
		{
			name: 'remove',
			description: 'Remove a member from the ticket',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'member',
					description: 'The user to remove',
					type: ApplicationCommandOptionType.User,
					required: true,
				},
			],
		},
	],
	disabled: true,
	execute: async ({ args, member: executer, channel, guild, handler }) => {
		const { prisma } = handler;
		const ticket = await prisma.ticket.findFirst({
			where: {
				guildId: guild?.id!,
				channelId: channel!.id!,
			},
		});
		if (!ticket) {
			return {
				content: 'Invalid channel',
				ephemeral: true,
			};
		}
		const subCommand: 'add' | 'remove' = args.get('add');
		if (!subCommand)
			return {
				content: 'Invalid subcommand',
				ephemeral: true,
			};
		const member = args.get('member') as GuildMember;
		if (!member)
			return {
				content: 'Invalid user',
				ephemeral: true,
			};
	},
} as ICommand;
