import { ChannelType, EmbedBuilder, Guild, type GuildTextBasedChannel } from 'discord.js';
import commandHandler from '..';
import type { IListener } from '../handler/ListenerHandler';

const getLogChannel = async (guild: Guild) => {
	const g = await commandHandler.prisma.guild.upsert({
		where: {
			id: guild.id,
		},
		update: {},
		create: {
			id: guild.id,
			name: guild.name,
			icon: guild.icon || '',
		},
	});
	if (!guild || !g || !g.loggingChannel) return null;
	return (guild.channels.cache.get(g.loggingChannel) as GuildTextBasedChannel) || null;
};

export default {
	description: 'Listens for logs',
	name: 'Logs Handler',
	execute: ({ client, kazagumo }) => {
		client.on('messageDelete', async (message) => {
			if (message.author!.bot) return;
			const logChannel = await getLogChannel(message.guild!);
			if (!logChannel) return;
			// check if it was deleted by the bot
			const embed = new EmbedBuilder()
				.setTitle('Message Deleted')
				.setAuthor({
					name: message.author!.tag,
					iconURL: message.author!.displayAvatarURL(),
				})
				.addFields(
					{
						name: 'Channel',
						value: (message.channel! as GuildTextBasedChannel).name,
						inline: true,
					},
					{
						name: 'Content',
						value: message.content!.length > 1024 ? message.content!.slice(0, 1024) : message.content!,
					},
				)
				.setColor('DarkRed')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});
		client.on('messageUpdate', async (oldMessage, newMessage) => {
			if (oldMessage.author!.bot) return;
			if (oldMessage.content === newMessage.content) return;
			const logChannel = await getLogChannel(oldMessage.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle(`Message Updated`)
				.setDescription(`[Jump to message](${oldMessage.url})`)
				.setAuthor({
					name: oldMessage.author!.tag,
					iconURL: oldMessage.author!.displayAvatarURL(),
				})
				.addFields(
					{
						name: 'Channel',
						value: (oldMessage.channel! as GuildTextBasedChannel).name,
						inline: true,
					},
					{
						name: 'Old Content',
						value: oldMessage.content!,
					},
					{
						name: 'New Content',
						value: newMessage.content!,
					},
				)
				.setColor('Orange')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('channelDelete', async (channel) => {
			if (channel.type == ChannelType.DM) return;
			const logChannel = await getLogChannel(channel.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('Channel Deleted')
				.setDescription(`#${channel.name} has been deleted`)
				.setColor('DarkRed')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('channelCreate', async (channel) => {
			const logChannel = await getLogChannel(channel.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('Channel Created')
				.setDescription(`${channel} has been created`)
				.setColor('Green')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildBanAdd', async (ban) => {
			const logChannel = await getLogChannel(ban.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('User Banned')
				.addFields(
					{
						name: 'User',
						value: ban.user.tag,
						inline: true,
					},
					{
						name: 'Reason',
						value: ban.reason || 'N/A',
						inline: false,
					},
				)
				.setColor('DarkRed')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildBanRemove', async (ban) => {
			const logChannel = await getLogChannel(ban.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('User Unbanned')
				.addFields(
					{
						name: 'User',
						value: ban.user.tag,
						inline: true,
					},
					{
						name: 'Reason',
						value: ban.reason || 'N/A',
						inline: false,
					},
				)
				.setColor('Green')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleCreate', async (role) => {
			const logChannel = await getLogChannel(role.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('Role Created')
				.setDescription(`Role ${role.name} has been created`)
				.setColor('Green')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleDelete', async (role) => {
			const logChannel = await getLogChannel(role.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('Role Deleted')
				.setDescription(`Role ${role.name} has been deleted`)
				.setColor('DarkRed')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleUpdate', async (oldRole, newRole) => {
			const logChannel = await getLogChannel(oldRole.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder()
				.setTitle('Role Updated')
				.setDescription(`Role ${oldRole.name} has been updated`)
				.setColor('Orange')
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildMemberUpdate', async (oldMember, newMember) => {
			const logChannel = await getLogChannel(oldMember.guild!);
			if (!logChannel) return;
			const embed = new EmbedBuilder().setColor('Orange').setTimestamp();
			if (oldMember.nickname != newMember.nickname) {
				embed.setTitle('Nickname Updated').addFields(
					{
						name: 'User',
						value: newMember.user.tag,
					},
					{
						name: 'Old Nickname',
						value: oldMember.nickname || 'N/A',
					},
					{
						name: 'New Nickname',
						value: newMember.nickname || 'N/A',
					},
				);
			}
			if (!embed.data.fields) return;
			logChannel.send({ embeds: [embed] });
		});
	},
} as IListener;
