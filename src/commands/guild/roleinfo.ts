import { ApplicationCommandOptionType, type Role } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { camelToTitleCase, isNullish } from "../../util/util";

export default {
	description: "Get information about a role",
	options: [
		{
			name: "role",
			description: "The role to get information about",
			type: ApplicationCommandOptionType.Role,
			required: true,
		},
	],
	aliases: ["ri"],
	execute: async ({ handler, interaction, args, channel }) => {
		const role = args.get("role") as Role | undefined;
		if (!role) return { content: "Role not found.", ephemeral: true };

		const roleIcon = role.iconURL({ size: 1024 });
		const embed = new VOTEmbed()
			.setDescription(`Role information for ${role.name}`)
			.setColor(role.color)
			.setFooter({
				text: `ID: ${role.id} • ${role.mentionable ? "Mentionable" : "Not Mentionable"} • Color: ${role.hexColor}`,
			})
			.setTimestamp(role.createdTimestamp);
		const position = role.position.toString();
		const members = role.members.size.toString();
		const permissions = role.permissions
			.toArray()
			.map((a) => camelToTitleCase(a.toString()))
			.join(", ");

		if (!isNullish(position)) {
			embed.addFields({ name: "Position", value: position, inline: true });
		}
		if (!isNullish(members)) {
			embed.addFields({ name: "Members", value: members, inline: true });
		}
		if (!isNullish(permissions)) {
			embed.addFields({
				name: "Permissions",
				value: permissions,
				inline: false,
			});
		}
		if (roleIcon) {
			await embed.setThumbnail(roleIcon).dominant();
		}
		return { embeds: [embed] };
	},
} as ICommand;
