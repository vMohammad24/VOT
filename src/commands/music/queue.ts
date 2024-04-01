import { EmbedBuilder, GuildMember } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { Pagination, PaginationType } from "@discordx/pagination";

export default {
    description: "Shows the queue",
    needsPlayer: true,
    execute: async ({ player, interaction, message }) => {
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
            return {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`Queue ${i + 1}/${queueWithCurrent.length}`)
                        .setDescription(`[${track.title}](${track.uri})`)
                        .setColor("Green")
                        .setThumbnail(track.thumbnail!)
                        .setFooter({ text: `Requested by ${(requester.displayName)}`, iconURL: requester.displayAvatarURL() })
                ],

            }
        })
        new Pagination(message ? message : interaction!, embeds, {
            type: PaginationType.SelectMenu,
            pageText: queueWithCurrent.map((q, i) => `${q.title} - ${i + 1}/${queueWithCurrent.length}`),
            ephemeral: true
        }).send();

    }
} as ICommand