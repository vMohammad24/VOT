import { APIApplication, EmbedBuilder } from 'discord.js';
import numeral from 'numeral';
import { join } from 'path';
import ICommand from '../../handler/interfaces/ICommand';

let globalLines = 0;
async function getLines() {
	const glob = new Bun.Glob('**/*.{ts,js,mjs,json}');
	const files = await glob.scanSync({
		absolute: true,
		cwd: join(import.meta.dir, '..', '..'),
	});
	const node_modules = await glob.scanSync({
		absolute: true,
		cwd: join(import.meta.dir, '..', '..', '..', 'node_modules'),
	});
	let lines = 0;
	for (const path of files) {
		if (!path) continue;
		try {
			const file = Bun.file(path);
			const content = await file.text();
			lines += content.split('\n').length;
		} catch (e) {}
	}
	for (const path of node_modules) {
		if (!path) continue;
		try {
			const file = Bun.file(path);
			const content = await file.text();
			lines += content.split('\n').length;
		} catch (e) {}
	}
	return lines;
}
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
		const res = (await client.rest.get('/applications/@me')) as APIApplication;
		const { approximate_guild_count, approximate_user_install_count } = res;
		if (globalLines === 0) globalLines = await getLines();
		const embed = new EmbedBuilder()
			.setTitle('Bot Stats')
			.addFields(
				{
					name: 'Memory Usage',
					value: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
					inline: true,
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
			.setTimestamp();
		return { embeds: [embed] };
	},
} as ICommand;
