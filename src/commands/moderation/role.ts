import { ApplicationCommandOptionType, GuildMember, Role } from "discord.js";
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
    execute: async ({ args, guild, member: ranBy, interaction }) => {
        const member = args.get("member") as GuildMember;
        const role = args.get("role") as Role;
        if (!member) return { content: "Member not found.", ephemeral: true };
        if (!role) return { content: "Role not found.", ephemeral: true };
        if (role.position >= ranBy.roles.highest.position && guild.ownerId != ranBy.id) return { content: "You cannot add or remove a role higher or equal than your own.", ephemeral: true };
        if (role.members.has(member.id)) {
            await member.roles.remove(role, `added by ${ranBy.user.tag}.`);
            return { content: `Removed ${role} from ${member}.`, allowedMentions: {} };
        } else {
            await member.roles.add(role, `removed by ${ranBy.user.tag}.`);
            return { content: `Added ${role} to ${member}.`, allowedMentions: {} };
        }
    }
} as ICommand