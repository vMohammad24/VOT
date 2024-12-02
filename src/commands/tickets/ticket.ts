import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, GuildTextBasedChannel } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { getMember } from '../../util/database';
import { startCloseTimer } from '../../util/tickets';

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
		{
			name: 'closerequest',
			description: 'Request to close a ticket',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'hours',
					description: 'Hours until ticket closes',
					type: ApplicationCommandOptionType.Integer,
					required: true,
					minValue: 1,
					maxValue: 72
				}
			]
		}
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
			},
		});
		if (!ticket) {
			return {
				content: 'Invalid channel',
				ephemeral: true,
			};
		}
		const ticketSettings = await prisma.ticketSettings.findUnique({ where: { guildId: guild!.id } });
		if (!ticketSettings)
			return {
				content: 'Please setup ticket settings first',
				ephemeral: true,
			};
		const ticketsRole = ticketSettings.roleId ? await guild!.roles.fetch(ticketSettings.roleId) : null;
		const subCommand = interaction.options.getSubcommand(true);
		if (!subCommand)
			return {
				content: 'Invalid subcommand',
				ephemeral: true,
			};

		if (ticket.ownerId !== executer.id && !executer.roles.cache.has(ticketsRole!.id)) {
			return {
				content: 'You are not the owner of this ticket',
				ephemeral: true,
			};
		}

		switch (subCommand) {
			case 'add': {
				const member = interaction.options.getMember('member') as GuildMember;
				if (!member)
					return {
						content: 'Invalid user',
						ephemeral: true,
					};
				const pMember = await getMember(member, {
					id: true,
				});
				if (!pMember) {
					return {
						content: `Member ${member.user.tag} not found.`,
						ephemeral: true,
					};
				}
				if (ticket.members.map((a) => a.id).includes(pMember?.id!)) {
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
					});
				}
				return {
					content: `${member.user.tag} has been added to the ticket`,
				};
			}
			case 'remove': {
				const member = interaction.options.getMember('member') as GuildMember;
				if (!member)
					return {
						content: 'Invalid user',
						ephemeral: true,
					};
				const pMember = await getMember(member, {
					id: true,
				});
				if (!pMember) {
					return {
						content: `Member ${member.user.tag} not found.`,
						ephemeral: true,
					};
				}
				if (!ticket.members.map((a) => a.id).includes(pMember?.id!)) {
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
					await channel.permissionOverwrites.delete(member.id);
				}
				return {
					content: `${member.user.tag} has been removed from the ticket`,
				};
			}
			case 'closerequest': {
				const hours = interaction.options.getInteger('hours', true);
				const closeTime = new Date(Date.now() + hours * 1000/*3600000*/);

				const embed = new EmbedBuilder()
					.setTitle('🔔 Ticket Close Request')
					.setDescription(`This ticket has been requested to be closed by ${executer.user.tag}`)
					.addFields(
						{ name: 'Scheduled Close Time', value: `<t:${Math.floor(closeTime.getTime() / 1000)}:R>` }
					)
					.setColor('#FFA500')
					.setTimestamp();
				const timeout = closeTime.getTime() - Date.now();
				startCloseTimer(channel as GuildTextBasedChannel, timeout);
				const row = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setCustomId('close_ticket')
							.setLabel('Close Now')
							.setStyle(ButtonStyle.Danger)
							.setEmoji('🔒'),
						new ButtonBuilder()
							.setCustomId(`cancel_close_req`)
							.setLabel('Cancel Close')
							.setStyle(ButtonStyle.Secondary)
							.setEmoji('❌')
					);

				return {
					content: `<@${ticket.ownerId}>`,
					embeds: [embed],
					components: [row],
					allowedMentions: { users: [ticket.ownerId] }
				};
			}
		}
	},
} as ICommand;
