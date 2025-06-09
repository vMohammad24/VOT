import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers";
import axios from "axios";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type CategoryChannel,
	ChannelType,
	EmbedBuilder,
	type GuildMember,
	type GuildTextBasedChannel,
	PermissionFlagsBits,
	type User,
} from "discord.js";
import commandHandler from "..";
import { getUser } from "./database";
import { uploadFile } from "./nest";
import { getFrontEndURL } from "./urls";
import { getLogChannel } from "./util";

export async function createTicket(member: GuildMember, reason: string) {
	const { guild } = member;
	const { prisma } = commandHandler;
	const ticketSettings = await prisma.ticketSettings.findUnique({
		where: {
			guildId: guild.id!,
		},
	});
	const alreadyExists = await prisma.ticket.findFirst({
		where: {
			guildId: guild.id!,
			ownerId: member.id!,
			open: true,
		},
	});
	if (alreadyExists) {
		return {
			error: `You already have an open ticket <#${alreadyExists.channelId}>`,
		};
	}
	const channel = await guild?.channels.create({
		name: `ticket-${member.user.username}`.slice(0, 32),
		type: ChannelType.GuildText,
		permissionOverwrites: [
			{
				id: guild.id!,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: member.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
			// so vscode doesnt get mad
			...(ticketSettings?.categoryId && ticketSettings?.roleId
				? [
						{
							id: ticketSettings.roleId!,
							allow: [PermissionFlagsBits.ViewChannel],
						},
					]
				: []),
		],
		parent: ticketSettings?.categoryId
			? (guild.channels.cache.get(ticketSettings.categoryId) as CategoryChannel)
			: undefined,
		reason: `Ticket created by ${member.user.tag} for ${reason}`,
	});
	if (!channel) return { error: "An error occurred while creating the ticket" };
	const pUser = await getUser(member.user);
	const ticket = await prisma.ticket.create({
		data: {
			guildId: guild.id!,
			channelId: channel.id,
			ownerId: pUser.id,
			open: true,
			reason,
		},
	});
	const embed = new EmbedBuilder()
		.setTitle("Ticket Created")
		.setDescription(`Open Reason:\n\`\`\`${reason}\`\`\``)
		.setColor("Green");
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("close_ticket")
			.setLabel("Close Ticket")
			.setStyle(ButtonStyle.Danger)
			.setEmoji("🔒"),
	);
	channel?.send({
		embeds: [embed],
		components: [row],
		content: `<@${member.id}>, please wait for a staff member to respond`,
	});
	const logEmbed = new EmbedBuilder()
		.setTitle("Ticket Created")
		.setDescription(`${channel.name} has been created for ${reason}`)
		.setAuthor({ name: member.user.tag, iconURL: member.displayAvatarURL() })
		.setColor("Green")
		.setTimestamp();
	const logChannel = await getLogChannel(guild);
	logChannel?.send({ embeds: [logEmbed] });
	return { channel, ticket };
}

export async function closeTicket(
	channel: GuildTextBasedChannel,
	closedBy: GuildMember,
) {
	const { prisma } = commandHandler;
	const ticketData = await prisma.ticket.findFirst({
		where: {
			channelId: channel.id,
		},
	});
	if (!ticketData) {
		const embed = new EmbedBuilder()
			.setTitle("Error")
			.setDescription("This is not a ticket channel")
			.setColor("Red");
		return { embeds: [embed] };
	}
	const chan = (await channel.guild?.channels.fetch(
		channel.id,
	)) as GuildTextBasedChannel;
	if (!chan) return { error: "An error occurred while fetching the channel" };
	const ticketOwner = await channel.guild?.members.fetch(ticketData.ownerId);
	const cdnId = await transcriptTicket(chan);
	await chan.delete();
	await prisma.ticket.update({
		where: {
			id: ticketData.id,
		},
		data: {
			open: false,
			transcriptId: cdnId,
		},
	});
	const logChannel = await getLogChannel(channel.guild);
	const logEmbed = new EmbedBuilder()
		.setTitle("Ticket Closed")
		.setDescription(`<@${ticketData.ownerId}> ticket's has been closed`)
		.setAuthor({
			name: closedBy.user.tag,
			iconURL: closedBy.user.displayAvatarURL(),
		})
		.setColor("Red")
		.setTimestamp();
	const userEmbed = new EmbedBuilder()
		.setTitle("Ticket Closed")
		.setAuthor({
			name: closedBy.user.tag,
			iconURL: closedBy.user.displayAvatarURL(),
		})
		.setDescription(
			`A ticket you have opened in ${chan.guild.name} has been closed`,
		)
		.setTimestamp()
		.setColor("Red")
		.setFooter({ text: `Ticket ID: ${ticketData.id}` });
	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setLabel("Transcript")
			.setStyle(ButtonStyle.Link)
			.setEmoji("📋")
			.setURL(`${getFrontEndURL()}/ticket/${ticketData.id}`),
	);
	logChannel?.send({ embeds: [logEmbed], components: [actionRow] });
	try {
		await ticketOwner?.send({ embeds: [userEmbed], components: [actionRow] });
	} catch (e) {}
	return { content: "Ticked closed. " };
}

