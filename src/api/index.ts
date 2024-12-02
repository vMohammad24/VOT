import { cors } from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { swagger } from '@elysiajs/swagger';
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ApplicationCommandOptionType, Collection } from 'discord.js';
import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid/non-secure';
import numeral from 'numeral';
import commandHandler, { redis, upSince } from '..';
import { getInstallCounts, loadImg } from '../util/database';
import { DuckDuckGoChat } from '../util/ddg';
import { GoogleLens } from '../util/lens';
import { camelToTitleCase, getTwoMostUsedColors, rgbToHex } from '../util/util';
import { getIpInfo } from '../util/vpn';
import { checkKey } from './apiUtils';
import brave from './brave';
import discord from './discord';
import spotify from './spotify';
import verification from './verification';
const discordElysia = new Elysia({ prefix: 'discord' });
const spotifyElysia = new Elysia({ prefix: 'spotify' });
const guildsElysia = new Elysia({ prefix: 'guilds' });
const braveElysia = new Elysia({ prefix: 'brave' });
discord(discordElysia);
spotify(spotifyElysia);
brave(braveElysia);
verification(guildsElysia);
const elysia = new Elysia()
	.use(html())
	.use(cors())
	.use(swagger({
		autoDarkMode: true,
		documentation: {
			info: {
				title: 'VOT API',
				version: '1.0.0',
				description: 'API for VOT',
				termsOfService: 'https://vot.wtf/tos',
			},

		},
		path: '/docs',
		exclude: [/^\/discord\/.*/, /^\/spotify\/.*/],
	}))
	.use(discordElysia)
	.use(spotifyElysia)
	.use(guildsElysia)
	.use(braveElysia)
	.onParse(async ({ request, contentType }) => {
		try {
			if (contentType === 'application/json') {
				return await request.json()
			}
		} catch (error) {
			return request.text()
		}
	})
	.onRequest(async ({ set, error, request }) => {
		const endpoint = new URL(request.url).pathname;
		const auth = request.headers.get('authorization');
		const needsAPIKey = endpoint.startsWith('/mostUsedColors') || endpoint.startsWith('/askDDG') || endpoint.startsWith('/googleLens') || endpoint.startsWith('/brave') || endpoint.startsWith('/ipinfo') || (endpoint.startsWith('/upload') && !endpoint.startsWith('/uploads'));
		if (needsAPIKey && !(await checkKey(auth))) {
			return error(401, 'Unauthorized');
		}

	}).onError(({ error }) => {
		commandHandler.logger.error(error);
	});
let totalCommands = -1;
let lastPing: number | 'N/A' = -1;
elysia.get('/', async () => {
	if (totalCommands == -1) totalCommands = commandHandler.commands!.length;
	const actualPing = commandHandler.client.ws.ping;
	const ping = (actualPing == -1 ? lastPing : actualPing) == -1 ? 'N/A' : lastPing;
	lastPing = ping;
	const { approximate_guild_count, approximate_user_install_count } = await getInstallCounts(commandHandler.client);
	return { ping, upSince, totalCommands, guilds: numeral(approximate_guild_count).format('0,0'), users: numeral(approximate_user_install_count).format('0,0') };
});

