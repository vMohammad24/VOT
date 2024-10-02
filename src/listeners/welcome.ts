import { EmbedBuilder } from '@discordjs/builders';
import { Events } from 'discord.js';
import type { IListener } from '../handler/ListenerHandler';
import { getGuild } from '../util/database';

export default {
	name: 'Welcome messages',
	description: 'Listens for permission changes for the dashboard',
	execute: ({ client, prisma }) => {
		client.on(Events.GuildMemberAdd, async (user) => {
			const guild = getGuild(user.guild, {
				WelcomeSettings: true,
			}) as any;
			if (!guild) return;
			if (!guild.WelcomeSettings) return;
			if (!guild.WelcomeSettings.channelId) return;
			const channel = user.guild.channels.cache.get(guild.WelcomeSettings.channelId);
			if (!channel) return;
			if (!channel.isTextBased()) return;
			const embed = new EmbedBuilder();
			const userMention = user.toString();
			const embedDescription = guild.WelcomeSettings.embedDesc?.replaceAll('{{user}}', userMention);
			const embedTitle = guild.WelcomeSettings.embedTitle?.replaceAll('{{user}}', userMention);
			const message = guild.WelcomeSettings.message?.replaceAll('{{user}}', userMention);
			if (guild.WelcomeSettings.embedTitle) embed.setTitle(embedTitle!);
			if (guild.WelcomeSettings.embedDesc) embed.setDescription(embedDescription!);
			if (embed.data.title || embed.data.description) {
				if (guild.WelcomeSettings.message) {
					channel.send({ embeds: [embed], content: message! });
				} else {
					channel.send({ embeds: [embed] });
				}
			} else {
				if (guild.WelcomeSettings.message) {
					channel.send(message!);
				}
			}
		});
	},
} as IListener;
