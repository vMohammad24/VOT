import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type Guild,
	type GuildMember,
	type GuildTextBasedChannel,
} from "discord.js";
import type { Kazagumo, KazagumoPlayer } from "kazagumo";
import numeral from "numeral";
import commandHandler from "..";
import { createMusicCanvas } from "./canvas";
import { loadImg } from "./database";
import { getEmoji } from "./emojis";
import { getTwoMostUsedColors, rgbToHex } from "./util";

export function getRows(player: KazagumoPlayer) {
	const status = player.paused ? "Resume" : "Pause";
	const looping = player.loop != "none";
	const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
		status === "Pause"
			? new ButtonBuilder()
					.setCustomId("pause")
					.setLabel("Pause")
					.setStyle(ButtonStyle.Danger)
					.setEmoji(getEmoji("pause")!.id)
			: new ButtonBuilder()
					.setCustomId("resume")
					.setLabel("Resume")
					.setStyle(ButtonStyle.Success)
					.setEmoji(getEmoji("play")!.id),
		new ButtonBuilder()
			.setCustomId("skip")
			.setLabel("Skip")
			.setStyle(ButtonStyle.Primary)
			.setEmoji(getEmoji("skip")!.id),
		new ButtonBuilder()
			.setCustomId("queue")
			.setLabel("Queue")
			.setStyle(ButtonStyle.Success)
			.setEmoji(getEmoji("queue")!.id),
		new ButtonBuilder()
			.setCustomId("stop")
			.setLabel("Stop")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(getEmoji("stop")!.id),
	);
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("loop")
			.setLabel(looping ? "Looping" : "Loop")
			.setStyle(ButtonStyle.Primary)
			.setEmoji(getEmoji("loop")!.id),
		new ButtonBuilder()
			.setCustomId("shuffle")
			.setLabel("Shuffle")
			.setStyle(ButtonStyle.Primary)
			.setEmoji(getEmoji("shuffle")!.id),
		new ButtonBuilder()
			.setCustomId("volume")
			.setLabel("Volume")
			.setStyle(ButtonStyle.Primary)
			.setEmoji(getEmoji("volume")!.id),
	);
	return [row, row2];
}

export async function sendPanel(kazagumo: Kazagumo, guild: Guild) {
	const player = kazagumo.getPlayer(guild.id);
	if (!player) return;
	const member = player.queue.current?.requester as GuildMember;
	// requester
	const track = player.queue.current!;
	const playingEmbed = new EmbedBuilder()
		.setTitle("Now Playing")
		.setDescription(
			`[${player.queue.current!.title}](${player.queue.current!.uri})`,
		)
		.setColor("Green")
		.setThumbnail(player.queue.current!.thumbnail!)
		.setTimestamp()
		.setFooter({
			text: `Requested by ${member.user.tag}`,
			iconURL: member.user.displayAvatarURL(),
		});
	const voiceChannel = guild.channels.cache.get(
		player.voiceId!,
	)! as GuildTextBasedChannel;
	if (voiceChannel) {
		const oldMessageId = player.data.get("messageId");
		if (oldMessageId) {
			const oldMessage = await voiceChannel.messages
				.fetch(oldMessageId)
				.catch(() => null);
			if (oldMessage) {
				oldMessage.delete().catch(() => null);
			}
		}
		const musicSettings = await commandHandler.prisma.musicSettings.findFirst({
			where: {
				userId: member.id,
			},
		});
		const panelType: "Embed" | "Image" = musicSettings?.panelType || "Embed";
		let msg;
		if (panelType === "Image") {
			const progress =
				new Date(player.queue.current?.position!).getTime() /
				new Date(player.queue.current?.length!).getTime();
			const track = player.queue.current!;
			const domColor = await getTwoMostUsedColors(
				await loadImg(track.thumbnail!),
			);

			const panel = await createMusicCanvas({
				author: track.author,
				backgroundColor: rgbToHex(domColor[0]),
				thumbnailImage: track.thumbnail!,
				endTime: numeral(track.length).format("00:00"),
				progress: (track.position! / track.length!) * 100,
				progressBarColor: rgbToHex(domColor[1]),
				name: track.title,
				imageDarkness: 0.5,
			});
			msg = await voiceChannel.send({
				files: [panel],
				components: getRows(player),
			});
		} else {
			msg = await voiceChannel.send({
				embeds: [playingEmbed],
				components: getRows(player),
			});
		}
		player.data.set("messageId", msg.id);
		return msg;
	}
}
const map = new Map<string, Date>(); // guildId, lastUpdated

export async function getPanel(kazagumo: Kazagumo, guild: Guild) {
	if (map.has(guild.id) && map.get(guild.id)! > new Date(Date.now() - 5000))
		return;
	const player = kazagumo.getPlayer(guild.id);
	if (!player) return;
	const messageId = player?.data.get("messageId");
	let msg;
	if (!messageId) {
		setTimeout(async () => {
			return await getPanel(kazagumo, guild);
		}, 250);
	} else {
		msg = (
			(await guild.channels.cache.get(
				player!.voiceId!,
			)) as GuildTextBasedChannel
		).messages.cache.get(messageId);
	}
	const lastUpdated = map.get(guild.id);
	if (!msg) return;
	return msg;
}
