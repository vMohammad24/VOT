import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { loadImage } from '@napi-rs/canvas';
import { ApplicationCommandOptionType, Collection } from 'discord.js';
import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid/non-secure';
import commandHandler, { redis, upSince } from '..';
import { DuckDuckGoChat } from '../util/ddg';
import { GoogleLens } from '../util/lens';
import { getTwoMostUsedColors, rgbToHex } from '../util/util';
import brave from './brave';
import discord from './discord';
import spotify from './spotify';
import verification from './verification';
const discordElysia = new Elysia({ prefix: 'discord' })
const spotifyElysia = new Elysia({ prefix: 'spotify' })
const guildsElysia = new Elysia({ prefix: 'guilds' })
const braveElysia = new Elysia({ prefix: 'brave' })
discord(discordElysia);
spotify(spotifyElysia);
brave(braveElysia);
verification(guildsElysia);
const elysia = new Elysia()
	.use(cors())
	.use(swagger())
	.use(discordElysia)
	.use(spotifyElysia)
	.use(guildsElysia)
	.use(braveElysia);
let totalCommands = -1;
let lastPing: number | 'N/A' = -1;
elysia.get('/', function () {
	if (totalCommands == -1) totalCommands = commandHandler.commands!.length;
	const actualPing = commandHandler.client.ws.ping;
	const ping = (actualPing == -1 ? lastPing : actualPing) == -1 ? 'N/A' : lastPing;
	lastPing = ping;
	return { ping, upSince, totalCommands };
});

elysia.get('/commands', () => {
	const commands: {
		name: string;
		description: string;
	}[] = [];
	const cmds = commandHandler.commands!;
	for (const command of cmds) {
		if (command.perms == 'dev' || command.disabled) continue;
		if (command.options) {
			for (const option of command.options!) {
				if (option.type == ApplicationCommandOptionType.Subcommand) {
					commands.push({
						name: `${command.name} ${option.name}`,
						description: option.description,
					});
				}
			}
		}
		commands.push({ name: command.name!, description: command.description });
	}
	return commands;
});

elysia.get('/commands/:name', ({ params: { name }, set }) => {
	const command = commandHandler.commands!.find((cmd) => cmd.name === name);
	if (!command) {
		set.status = 404;
		return {
			error: 'Command not found',
		};
	}
	return command;
});

elysia.get('/mostUsedColors', async ({ query }) => {
	const { url } = query;
	// if (!file.type.startsWith('image')) return { error: 'Invalid file type' };
	const cached = await redis.get(`colors:${url}`);
	if (cached) return JSON.parse(cached);
	const image = await loadImage(url);
	const mostUsed = getTwoMostUsedColors(image);
	const colors = mostUsed.map((color) => ({
		r: color[0],
		g: color[1],
		b: color[2],
		hex: rgbToHex(color),
	}));
	await redis.set(`colors:${url}`, JSON.stringify(colors), 'EX', 60 * 60);
	return colors;
}, {
	query: t.Object({
		url: t.String(),
	})
})

elysia.post('/googleLens', async ({ body }) => {
	const { file } = body;
	// if (file.type.startsWith('image')) return { error: 'File is not an image.' };
	// const buffer = Buffer.from(await file.text());
	const lens = new GoogleLens();
	const result = await lens.searchByFile(file)
	const filteredResults = result.similar.filter((item: { pageURL: any; sourceWebsite: any; thumbnail: any; }) => item.pageURL && item.sourceWebsite && item.thumbnail);
	return filteredResults;
}, {
	body: t.Object({
		file: t.File(),
	})
})
export const apiKeys = ['VOT-MSSWAKANGHYUK-ELY-KEY'];
const col = new Collection<string, DuckDuckGoChat>();
elysia.post('/askDDG', async ({ body, headers, set }) => {
	const { query, model } = body;
	let { sessionId } = body;
	const { authorization } = headers;
	if (!apiKeys.includes(authorization)) {
		set.status = 401;
		return { error: 'Unauthorized' };
	};
	if (!sessionId) sessionId = nanoid(20);
	if (!col.has(sessionId)) {
		col.set(sessionId, new DuckDuckGoChat(model as "gpt-4o-mini" | "claude-3-haiku-20240307" | "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo" | "mistralai/Mixtral-8x7B-Instruct-v0.1"));
	}
	const chat = col.get(sessionId)!;
	const res = await chat.chat(query);
	return {
		response: res,
		sessionId
	};
}, {
	body: t.Object({
		query: t.String(),
		model: t.String(),
		sessionId: t.Optional(t.String()),
	}),
	headers: t.Object({
		authorization: t.String(),
	})
})



export default elysia;
