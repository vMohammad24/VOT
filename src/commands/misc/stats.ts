import axios from 'axios';
import { APIApplication, EmbedBuilder } from 'discord.js';
import Docker from 'dockerode';
import numeral from 'numeral';
import { join } from 'path';
import { upSince } from '../..';
import ICommand from '../../handler/interfaces/ICommand';
let globalLines = 0;
const docker = new Docker();

interface MemoryStats {
	name: string;
	memoryUsage: number;
}
async function getMemoryStats(): Promise<MemoryStats[]> {
	const containers = await docker.listContainers();
	const statsPromises = containers.map(async (container) => {
		const stats = await docker.getContainer(container.Id).stats({ stream: false });
		return {
			name: container.Names[0].substring(1),
			memoryUsage: Math.pow(1024, -2) * stats.memory_stats.usage,
		} as MemoryStats;
	});

	const stats = await Promise.all(statsPromises);
	return stats;
}
async function getLines() {
	const glob = new Bun.Glob('**/*.{ts,js,mjs,json}');
	const files = await glob.scanSync({
		absolute: true,
		cwd: join(import.meta.dir, '..', '..'),
	});
	// const node_modules = await glob.scanSync({
	// 	absolute: true,
	// 	cwd: join(import.meta.dir, '..', '..', '..', 'node_modules'),
	// });
	let lines = 0;
	for (const path of files) {
		if (!path) continue;
		try {
			const file = Bun.file(path);
			const content = await file.text();
			lines += content.split('\n').length;
		} catch (e) { }
	}
	// for (const path of node_modules) {
	// 	if (!path) continue;
	// 	try {
	// 		const file = Bun.file(path);
	// 		const content = await file.text();
	// 		lines += content.split('\n').length;
	// 	} catch (e) {}
	// }
	return lines;
}

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
	const message = commit.message;
	const date = new Date(commit.committer.date);
	return { message, date };
}
const commit = await getCurrentCommit();
export default {
	name: 'stats',
	description: 'Shows the bot stats',
	type: 'all',
	execute: async ({ handler, interaction }) => {
		const { client } = handler;
		const { memoryUsage } = process;
		const { heapUsed } = memoryUsage();
		const { users, guilds } = client;
		const { size } = guilds.cache;
		const { size: usersSize } = users.cache;
		await interaction?.deferReply();
		const res = (await client.rest.get('/applications/@me')) as APIApplication;
		const { approximate_guild_count, approximate_user_install_count } = res;
		if (globalLines === 0) globalLines = await getLines();
		const dockerStats = await getMemoryStats();
		const embed = new EmbedBuilder()
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
					name: 'Uptime',
					value: `<t:${Math.round(upSince / 1000)}>`,
				},
				{
					name: 'Guilds',
					value: `${size}`,
					inline: true,
				},
				{
					name: 'Users',
					value: `${usersSize}`,
					inline: true,
				},
				{
					name: 'Channels',
					value: `${client.channels.cache.size}`,
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
			.setThumbnail(client.user?.displayAvatarURL({ extension: 'webp', size: 1024 })!)
		embed.addFields(
			dockerStats.map((stat) => {
				return {
					name: stat.name,
					value: numeral(stat.memoryUsage).format('0.0') + ' MB',
					inline: true,
				};
			}),
		)
		return { embeds: [embed] };
	},
} as ICommand;
