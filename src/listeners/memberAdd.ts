import { EmbedBuilder, Events } from 'discord.js';
import type { IListener } from '../handler/ListenerHandler';
import { getGuild } from '../util/database';
import { getLogChannel } from '../util/util';

export default {
	name: 'Guild Welcome/Autorole',
	description: 'Welcome message and auto role',
	execute: ({ client }) => {
		client.on(Events.GuildMemberAdd, async (user) => {
			const guild = await getGuild(user.guild, {
				WelcomeSettings: true,
				autoRole: true,
			}) as any;
			if (!guild) return;

			// Welcome message logic
			if (guild.WelcomeSettings) {
				if (guild.WelcomeSettings.channelId) {
					const channel = user.guild.channels.cache.get(guild.WelcomeSettings.channelId);
					if (channel && channel.isTextBased()) {
						const embed = new EmbedBuilder();
						const userMention = user.toString();
						const embedDescription = guild.WelcomeSettings.embedDesc?.replaceAll('{{user}}', userMention);
						const embedTitle = guild.WelcomeSettings.embedTitle?.replaceAll('{{user}}', userMention);
						const message = guild.WelcomeSettings.message?.replaceAll('{{user}}', userMention);
						if (guild.WelcomeSettings.embedTitle) embed.setTitle(embedTitle!);
						if (guild.WelcomeSettings.embedDesc) embed.setDescription(embedDescription!);
						embed.setColor('Random')
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
					}
				}
			}

			// Auto role logic
			if (guild.autoRole) {
				const role = await user.guild.roles.fetch(guild.autoRole, { cache: true, force: true });
				if (role) {
					await user.roles.add(role, 'Auto roles');
				} else {
					const loggingChannel = await getLogChannel(user.guild);
					if (loggingChannel) {
						const embed = new EmbedBuilder()
							.setTitle('Auto Role Error')
							.setDescription('The auto role was not found, please set it again.')
							.setColor('Red')
							.setTimestamp();
						loggingChannel.send({ embeds: [embed] });
					}
				}
			}
		});
	},
} as IListener;
