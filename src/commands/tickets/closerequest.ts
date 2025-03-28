import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type GuildTextBasedChannel,
} from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { startCloseTimer } from "../../util/tickets";

export default {
	name: "ticket closerequest",
	description: "Request to close a ticket",
	options: [
		{
			name: "hours",
			description: "Hours until ticket closes",
			type: ApplicationCommandOptionType.Integer,
			required: false,
		},
	],
	execute: async ({ member: executer, channel, guild, args, handler }) => {
		const hours = (args.get("hours") as number) || 24;
		const closeTime = new Date(Date.now() + hours * 3600000);
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
				content: "Invalid channel",
				ephemeral: true,
			};
		}
		const ticketSettings = await prisma.ticketSettings.findUnique({
			where: { guildId: guild!.id },
		});
		if (!ticketSettings)
			return {
				content: "Please setup ticket settings first",
				ephemeral: true,
			};
		const ticketsRole = ticketSettings.roleId
			? await guild!.roles.fetch(ticketSettings.roleId)
			: null;

		if (
			ticket.ownerId !== executer.id &&
			!executer.roles.cache.has(ticketsRole!.id)
		) {
			return {
				content: "You are not the owner of this ticket",
				ephemeral: true,
			};
		}

		const embed = new EmbedBuilder()
			.setTitle("🔔 Ticket Close Request")
			.setDescription(
				`This ticket has been requested to be closed by ${executer.user.tag}`,
			)
			.addFields({
				name: "Scheduled Close Time",
				value: `<t:${Math.floor(closeTime.getTime() / 1000)}:R>`,
			})
			.setColor("#FFA500")
			.setTimestamp();
		const timeout = closeTime.getTime() - Date.now();
		startCloseTimer(channel as GuildTextBasedChannel, timeout);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("close_ticket")
				.setLabel("Close Now")
				.setStyle(ButtonStyle.Danger)
				.setEmoji("🔒"),
			new ButtonBuilder()
				.setCustomId(`cancel_close_req`)
				.setLabel("Cancel Close")
				.setStyle(ButtonStyle.Secondary)
				.setEmoji("❌"),
		);

		return {
			content: `<@${ticket.ownerId}>`,
			embeds: [embed],
			components: [row],
			allowedMentions: { users: [ticket.ownerId] },
		};
	},
} as ICommand;