elysia.get('/commands', () => {
	const commands: {
		name: string;
		description: string;
		category: string;
		perms?: string[];
		type?: string;
	}[] = [];
	const cmds = commandHandler.commands!;
	for (const command of cmds) {
		if (command.perms == 'dev' || command.disabled) continue;
		const perms = (command.perms || []).map(a => camelToTitleCase(a.toString()));
		if (command.options) {
			for (const option of command.options!) {
				if (option.type == ApplicationCommandOptionType.Subcommand) {
					commands.push({
						name: `${command.name} ${option.name}`,
						description: option.description,
						category: command.category || 'All',
						perms,
						type: command.type
					});
				}
			}
		}
		commands.push({ name: command.name!, description: command.description, category: command.category || 'All', perms, type: typeof command.type == 'string' ? command.type : ('context' in command ? command.context as string : undefined) });
	}
	return commands;
}, {
	response: t.Array(t.Object({
		name: t.String(),
		description: t.String(),
		category: t.String(),
		perms: t.Optional(t.Array(t.String())),
		type: t.Optional(t.String())
	})),
	detail: {
		description: 'Get all commands',

	}
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

elysia.get(
	'/mostUsedColors',
	async ({ query }) => {
		const { url } = query;
		// if (!file.type.startsWith('image')) return { error: 'Invalid file type' };
		const cached = await redis.get(`colors:${url}`);
		if (cached) return JSON.parse(cached);
		const image = await loadImg(url);
		const mostUsed = getTwoMostUsedColors(image);
		const colors = mostUsed.map((color) => ({
			r: color[0],
			g: color[1],
			b: color[2],
			hex: rgbToHex(color),
		}));
		await redis.set(`colors:${url}`, JSON.stringify(colors), 'EX', 60 * 60);
		return colors;
	},
	{
		query: t.Object({
			url: t.String(),
		}),
		response: t.Array(t.Object({
			r: t.Number(),
			g: t.Number(),
			b: t.Number(),
			hex: t.String(),
		})),
		detail: {
			description: 'Get the two most used colors in an image',
		},
	},
);

elysia.post(
	'/googleLens',
	async ({ body }) => {
		const { file } = body;
		// if (file.type.startsWith('image')) return { error: 'File is not an image.' };
		// const buffer = Buffer.from(await file.text());
		const lens = new GoogleLens();
		const result = await lens.searchByFile(file);
		const filteredResults = result.similar.filter(
			(item: { pageURL: any; sourceWebsite: any; thumbnail: any }) =>
				item.pageURL && item.sourceWebsite && item.thumbnail,
		);
		return filteredResults;
	},
	{
		body: t.Object({
			file: t.File(),
		}),
		response: t.Array(t.Object({
			pageURL: t.String(),
			sourceWebsite: t.String(),
			thumbnail: t.String(),
		})),
		detail: {
			description: 'Search an image using Google Lens',
		},
	},
);
const col = new Collection<string, DuckDuckGoChat>();
elysia.post(
	'/askDDG',
	async ({ body, headers, set }) => {
		const { query, model } = body;
		let { sessionId } = body;
		if (!sessionId) sessionId = nanoid(20);
		if (!col.has(sessionId)) {
			col.set(
				sessionId,
				new DuckDuckGoChat(
					model as
					| 'gpt-4o-mini'
					| 'claude-3-haiku-20240307'
					| 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
					| 'mistralai/Mixtral-8x7B-Instruct-v0.1',
				),
			);
		}
		const chat = col.get(sessionId)!;
		const res = await chat.chat(query);
		return {
			response: res,
			sessionId,
		};
	},
	{
		body: t.Object({
			query: t.String(),
			model: t.String(),
			sessionId: t.Optional(t.String()),
		}),
		headers: t.Object({
			authorization: t.String(),
		}),
		response: t.Object({
			response: t.String(),
			sessionId: t.String(),
		}),
		detail: {
			description: 'Ask a question using DuckDuckGo Chat',
		},
	},
);

elysia.get('/ipinfo', async ({ query }) => {
	const { ip } = query;
	const ipRegex =
		/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
	if (!ipRegex.test(ip)) return { error: 'Invalid IP address' };
	return await getIpInfo(ip);
}, {
	query: t.Object({
		ip: t.String(),
	}),
	response: t.Object({}),
	detail: {
		description: 'Get information about an IP address',
	},
})

function encrypt(text: string, secretKey: string) {
	const iv = randomBytes(12); // Generate a 12-byte IV
	const cipher = createCipheriv(
		'aes-256-gcm',
		Uint8Array.from(Buffer.from(secretKey, 'hex')), // Ensure Uint8Array
		Uint8Array.from(iv) // Ensure Uint8Array
	);
	let encrypted = cipher.update(text, 'utf-8', 'hex');
	encrypted += cipher.final('hex');
	const authTag = cipher.getAuthTag(); // Get the authentication tag

	return {
		iv: iv.toString('hex'),
		encryptedData: encrypted,
		authTag: authTag.toString('hex')
	};
}

function decrypt(encryptedData: string, secretKey: string, iv: string, authTag: string) {
	const decipher = createDecipheriv(
		'aes-256-gcm',
		new Uint8Array(Buffer.from(secretKey, 'hex')),
		new Uint8Array(Buffer.from(iv, 'hex'))
	);
	decipher.setAuthTag(new Uint8Array(Buffer.from(authTag, 'hex'))); // Set the authentication tag

	let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
	decrypted += decipher.final('utf-8');
	return decrypted;
}

// Generate a 32-byte (256-bit) key
elysia.post('/upload', async ({ body, request }) => {
	const { file, deleteAfter } = body;
	const id = nanoid(10);
	const key = randomBytes(32).toString('hex');
	try {
		const d = encrypt(Buffer.from(await file.arrayBuffer()).toString('base64'), key);
		redis.set(`uploads:${id}`, JSON.stringify(
			{
				data: d.encryptedData,
				type: file.type,
				name: file.name,
				date: Date.now(),
				iv: d.iv,
				authTag: d.authTag
			}
		), 'EX', (deleteAfter ?? 24 * 60) * 60);
		const u = new URL(request.url);
		return {
			fileURL: `${u.href}s/${id}?key=${key}`,
		}
	} catch (e) {
		return e;
	}
}, {
	body: t.Object({
		file: t.File(),
		deleteAfter: t.Optional(t.Number())
	}),
});

elysia.get('/uploads/raw/:id', async ({ query, params }) => {
	const { id } = params;
	const { key } = query;
	const data = await redis.get(`uploads:${id}`);
	if (!data) return { message: 'File not found' };
	const { data: f, type, name, iv, authTag } = JSON.parse(data);
	const buffer = Buffer.from(decrypt(f, key, iv, authTag), 'base64');
	const blob = new Blob([new Uint8Array(buffer)])
	const file = new File([blob], name, { type });
	return file;
}, {
	detail: {
		description: 'Get an uploaded file',
	},
	query: t.Object({
		key: t.String(),
	})
});

elysia.get('/uploads/:id', async ({ params, query, request }) => {
	const { id } = params;
	const { key } = query;
	const data = await redis.get(`uploads:${id}`);
	if (!data) return { message: 'File not found' };
	const { data: f, type, name, date } = JSON.parse(data);
	const buffer = Buffer.from(f, 'base64');
	const fileSize = numeral(buffer.byteLength).format('0,0b');
	const rawURL = `${new URL(request.url).origin}/uploads/raw/${id}?key=${key}`;
	const domColor = rgbToHex(getTwoMostUsedColors(await loadImg(rawURL))[0]);
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${name} | vot.wtf</title>
    <meta charset="UTF-8"/>
    <meta http-equiv="x-ua-compatible" content="ie=edge"/>
    <meta name="viewport" content="width=device-width">
    <meta name="robots" content="noindex">
            <meta name="twitter:card" content="summary_large_image"/>
            <meta name="twitter:image" content="${rawURL}">

    <meta property="og:type" content="link">
    <meta property="og:version" content="1.0">
    <meta property="og:title" content="Cool ahh">
    <meta property="og:author_name" content="VOT Uploading">
    <meta property="og:author_url" content="https://vot.wtf">
    <meta property="og:provider_name" content="VOT">
    <meta property="og:provider_url" content="https://vot.wtf">
        <meta name="theme-color" content="${domColor}"/>
            <meta name="pubdate" content="${new Date(date).toString()}"/>
	

</head>
<body style="background-color: #121212; font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #ffffff;">

    <main style="display: flex; min-height: 100vh; justify-content: center; align-items: center; padding: 20px;overflow-y:hidden;">

        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);">

            <h1 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 10px;">
                ${name} <span style="color: #bbbbbb;">(${fileSize})</span>
            </h1>
            <p style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 20px;">
                Uploaded at: ${new Date(date).toUTCString()}
            </p>

            <img src="${rawURL}" alt="${name}"
                style="border-radius: 12px; max-width: 100%; max-height: 60vh; object-fit: cover; cursor: pointer; transition: transform 0.3s, box-shadow 0.3s;"
                onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 30px ${domColor}';"
                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
        </div>

    </main>

</body>


</html>`
}, {
	detail: {
		description: 'Get an uploaded file',
	},
	query: t.Object({
		key: t.String()
	})
});
export default elysia;
