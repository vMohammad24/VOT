import { EmbedBuilder, GuildMember, MembershipScreeningFieldType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { pagination } from "@devraelfreeze/discordjs-pagination";

export default {
    description: "Shows the queue",
    needsPlayer: true,
    execute: async ({ player, interaction, message, member }) => {
        if (!player) return {
            content: "No player found",
            ephemeral: true
        }
        const queue = player.queue;
        if (!queue.current) return {
            content: "No song is currently playing",
            ephemeral: true
        }
        const queueWithCurrent = [queue.current, ...queue]
        const embeds = queueWithCurrent.map((track, i) => {
            const requester = track.requester as GuildMember;
            return new EmbedBuilder()
                .setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
                .setDescription(`[${track.title}](${track.uri})`)
                .setColor("Green")
                .setThumbnail(track.thumbnail!)
                .setFooter({ text: `Requested by ${(requester.displayName)}`, iconURL: requester.displayAvatarURL() })
        })
        await pagination({
            author: member.user,
            interaction: interaction || undefined,
            message: message || undefined,
            embeds: embeds as any,

        })
    }
} as ICommand