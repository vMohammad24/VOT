import { env } from "bun";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Events,
} from "discord.js";
import { join } from "node:path";
import numeral from "numeral";
import { upSince } from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getInstallCounts } from "../../util/database";
async function getLines() {
	const glob = new Bun.Glob("**/*.{ts,js,mjs,json}");
	const results = glob.scanSync({
		absolute: true,
		cwd: join(import.meta.dir, "..", ".."),
	});

	const lineCounts = await Promise.all(
		Array.from(results).map(async (path) => {
			if (!path) return 0;
			try {
				const content = await Bun.file(path).arrayBuffer();
				const buffer = new Uint8Array(content);
				let count = 0;
				for (let i = 0; i < buffer.length; i++) {
					if (buffer[i] === 10) count++;
				}
				return count;
			} catch {
				return 0;
			}
		}),
	);

	const totalLines = lineCounts.reduce((acc, curr) => acc + curr, 0);
	globalLines = totalLines.toString();
	return totalLines;
}

let globalLines = "";
getLines();

export default {
	name: "stats",
	description: "Shows the bot stats",
	type: "all",
	execute: async ({ handler }) => {
		const { client } = handler;
		const { memoryUsage } = process;
		const { heapUsed } = memoryUsage();
		const { users, guilds } = client;
		const { size } = guilds.cache;
		const { size: usersSize } = users.cache;
		const { approximate_guild_count, approximate_user_install_count } =
			await getInstallCounts(client);
		// if (globalLines === 0) globalLines = await getLines();
		const listenerCount = Object.entries(Events)
			.map(([key, value]) => {
				const count = handler.client.listenerCount(value);
				if (count !== 0) return count;
			})
			.filter((a) => a !== undefined)
			.reduce((acc, curr) => acc + curr, 0);
		const embed = await new VOTEmbed()
			.setTitle("Bot Stats")
			.addFields(
				{
					name: "Memory Usage",
					value: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
					inline: true,
				},
				{
					name: "Commands",
					value: `${handler.commands?.length}`,
					inline: true,
				},
				{
					name: "Guilds",
					value: `${size}`,
					inline: true,
				},
				{
					name: "Listeners",
					value: `${listenerCount}`,
					inline: true,
				},
				{
					name: "Members",
					value: `${numeral(usersSize).format("0,0")}`,
					inline: true,
				},
				{
					name: "Channels",
					value: `${numeral(client.channels.cache.size).format("0,0")}`,
					inline: true,
				},
				{
					name: "Lines",
					value: `${numeral(globalLines).format("0,0")}`,
					inline: true,
				},
				{
					name: "Installed by",
					value: `${approximate_user_install_count} users`,
					inline: true,
				},
				{
					name: "Installed in",
					value: `${approximate_guild_count} servers`,
					inline: true,
				},
			)
			.setFooter({ text: env.SOURCE_COMMIT || "trust" })
			.setDescription(`Up since: <t:${Math.round(upSince / 1000)}>`)
			.setThumbnail(
				client.user?.displayAvatarURL({ extension: "webp", size: 1024 })!,
			)
			.dominant();
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji("🔗")
				.setLabel("Invite")
				.setStyle(ButtonStyle.Link)
				.setURL(
					`https://discord.com/oauth2/authorize?client_id=${client.user?.id}`,
				),
		);
		return { embeds: [embed], components: [row] };
	},
} as ICommand;
