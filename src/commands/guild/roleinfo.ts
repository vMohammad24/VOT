import { ApplicationCommandOptionType, Role } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { camelToTitleCase } from "../../util/util";

export default {
    description: 'Get information about a role',
    options: [
        {
            name: 'role',
            description: 'The role to get information about',
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    aliases: ['ri'],
    execute: async ({ handler, interaction, args, channel }) => {
        const role = args.get('role') as Role | undefined;

        if (!role) {
            return { content: 'Role not found.', ephemeral: true };
        }
        const roleIcon = role.iconURL({ size: 1024 });
        const embed = new VOTEmbed()
            .setTitle(`Role Info: ${role.name}`)
            .setColor(role.color)
            .addFields(
                { name: 'ID', value: role.id, inline: true },
                { name: 'Name', value: role.name, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Position', value: role.position.toString(), inline: true },
                { name: 'Permissions', value: role.permissions.toArray().map(a => camelToTitleCase(a.toString())).join(', '), inline: false }
            )
            .setTimestamp();
        if (roleIcon) {
            await embed.setThumbnail(roleIcon).dominant()
        }
        return { embeds: [embed] };
    }
} as ICommand