export async function transcriptTicket(
	channel: GuildTextBasedChannel,
): Promise<string | undefined> {
	const { prisma } = commandHandler;
	const ticketData = await prisma.ticket.findFirst({
		where: {
			channelId: channel.id,
		},
	});
	if (!ticketData) {
		const embed = new EmbedBuilder()
			.setTitle("Error")
			.setDescription("This is not a ticket channel")
			.setColor("Red");
		return undefined;
	}
	const messages = await channel.messages.fetch({ limit: 100 });
	let lastMessageId = messages.last()?.id;

	while (lastMessageId) {
		const newMessages = await channel.messages.fetch({
			limit: 100,
			before: lastMessageId,
		});
		if (newMessages.size === 0) break;

		newMessages.forEach((msg) => messages.set(msg.id, msg));
		lastMessageId = newMessages.last()?.id;
	}
	// const json = await Promise.all(messages.values().map(async (message) => ({
	// 	message: {
	// 		attachments: await Promise.all(
	// 			message.attachments.map(async (attachment) => {
	// 				const file = new File(
	// 					[(await axios.get(attachment.proxyURL, { responseType: 'blob' })).data],
	// 					attachment.name,
	// 					{ type: attachment.contentType || undefined },
	// 				);
	// 				const uploadedData = await uploadFile(file);
	// 				return uploadedData.cdnFileName;
	// 			}),
	// 		),
	// 		content: message.content,
	// 		embeds: message.embeds,
	// 	},
	// 	user: {
	// 		tag: message.author.tag,
	// 		avatar: message.author.displayAvatarURL(),
	// 		color: message.member?.displayHexColor,
	// 		icon: message.member?.roles.cache.filter((role) => role.icon).sort((a, b) => b.position - a.position).first()?.iconURL(),
	// 		bot: message.author.bot
	// 	},
	// 	timestamp: message.createdTimestamp,
	// 	edited: message.editedTimestamp !== null,
	// 	id: message.id,
	// })))
	const users: {
		tag: string;
		avatar: string;
		color?: string;
		icon?: string;
		bot: boolean;
		clan: string | null;
		id: string;
	}[] = [];
	const messagesArray = await Promise.all(
		messages.values().map(async (message) => {
			const aUI = message.interaction?.user;
			const addUser = async (user: User) => {
				if (!users.some((u) => u.id === user.id)) {
					const pUser = await getUser(user, { clan: { select: { id: true } } });
					users.push({
						tag: user.tag,
						avatar: user.displayAvatarURL(),
						color: message.member?.displayHexColor,
						icon:
							message.member?.roles.cache
								.filter((role) => role.icon)
								.sort((a, b) => b.position - a.position)
								.first()
								?.iconURL() || undefined,
						bot: user.bot,
						clan: pUser?.clan ? pUser.clan.id : null,
						id: user.id,
					});
				}
			};

			if (message.author.bot && aUI) {
				await addUser(aUI);
			}
			await addUser(message.author);
			users.filter(
				(user, index, self) =>
					self.findIndex((u) => u.id === user.id) === index,
			);
			return {
				message: {
					attachments: await Promise.all(
						message.attachments.map(async (attachment) => {
							const file = new File(
								[
									new Blob([
										new Uint8Array(
											(
												await axios.get(attachment.url, {
													responseType: "arraybuffer",
												})
											).data,
										),
									]),
								],
								attachment.name,
								{ type: attachment.contentType || undefined },
							);
							const uploadedData = await uploadFile(file);
							return {
								id: uploadedData.cdnFileName,
								name: attachment.name,
								contentType: attachment.contentType,
								size: attachment.size,
							};
						}),
					),
					content: message.content,
					embeds: message.embeds,
					interaction: message.interaction || undefined,
				},
				userId: message.author.id,
				timestamp: message.createdTimestamp,
				edited: message.editedTimestamp !== null,
				id: message.id,
			};
		}),
	);
	const json = { users, messages: messagesArray };
	const file = new File([JSON.stringify(json)], `${ticketData.id}.json`, {
		type: "application/json",
	});
	const uploadedData = await uploadFile(file);
	return uploadedData.cdnFileName;
}
const map = new Map<string, Timer>();
export async function startCloseTimer(
	channel: GuildTextBasedChannel,
	timeout: number,
) {
	const ticket = await commandHandler.prisma.ticket.findFirst({
		where: {
			channelId: channel.id,
		},
	});
	if (!ticket) return;
	const to = setTimeout(async () => {
		await closeTicket(channel, await channel.guild.members.fetchMe());
	}, timeout);
	const id = randomUUID();
	map.set(id, to);
	await commandHandler.prisma.ticket.update({
		where: {
			id: ticket.id,
		},
		data: {
			closeReqId: id,
		},
	});
}

export async function cancelCloseTimer(channel: GuildTextBasedChannel) {
	const ticket = await commandHandler.prisma.ticket.findFirst({
		where: {
			channelId: channel.id,
		},
	});
	if (!ticket) return;
	const id = ticket.closeReqId;
	if (!id) {
		return {
			error: `No close request id found for ticket ${ticket.id}`,
		};
	}
	const timer = map.get(id);
	if (timer) {
		clearTimeout(timer);
		map.delete(id);
	}
	await commandHandler.prisma.ticket.update({
		where: {
			id: ticket.id,
		},
		data: {
			closeReqId: null,
		},
	});
}
