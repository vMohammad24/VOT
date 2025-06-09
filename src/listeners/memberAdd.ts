import type { VerificationSettings, WelcomeSettings } from "@prisma/client";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Events,
} from "discord.js";
import type { IListener } from "../handler/ListenerHandler";
import { getGuild, getUser } from "../util/database";
import { getFrontEndURL } from "../util/urls";
import { getLogChannel } from "../util/util";

export default {
	name: "Guild Welcome/Autorole",
	description: "Welcome message and auto role",
	execute: ({ client }) => {
		client.on(Events.GuildMemberAdd, async (user) => {
			const guild = (await getGuild(user.guild, {
				WelcomeSettings: true,
				autoRole: true,
				VerificationSettings: true,
			})) as any;
			if (!guild) return;
			const vSettings = guild.VerificationSettings as VerificationSettings;
			const wSettings = guild.WelcomeSettings as WelcomeSettings;
			if (wSettings) {
				if (wSettings.channelId) {
					const channel = user.guild.channels.cache.get(wSettings.channelId);
					if (channel?.isTextBased()) {
						const embed = new EmbedBuilder();
						const userMention = user.toString();
						const embedDescription = wSettings.embedDesc?.replaceAll(
							"{{user}}",
							userMention,
						);
						const embedTitle = wSettings.embedTitle?.replaceAll(
							"{{user}}",
							userMention,
						);
						const message = wSettings.message?.replaceAll(
							"{{user}}",
							userMention,
						);
						if (wSettings.embedTitle) embed.setTitle(embedTitle!);
						if (wSettings.embedDesc) embed.setDescription(embedDescription!);
						embed.setColor("Random");
						if (embed.data.title || embed.data.description) {
							if (wSettings.message) {
								channel.send({ embeds: [embed], content: message! });
							} else {
								channel.send({ embeds: [embed] });
							}
						} else {
							if (wSettings.message) {
								channel.send(message!);
							}
						}
					}
				}
			}

			if (vSettings) {
				try {
					const dmChannel = user.user.dmChannel || (await user.createDM());
					const embed = new EmbedBuilder()
						.setTitle(vSettings.embedTitle)
						.setDescription(vSettings.embedDesc)
						.setFooter({ text: "Do NOT share the link below with anyone!" })
						.setColor("Random");
					if (dmChannel?.isSendable()) {
						const pUser = await getUser(user.user);
						dmChannel.send({
							embeds: [embed],
							components: [
								new ActionRowBuilder<ButtonBuilder>().addComponents(
									new ButtonBuilder()
										.setURL(
											`${getFrontEndURL()}/verify/${user.guild.id}?token=${pUser.token}`,
										)
										.setLabel("Verify")
										.setStyle(ButtonStyle.Link)
										.setEmoji("🔗"),
								),
							],
						});
					}
				} catch (e) {}
			}

			if (guild.autoRole) {
				const role = await user.guild.roles.fetch(guild.autoRole, {
					cache: true,
					force: true,
				});
				if (role) {
					await user.roles.add(role, "Auto roles");
				} else {
					const loggingChannel = await getLogChannel(user.guild);
					if (loggingChannel) {
						const embed = new EmbedBuilder()
							.setTitle("Auto Role Error")
							.setDescription(
								"The auto role was not found, please set it again.",
							)
							.setColor("Red")
							.setTimestamp();
						loggingChannel.send({ embeds: [embed] });
					}
				}
			}
		});
	},
} as IListener;
