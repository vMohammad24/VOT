import { ChannelType, Guild, type GuildTextBasedChannel } from 'discord.js';
import type { IListener } from '../handler/ListenerHandler';
import { getGuild } from '../util/database';
import VOTEmbed from '../util/VOTEmbed';

const getLogChannel = async (guild: Guild) => {
	const g = await getGuild(guild, { loggingChannel: true });
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
			const embed = new VOTEmbed()
				.setTitle('🗑️ Message Deleted')
				.setAuthor({
					name: message.author!.tag,
					iconURL: message.author!.displayAvatarURL(),
				})
				.addFields(
					{ name: 'Channel', value: `<#${message.channel!.id}>`, inline: true },
					{ name: 'Content', value: message.content!.length > 1024 ? message.content!.slice(0, 1024) : message.content! }
				)
				.setColor('DarkRed')
				.setFooter({ text: `Message ID: ${message.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});
		client.on('messageUpdate', async (oldMessage, newMessage) => {
			if (oldMessage.author!.bot) return;
			if (oldMessage.content === newMessage.content) return;
			const logChannel = await getLogChannel(oldMessage.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('✏️ Message Updated')
				.setDescription(`[Jump to message](${oldMessage.url})`)
				.setAuthor({
					name: oldMessage.author!.tag,
					iconURL: oldMessage.author!.displayAvatarURL(),
				})
				.addFields(
					{ name: 'Channel', value: `<#${oldMessage.channel!.id}>`, inline: true },
					{ name: 'Old Content', value: oldMessage.content! },
					{ name: 'New Content', value: newMessage.content! }
				)
				.setColor('Orange')
				.setFooter({ text: `Message ID: ${oldMessage.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('channelDelete', async (channel) => {
			if (channel.type == ChannelType.DM) return;
			const logChannel = await getLogChannel(channel.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🚫 Channel Deleted')
				.setDescription(`Channel **#${channel.name}** has been deleted`)
				.setColor('DarkRed')
				.setFooter({ text: `Channel ID: ${channel.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('channelCreate', async (channel) => {
			const logChannel = await getLogChannel(channel.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('✅ Channel Created')
				.setDescription(`Channel ${channel} has been created`)
				.setColor('Green')
				.setFooter({ text: `Channel ID: ${channel.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildBanAdd', async (ban) => {
			const logChannel = await getLogChannel(ban.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🔨 User Banned')
				.addFields(
					{ name: 'User', value: ban.user.tag, inline: true },
					{ name: 'Reason', value: ban.reason || 'N/A', inline: false }
				)
				.setColor('DarkRed')
				.setFooter({ text: `User ID: ${ban.user.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildBanRemove', async (ban) => {
			const logChannel = await getLogChannel(ban.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🔓 User Unbanned')
				.addFields(
					{ name: 'User', value: ban.user.tag, inline: true },
					{ name: 'Reason', value: ban.reason || 'N/A', inline: false }
				)
				.setColor('Green')
				.setFooter({ text: `User ID: ${ban.user.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleCreate', async (role) => {
			const logChannel = await getLogChannel(role.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🛠️ Role Created')
				.setDescription(`Role **${role.name}** has been created`)
				.setColor('Green')
				.setFooter({ text: `Role ID: ${role.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleDelete', async (role) => {
			const logChannel = await getLogChannel(role.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🗑️ Role Deleted')
				.setDescription(`Role **${role.name}** has been deleted`)
				.setColor('DarkRed')
				.setFooter({ text: `Role ID: ${role.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('roleUpdate', async (oldRole, newRole) => {
			const logChannel = await getLogChannel(oldRole.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed()
				.setTitle('🛠️ Role Updated')
				.setDescription(`Role **${oldRole.name}** has been updated`)
				.setColor('Orange')
				.setFooter({ text: `Role ID: ${oldRole.id}` })
				.setTimestamp();
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildMemberUpdate', async (oldMember, newMember) => {
			const logChannel = await getLogChannel(oldMember.guild!);
			if (!logChannel) return;
			const embed = new VOTEmbed().setColor('Orange').setTimestamp();
			if (oldMember.nickname != newMember.nickname) {
				embed.setTitle('🔄 Nickname Updated').addFields(
					{ name: 'User', value: newMember.user.tag },
					{ name: 'Old Nickname', value: oldMember.nickname || 'N/A' },
					{ name: 'New Nickname', value: newMember.nickname || 'N/A' }
				);
			}
			if (!embed.data.fields) return;
			logChannel.send({ embeds: [embed] });
		});

		client.on('guildMemberUpdate', async (oldMember, newMember) => {
			if (!oldMember.premiumSince && newMember.premiumSince) {
				const logChannel = await getLogChannel(newMember.guild!);
				if (!logChannel) return;
				const embed = new VOTEmbed()
					.setTitle('🚀 Server Boosted')
					.setDescription(`${newMember.user.tag} has boosted the server!`)
					.setColor('Purple')
					.setFooter({ text: `User ID: ${newMember.user.id}` })
					.setTimestamp();
				logChannel.send({ embeds: [embed] });
			} else if (oldMember.premiumSince && !newMember.premiumSince) {
				const logChannel = await getLogChannel(newMember.guild!);
				if (!logChannel) return;
				const embed = new VOTEmbed()
					.setTitle('🚫 Server Boost Revoked')
					.setDescription(`${newMember.user.tag} has removed their boost`)
					.setColor('DarkRed')
					.setFooter({ text: `User ID: ${newMember.user.id}` })
					.setTimestamp();
				logChannel.send({ embeds: [embed] });
			}
		});
	},
} as IListener;
