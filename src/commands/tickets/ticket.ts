import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { getMember } from '../../util/database';

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
	slashOnly: true,
	// disabled: true,
	execute: async ({ member: executer, channel, guild, handler, interaction }) => {
		if (!interaction) return;
		const { prisma } = handler;
		const ticket = await prisma.ticket.findFirst({
			where: {
				guildId: guild?.id!,
				channelId: channel!.id!,
			},
			include: {
				members: true,
			}
		});
		if (!ticket) {
			return {
				content: 'Invalid channel',
				ephemeral: true,
			};
		}
		const subCommand = interaction.options.getSubcommand(true);
		if (!subCommand)
			return {
				content: 'Invalid subcommand',
				ephemeral: true,
			};
		const member = interaction.options.getMember('member') as GuildMember;
		if (!member)
			return {
				content: 'Invalid user',
				ephemeral: true,
			};
		if (ticket.ownerId !== executer.id) {
			return {
				content: 'You are not the owner of this ticket',
				ephemeral: true,
			};
		}
		const pMember = await getMember(member, {
			id: true
		});
		if (!pMember) {
			return {
				content: `Member ${member.user.tag} not found.`,
				ephemeral: true,
			}
		}
		switch (subCommand) {
			case 'add': {
				if (ticket.members.map(a => a.id).includes(pMember?.id!)) {
					return {
						content: `${member.user.tag} is already in this ticket`,
						ephemeral: true,
					};
				}
				await prisma.ticket.update({
					where: {
						id: ticket.id,
					},
					data: {
						members: {
							connect: {
								id: pMember?.id!,
							},
						},
					},
				});
				if (channel.isTextBased() && 'permissionOverwrites' in channel) {
					await channel.permissionOverwrites.create(member.id, {
						ViewChannel: true,
					})
				}
				return {
					content: `${member.user.tag} has been added to the ticket`,
				};
			}
			case 'remove': {
				if (!ticket.members.map(a => a.id).includes(pMember?.id!)) {
					return {
						content: `${member.user.tag} is not in this ticket`,
						ephemeral: true,
					};
				}
				await prisma.ticket.update({
					where: {
						id: ticket.id,
					},
					data: {
						members: {
							disconnect: {
								id: pMember?.id!,
							},
						},
					},
				});
				if (channel.isTextBased() && 'permissionOverwrites' in channel) {
					await channel.permissionOverwrites.delete(member.id)
				}
				return {
					content: `${member.user.tag} has been removed from the ticket`,
				};
			}
		}
	},
} as ICommand;
