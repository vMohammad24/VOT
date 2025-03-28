import type { ModerationSettings } from "@prisma/client";
import { EmbedBuilder, Events, type GuildMember } from "discord.js";
import type { IListener } from "../handler/ListenerHandler";
import { getGuild } from "../util/database";

export default {
	name: "Moderation",
	description: "Moderation listener",
	execute: async ({ client }) => {
		const invitesRegex =
			/(https: \/\/)?(www\.)?(((discord(app)?)?\.com\/invite)|((discord(app)?)?\.gg))\/(?<invite>.+)/i;

		const timeout = async (member: GuildMember, reason: string) => {
			const loggingChannel = await getGuild(member.guild, {
				loggingChannel: true,
			});
			try {
				await member.timeout(1000 * 60 * 2, reason);
				if (loggingChannel) {
					const channel = member.guild.channels.cache.get(
						loggingChannel.loggingChannel,
					);
					if (channel && channel.isTextBased())
						await channel.send({
							embeds: [
								new EmbedBuilder()
									.setTitle("Member Timed Out")
									.setDescription(`${member} has been timed out `)
									.setColor("Red")
									.addFields([
										{ name: "Reason", value: reason },
										{ name: "Moderator", value: client.user?.tag! },
										{ name: "Duration", value: "2 minutes" },
									])
									.setTimestamp(),
							],
						});
				}
			} catch (e) {}
		};

		client.on(Events.MessageCreate, async (message) => {
			if (message.author.bot) return;
			if (!message.guild) return;
			if (!message.member) return;
			const { member, content, guild, channel } = message;
			const modSettings = (
				await getGuild(guild, {
					ModerationSettings: true,
				})
			).ModerationSettings as ModerationSettings;
			if (!modSettings) return;
			if (content.match(invitesRegex) && modSettings.AntiInvites) {
				await message.delete();
				await member.timeout(
					1000 * 60 * 2,
					"Posting invites is not allowed in this server",
				);
				return channel.send(
					`Posting invites is not allowed in this server, ${member}`,
				);
			}
			if (modSettings.AntiEmojiSpam) {
				const emojis = content.match(/<a?:\w+:\d+>/g);
				if (emojis && emojis.length > 10) {
					await message.delete();
					await member.timeout(
						1000 * 60 * 2,
						`You can't send more than 10 emojis in this server`,
					);
					return channel.send(
						`Sending more than 10 emojis is not allowed in this server, ${member}`,
					);
				}
			}
			if (modSettings.AntiMassMention) {
				const mentions = content.match(/<@!?&?(\d+)>/g);
				if (mentions && mentions.length > 10) {
					await message.delete();
					await member.timeout(
						1000 * 60 * 2,
						`You can't mention more than 10 users in this server`,
					);
					return channel.send(
						`Mentioning more than 10 users is not allowed in this server, ${member}`,
					);
				}
			}
			if (modSettings.AntiMassSpoilers) {
				const spoilers = content.match(/\|\|(.+?)\|\|/g);
				if (spoilers && spoilers.length > 10) {
					await message.delete();
					await member.timeout(
						1000 * 60 * 2,
						`You can't send more than 10 spoilers in this server`,
					);
					return channel.send(
						`Sending more than 10 spoilers is not allowed in this server, ${member}`,
					);
				}
			}

			if (modSettings.AntiSpam) {
				const messages = await channel.messages.fetch({
					limit: 5,
					before: message.id,
				});
				const yes = messages.filter(
					(msg) =>
						msg.author.id === member.id && msg.content === message.content,
				);
				if (yes.size > 3) {
					await message.delete();
					await member.timeout(
						1000 * 60 * 2,
						`You can't send the same message more than 3 times in a row`,
					);
					return channel.send(
						`Sending the same message more than 3 times in a row is not allowed in this server, ${member}`,
					);
				}
			}
		});
	},
} as IListener;
