import axios from 'axios';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import numeral from 'numeral';
import { join } from 'path';
import { upSince } from '../..';
import ICommand from '../../handler/interfaces/ICommand';
import { getInstallCounts } from '../../util/database';
import VOTEmbed from '../../util/VOTEmbed';
async function getLines() {
	const glob = new Bun.Glob('**/*.{ts,js,mjs,json}');
	const results = glob.scanSync({
		absolute: true,
		cwd: join(import.meta.dir, '..', '..'),
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

let globalLines = '';
getLines();
async function getCurrentCommit(): Promise<{ message: string; date: Date }> {
	const headers = {
		Authorization: `Bearer ${import.meta.env.GITHUB_TOKEN}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	const { data } = await axios.get('https://api.github.com/repos/vMohammad24/VOT/commits', {
		headers,
	});
	const commit = data[0].commit;
	const message = (commit.message as string).replace('[silent]', '').trim();
	const date = new Date(commit.committer.date);
	return { message, date };
}
const commit = await getCurrentCommit();

export default {
	name: 'stats',
	description: 'Shows the bot stats',
	type: 'all',
	execute: async ({ handler }) => {
		const { client } = handler;
		const { memoryUsage } = process;
		const { heapUsed } = memoryUsage();
		const { users, guilds } = client;
		const { size } = guilds.cache;
		const { size: usersSize } = users.cache;
		const { approximate_guild_count, approximate_user_install_count } = await getInstallCounts(client);
		// if (globalLines === 0) globalLines = await getLines();
		const embed = await new VOTEmbed()
			.setTitle('Bot Stats')
			.addFields(
				{
					name: 'Memory Usage',
					value: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
					inline: true,
				},
				{
					name: 'Commands',
					value: `${handler.commands!.length}`,
					inline: true,
				},
				{
					name: 'Guilds',
					value: `${size}`,
					inline: true,
				},
				{
					name: 'Members',
					value: `${numeral(usersSize).format('0,0')}`,
					inline: true,
				},
				{
					name: 'Channels',
					value: `${numeral(client.channels.cache.size).format('0,0')}`,
					inline: true,
				},
				{
					name: 'Lines',
					value: `${numeral(globalLines).format('0,0')}`,
					inline: true,
				},
				{
					name: 'Installed by',
					value: `${approximate_user_install_count} users`,
					inline: true,
				},
				{
					name: 'Installed in',
					value: `${approximate_guild_count} servers`,
					inline: true,
				},
			)
			.setTimestamp(commit.date)
			.setFooter({ text: commit.message })
			.setDescription(`Up since: <t:${Math.round(upSince / 1000)}>`)
			.setThumbnail(client.user?.displayAvatarURL({ extension: 'webp', size: 1024 })!)
			.dominant();
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji('🔗')
				.setLabel('Invite')
				.setStyle(ButtonStyle.Link)
				.setURL(
					`https://discord.com/oauth2/authorize?client_id=${client.user?.id}`,
				),
		);
		return { embeds: [embed], components: [row] };
	},
} as ICommand;
