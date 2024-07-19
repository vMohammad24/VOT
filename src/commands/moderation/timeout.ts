import { ApplicationCommandOptionType, EmbedBuilder, GuildMember, type BaseGuildTextChannel, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { parseTime } from "../../util/util";

export default {
    description: "Mute a member",
    perms: ["MuteMembers"],
    options: [{
        name: "member",
        description: "The member to timeout",
        type: ApplicationCommandOptionType.User,
        required: true
    },
    {
        name: "duration",
        description: "The duration of the timeout",
        type: ApplicationCommandOptionType.String,
        required: true
    },
    {
        name: "reason",
        description: "Why are you timing this member out",
        type: ApplicationCommandOptionType.String,
        required: false
    }],
    aliases: ["mute", "shutup", "to"],
    execute: async ({ guild, member: owner, args }) => {
        const member = args.get("member") as GuildMember;
        if (!member) return {
            content: "Please provide a valid member",
            ephemeral: true
        }
        const reason = args.get("reason") as string;
        if ((owner.roles.highest.comparePositionTo(member.roles.highest) <= 0 || guild.ownerId === member.id) && member.id !== owner.id && guild.ownerId != owner.id) {
            return {
                content: "You cannot timeout this member as they have a higher role than you",
                ephemeral: true
            }
        }
        const duration = args.get("duration") as string;
        if (!duration) return {
            content: "Please provide a valid duration",
            ephemeral: true
        }
        const time = parseTime(duration);
        if (!time) return {
            content: "Please provide a valid duration",
            ephemeral: true
        }
        const userEmbed = new EmbedBuilder()
            .setTitle("Silenced")
            .setDescription(`You have been silenced from **${guild.name}**`)
            .setColor("Orange")
            .setTimestamp()
            .setFooter({ text: `Silenced by ${owner.user.displayName}`, iconURL: owner.user.displayAvatarURL() })
            .addFields({ name: "Reason", value: reason || "No reason provided" })
            .addFields({ name: "Expires", value: `<t:${Math.round(Date.now() / 1000 + time)}:R>` })

        const embed = new EmbedBuilder()
            .setTitle("Muted")
            .setDescription(`**${member.user.tag}** has been muted`)
            .setColor("Red")
            .setTimestamp()
            .setFooter({ text: `Done by ${owner.user.displayName}`, iconURL: owner.user.displayAvatarURL() })
            .addFields({ name: "Reason", value: reason || "No reason provided" })
            .addFields({ name: "Expires", value: `<t:${Math.round(Date.now() / 1000 + time)}:R>` })
        await member.send({ embeds: [userEmbed] })
        await member.timeout(time * 1000, reason);
        return {
            embeds: [embed]
        }
    },

} as ICommand