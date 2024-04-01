import { EmbedBuilder, GuildMember } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { getCurrentlyPlaying, pausePlayer } from "../../util/spotify";
import { sendPanel } from "../../util/music";

export default {
    description: "Gets your current playing song from spotify and adds it to the queue",
    needsPlayer: true,
    execute: async ({ member, handler, player, interaction, guild }) => {
        interaction?.deferReply({ ephemeral: true });
        const res = await getCurrentlyPlaying(member.id, handler.prisma)
        if (res.error) {
            return {
                content: res.error
            }
        }
        if (!player) return;
        const trackURI = res.item.external_urls.spotify;
        if (!trackURI) return {
            content: "No track playing",
            ephemeral: true
        }
        const track = (await handler.kazagumo.search(trackURI, {
            requester: member as GuildMember,
            engine: 'spotify'
        })).tracks[0];
        if (!track) return {
            content: "No track found",
            ephemeral: true
        };
        if (player.queue.current) {
            player.queue.add(track);
            if (!player.playing) player.play();
        } else {
            player.play(track);
        }
        const a = await pausePlayer(member.id, handler.prisma);
        if (player.queue.current?.identifier === track.identifier) {
            player.seek(parseInt(res.progress_ms))
        }
        const embed = new EmbedBuilder()
            .setTitle("Added to queue")
            .setColor("Green")
            .setDescription(`Added ${track.title || "Error getting title"} to the queue`)
            .setThumbnail(track.thumbnail || null)
            .setFooter({ text: a.error || null })
        return {
            embeds: [embed],
            ephemeral: true
        }
    }
} as ICommand
