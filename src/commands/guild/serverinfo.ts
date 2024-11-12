import { ChannelType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import VOTEmbed from '../../util/VOTEmbed';
export default {
	description: 'Displays information about the server',
	type: 'guildOnly',
	aliases: ['server', 'guild', 'si'],
	execute: async ({ guild }) => {
		const embed = await new VOTEmbed();
		const owner = await guild.fetchOwner();
		const channels = guild.channels.cache;
		const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText).size;
		const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice).size;
		const categories = channels.filter(channel => channel.type === ChannelType.GuildCategory).size;
		const roles = guild.roles.cache.size;
		const emojis = guild.emojis.cache.size;
		const stickers = guild.stickers.cache.size;
		const boosts = guild.premiumSubscriptionCount || 0;

		embed
			.setTitle(`Server Information`)
			.setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
			.setThumbnail(guild.iconURL({ size: 1024 }))
			.addFields(
				{ name: 'Owner', value: `<@${owner.id}>`, inline: true },
				{ name: 'Members', value: guild.memberCount.toString(), inline: true },
				{ name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
				{
					name: 'Channels',
					value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}`,
					inline: true
				},
				{
					name: 'Server Stats',
					value: `**Roles:** ${roles}\n**Emojis:** ${emojis}\n**Stickers:** ${stickers}\n**Boosts:** ${boosts}`,
					inline: true
				}
			)
			// .setImage(guild.bannerURL({ size: 1024 }) || '') // Include the server banner if available
			.setFooter({ text: `Server ID: ${guild.id}` })
			.setTimestamp()
			.dominant();

		return {
			embeds: [embed],
		};
	},
} as ICommand;
