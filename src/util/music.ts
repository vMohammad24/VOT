import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, type Guild, type GuildTextBasedChannel } from "discord.js";
import type { Kazagumo, KazagumoPlayer } from "kazagumo";
import prisma from "../../vot-frontend/src/lib/prisma";
import { ClassicPro } from "musicard";

export function getRows(status: "Resume" | "Pause", looping: boolean = false) {
    const row = new ActionRowBuilder<ButtonBuilder>()
        .setComponents(
            (status === "Pause" ? new ButtonBuilder()
                .setCustomId("pause")
                .setLabel("Pause")
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏸️')
                : new ButtonBuilder()
                    .setCustomId("resume")
                    .setLabel("Resume")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️')
            ),
            new ButtonBuilder()
                .setCustomId("skip")
                .setLabel("Skip")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⏭️'),
            new ButtonBuilder()
                .setCustomId("queue")
                .setLabel("Queue")
                .setStyle(ButtonStyle.Success)
                .setEmoji('📜'),
            new ButtonBuilder()
                .setCustomId("stop")
                .setLabel("Stop")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏹️'),
        )
    const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("loop")
                .setLabel(looping ? "Looping" : "Loop")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔁'),
            new ButtonBuilder()
                .setCustomId("shuffle")
                .setLabel("Shuffle")
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔀'),
            new ButtonBuilder()
                .setCustomId('volume')
                .setLabel('Volume')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔊')
        )
    return [row, row2]
}

export async function sendPanel(kazagumo: Kazagumo, guild: Guild) {
    const player = kazagumo.getPlayer(guild.id);
    if (!player) return;
    const member = player.queue.current?.requester as GuildMember;
    // requester
    const track = player.queue.current!;
    const playingEmbed = new EmbedBuilder()
        .setTitle("Now Playing")
        .setDescription(`[${player.queue.current!.title}](${player.queue.current!.uri})`)
        .setColor("Green")
        .setThumbnail(player.queue.current!.thumbnail!)
        .setTimestamp()
        .setFooter({ text: `Requested by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });
    const voiceChannel = guild.channels.cache.get(player.voiceId!)! as GuildTextBasedChannel;
    if (voiceChannel) {
        const oldMessageId = player.data.get("messageId");
        if (oldMessageId) {
            const oldMessage = await voiceChannel.messages.fetch(oldMessageId).catch(() => null);
            if (oldMessage) {
                oldMessage.delete().catch(() => null);
            }
        }
        const message = await voiceChannel.send({ embeds: [playingEmbed], components: getRows("Pause") });
        player.data.set("messageId", message.id)
        return message;
    }
}

export async function getPanel(kazagumo: Kazagumo, guild: Guild) {
    const player = kazagumo.getPlayer(guild.id);
    if (!player) return;
    const messageId = player?.data.get("messageId");
    let msg;
    if (!messageId) {
        setTimeout(async () => {
            return await getPanel(kazagumo, guild);
        }, 250)
    }
    else {
        msg = (await guild.channels.cache.get(player!.voiceId!) as GuildTextBasedChannel).messages.cache.get(messageId);
    }
    if (!msg) return;
    return msg;
}