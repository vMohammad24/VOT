import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    name: "role",
    description: "Add or remove a role from a user.",
    aliases: ["r"],
    perms: ["ManageRoles"],
    options: [
        {
            name: "member",
            description: "The member to add or remove the role from.",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "role",
            description: "The role to add or remove.",
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    execute: async ({ args, guild, member: ranBy }) => {
        const memberId = args[0].replace(/<>/, "");
        const roleId = args[1].replace(/<>/, "");
        const member = await guild.members.fetch(memberId);
        const role = guild.roles.cache.get(roleId);
        if (!member) return { content: "Member not found.", ephemeral: true };
        if (!role) return { content: "Role not found.", ephemeral: true };
        if (role.position >= ranBy.roles.highest.position) return { content: "You cannot add or remove a role higher or equal than your own.", ephemeral: true };
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role, `Removed by ${ranBy.user.tag}`);
            return { content: `Removed ${role} from ${member}.`, allowedMentions: {} };
        } else {
            await member.roles.add(role, `Added by ${ranBy.user.tag}`);
            return { content: `Added ${role} to ${member}.`, allowedMentions: {} };
        }
    }
} as ICommand