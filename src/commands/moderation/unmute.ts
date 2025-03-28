import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	type GuildMember,
} from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { createCase } from "../../util/cases";

export default {
	description: "Remove timeout from a member",
	perms: ["MuteMembers"],
	options: [
		{
			name: "member",
			description: "The member to unmute",
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: "reason",
			description: "Why are you unmuting this member",
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	aliases: ["unshutup", "untimeout"],
	execute: async ({ guild, member: moderator, args }) => {
		const member = args.get("member") as GuildMember;
		if (!member) {
			return {
				content: "Please provide a valid member",
				ephemeral: true,
			};
		}

		const reason = args.get("reason") as string;

		if (
			moderator.roles.highest.comparePositionTo(member.roles.highest) <= 0 &&
			guild.ownerId !== moderator.id
		) {
			return {
				content:
					"You cannot unmute this member as they have a higher role than you",
				ephemeral: true,
			};
		}

		if (!member.isCommunicationDisabled()) {
			return {
				content: "This member is not muted",
				ephemeral: true,
			};
		}

		const newCase = await createCase(
			guild.id,
			"TimeoutRemove",
			member.id,
			moderator.id,
			reason,
		);

		await member.timeout(
			null,
			`${reason || "No reason provided"} (Case #${newCase.caseId})`,
		);

		const userEmbed = new EmbedBuilder()
			.setTitle("Unmuted")
			.setDescription(`Your timeout has been removed in **${guild.name}**`)
			.setColor("Green")
			.setTimestamp()
			.setFooter({
				text: `Unmuted by ${moderator.user.displayName} • Case ID: ${newCase.caseId}`,
				iconURL: moderator.user.displayAvatarURL(),
			})
			.addFields({ name: "Reason", value: reason || "No reason provided" });

		const embed = new EmbedBuilder()
			.setTitle("Unmuted")
			.setDescription(`**${member.user.tag}** has been unmuted`)
			.setColor("Green")
			.setTimestamp()
			.setFooter({
				text: `Unmuted by ${moderator.user.displayName} • Case ID: ${newCase.caseId}`,
				iconURL: moderator.user.displayAvatarURL(),
			})
			.addFields({ name: "Reason", value: reason || "No reason provided" });

		try {
		} catch (e) {}

		return {
			embeds: [embed],
		};
	},
} as ICommand;
