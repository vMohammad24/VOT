import { ApplicationCommandOptionType, EmbedBuilder, type BaseGuildTextChannel } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { createCase } from '../../util/cases';

export default {
	description: 'Nukes a channel',
	perms: ['ManageChannels', 'ManageMessages', 'ManageGuild'],
	options: [
		{
			name: 'channel',
			description: 'The channel to nuke',
			type: ApplicationCommandOptionType.Channel,
			required: false,
		},
	],
	execute: async ({ channel, guild, member, args }) => {
		const c = (args.get('channel') as BaseGuildTextChannel) || channel;
		if (!c) {
			return 'Please provide a valid channel';
		}
		await c
			.clone({ reason: 'Nuked', name: c.name })
			.then(async (ch) => {
				const oldId = c.id;
				const newId = ch.id;

				await commandHandler.prisma.$transaction([
					commandHandler.prisma.giveaway.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.ticket.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.ticketSettings.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.verificationSettings.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.welcomeSettings.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.stickyMessage.updateMany({
						where: { channelId: oldId },
						data: { channelId: newId }
					}),
					commandHandler.prisma.voiceMaster.updateMany({
						where: { textChannel: oldId },
						data: { textChannel: newId }
					}),
					commandHandler.prisma.voiceMaster.updateMany({
						where: { voiceChannel: oldId },
						data: { voiceChannel: newId }
					}),
					commandHandler.prisma.guild.updateMany({
						where: { loggingChannel: oldId },
						data: { loggingChannel: newId }
					}),

				]);

				c.delete(`Nuked by ${member.user.tag}`).catch(() => { });
				const embed = new EmbedBuilder()
					.setTitle('Nuked')
					.setDescription(`#${c.name} has been nuked`)
					.setColor('Random')
					.setTimestamp()
					.setFooter({
						text: `Nuked by ${member.user.displayName}`,
						iconURL: member.user.displayAvatarURL(),
					})
					.setImage('https://cdn.nest.rip/uploads/73134e91-7998-4e63-b9e6-11832b4f7cac.gif');
				await ch.send({ embeds: [embed] });

				await createCase(
					guild.id,
					'Nuke',
					channel.id,
					member.id,
					`Nuked channel #${c.name}`
				);
			})
			.catch((err) => {
				return err;
			});
	},
} as ICommand;
