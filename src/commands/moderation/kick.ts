import { ApplicationCommandOptionType, EmbedBuilder, GuildMember, type BaseGuildTextChannel, type GuildTextBasedChannel } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Kicks a member",
    perms: ["KickMembers"],
    options: [{
        name: "member",
        description: "The member to kick",
        type: ApplicationCommandOptionType.User,
        required: true
    },
    {
        name: "reason",
        description: "Why are you kicking this member",
        type: ApplicationCommandOptionType.String,
        required: false
    }],
    execute: async ({ guild, member: kicker, args }) => {
        const member = args.get("member") as GuildMember;
        if (!member) return {
            content: "Please provide a valid member",
            ephemeral: true
        }
        const reason = args.get("reason") as string;
        if (kicker.roles.highest.comparePositionTo(member.roles.highest) <= 0 || guild.ownerId === member.id) {
            return {
                content: "You cannot kick this member as they have a higher role than you",
                ephemeral: true
            }
        }
        const userEmbed = new EmbedBuilder()
            .setTitle("Kicked")
            .setDescription(`You have been kicked from **${guild.name}**`)
            .setColor("DarkOrange")
            .setTimestamp()
            .setFooter({ text: `Kicked by ${kicker.user.displayName}`, iconURL: kicker.user.displayAvatarURL() })
            .addFields({ name: "Reason", value: reason || "No reason provided" })

        const embed = new EmbedBuilder()
            .setTitle("Kicked")
            .setDescription(`**${member.user.tag}** has been kicked`)
            .setColor("Red")
            .setTimestamp()
            .setFooter({ text: `Kicked by ${kicker.user.displayName}`, iconURL: kicker.user.displayAvatarURL() })
            .addFields({ name: "Reason", value: reason || "No reason provided" })
        await member.send({ embeds: [userEmbed] })
        await member.kick(reason)
        return {
            embeds: [embed]
        }
    },

} as ICommand