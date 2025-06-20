import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { swagger } from "@elysiajs/swagger";
import axios, { type AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { ApplicationCommandOptionType } from "discord.js";
import { Elysia, t } from "elysia";
import { Client } from "genius-lyrics";
import { nanoid } from "nanoid/non-secure";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import numeral from "numeral";
import UserAgent from "user-agents";
import commandHandler, { redis, upSince } from "..";
import {
	findCurrency,
	isValidCurrency,
	loadExchangeRates,
} from "../util/currency";
import { getInstallCounts, loadImg } from "../util/database";
import { GoogleLens } from "../util/lens";
import { camelToTitleCase, getTwoMostUsedColors, rgbToHex } from "../util/util";
import { getIpInfo } from "../util/vpn";
import { checkKey } from "./apiUtils";
import brave from "./brave";
import discord from "./discord";
import spotify from "./spotify";
import verification from "./verification";
const discordElysia = new Elysia({ prefix: "discord" });
const spotifyElysia = new Elysia({ prefix: "spotify" });
const guildsElysia = new Elysia({ prefix: "guilds" });
const braveElysia = new Elysia({ prefix: "brave" });
discord(discordElysia);
spotify(spotifyElysia);
brave(braveElysia);
verification(guildsElysia);
const globalAPIKey =
	Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15);
export let apiAxios: AxiosInstance;
const elysia = new Elysia()
	.use(cors())
	.use(
		swagger({
			autoDarkMode: true,
			documentation: {
				info: {
					title: "VOT API",
					version: "1.0.0",
					description: "API for VOT",
					termsOfService: "https://vot.wtf/tos",
				},
			},
			path: "/docs",
			exclude: [/^\/discord\/.*/, /^\/spotify\/.*/],
		}),
	)
	.use(html())
	.use(discordElysia)
	.use(spotifyElysia)
	.use(guildsElysia)
	.use(braveElysia)
	.on("start", () => {
		apiAxios = axios.create({
			baseURL: elysia.server?.url?.toString(),
			headers: {
				authorization: globalAPIKey,
			},
		});
	})
	.onParse(async ({ request, contentType }) => {
		try {
			if (contentType === "application/json") {
				return await request.json();
			}
		} catch (error) {
			return request.text();
		}
	})
	.onRequest(async ({ set, error, request }) => {
		const endpoint = new URL(request.url).pathname;
		const auth = request.headers.get("authorization");
		const needsAPIKey =
			endpoint.startsWith("/mostUsedColors") ||
			endpoint.startsWith("/lyrics") ||
			endpoint.startsWith("/askDDG") ||
			endpoint.startsWith("/googleLens") ||
			endpoint.startsWith("/brave") ||
			(endpoint.startsWith("/upload") && !endpoint.startsWith("/uploads"));
		if (
			needsAPIKey &&
			commandHandler.prodMode &&
			!((await checkKey(auth)) || auth === globalAPIKey)
		) {
			return error(401, "Unauthorized");
		}
	})
	.onError(({ error }) => {
		commandHandler.logger.error(error);
	});
let totalCommands = -1;
let lastPing: number | "N/A" = -1;
elysia.get("/", async () => {
	if (totalCommands === -1) totalCommands = commandHandler.commands?.length ?? 0;
	const actualPing = commandHandler.client.ws.ping;
	const ping =
		(actualPing === -1 ? lastPing : actualPing) === -1 ? "N/A" : lastPing;
	lastPing = ping;
	const { approximate_guild_count, approximate_user_install_count } =
		await getInstallCounts(commandHandler.client);
	const featuredServers = commandHandler.client.guilds.cache
		.filter((g) =>
			commandHandler.prodMode
				? g.memberCount >= 100 &&
				g.nsfwLevel !== 1 &&
				g.nsfwLevel !== 3
				: true,
		)
		.map((g) => ({
			name: g.name,
			id: g.id,
			memberCount: g.memberCount,
			vanityURL: g.vanityURLCode,
			iconURL: g.iconURL(),
		}))
		.sort((a, b) => b.memberCount - a.memberCount);
	// await new Promise(resolve => setTimeout(resolve, 5000));
	return {
		ping,
		upSince,
		totalCommands,
		guilds: numeral(approximate_guild_count).format("0,0"),
		users: numeral(approximate_user_install_count).format("0,0"),
		featuredServers,
	};
});
elysia.get(
	"/commands",
	() => {
		interface Command {
			name: string;
			description: string;
			category: string;
			perms?: string[];
			type?: string;
			context: boolean;
			subcommands?: Command[];
		}
		const commands: Command[] = [];
		const cmds = commandHandler.commands!;
		for (const command of cmds) {
			if (command.perms === "dev" || command.disabled) continue;
			const perms = (command.perms || []).map((a) =>
				camelToTitleCase(a.toString()),
			);
			const cmd: Command = {
				name: command.name!,
				description: command.description,
				category: command.category || "All",
				perms,
				type:
					typeof command.type === "string"
						? command.type
						: "context" in command
							? (command.context as string)
							: undefined,
				context: "context" in command,
			};
			if (command.options) {
				for (const option of command.options!) {
					if (option.type === ApplicationCommandOptionType.Subcommand) {
						if (!cmd.subcommands) cmd.subcommands = [];
						cmd.subcommands.push({
							name: option.name,
							description: option.description,
							category: command.category || "All",
							perms,
							type: command.type,
							context: false,
						});
					}
				}
			}
			commands.push(cmd);
		}
		return commands;
	},
	{
		response: t.Array(
			t.Object({
				name: t.String(),
				description: t.String(),
				category: t.String(),
				perms: t.Optional(t.Array(t.String())),
				type: t.Optional(t.String()),
				context: t.Boolean(),
				subcommands: t.Optional(
					t.Array(
						t.Object({
							name: t.String(),
							description: t.String(),
							category: t.String(),
							perms: t.Optional(t.Array(t.String())),
							type: t.Optional(t.String()),
							context: t.Boolean(),
						}),
					),
				),
			}),
		),
		detail: {
			description: "Get all commands",
		},
	},
);

elysia.get("/commands/:name", ({ params: { name }, set }) => {
	const cmds = commandHandler.commands!;
	const commands = [];
	for (const command of cmds) {
		if (command.perms === "dev" || command.disabled) continue;
		const perms = (command.perms || []).map((a) =>
			camelToTitleCase(a.toString()),
		);
		if (command.options) {
			for (const option of command.options!) {
				if (option.type === ApplicationCommandOptionType.Subcommand) {
					commands.push({
						name: `${command.name} ${option.name}`,
						description: option.description,
						category: command.category || "All",
						perms,
						type: command.type,
						context: false,
					});
				}
			}
		}
		commands.push({
			options: command.options,
			name: command.name!,
			description: command.description,
			category: command.category || "All",
			perms,
			type:
				typeof command.type === "string"
					? command.type
					: "context" in command
						? (command.context as string)
						: undefined,
			context: "context" in command,
		});
	}
	const command = commands.find(
		(c) => c.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0,
	);
	return command || { error: "Command not found" };
});

elysia.get(
	"/mostUsedColors",
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
		await redis.set(`colors:${url}`, JSON.stringify(colors), "EX", 60 * 60);
		return colors;
	},
	{
		query: t.Object({
			url: t.String(),
		}),
		response: t.Array(
			t.Object({
				r: t.Number(),
				g: t.Number(),
				b: t.Number(),
				hex: t.String(),
			}),
		),
		detail: {
			description: "Get the two most used colors in an image",
		},
	},
);

elysia.post(
	"/googleLens",
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
		response: t.Array(
			t.Object({
				pageURL: t.String(),
				sourceWebsite: t.String(),
				thumbnail: t.String(),
			}),
		),
		detail: {
			description: "Search an image using Google Lens",
		},
	},
);
// const col = new Collection<string, DuckDuckGoChat>();
// elysia.post(
// 	"/askDDG",
// 	async ({ body, headers, set }) => {
// 		const { query, model } = body;
// 		let { sessionId } = body;
// 		if (!sessionId) sessionId = nanoid(20);
// 		if (!col.has(sessionId)) {
// 			col.set(
// 				sessionId,
// 				new DuckDuckGoChat(
// 					model as
// 					| "gpt-4o-mini"
// 					| "claude-3-haiku-20240307"
// 					| "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
// 					| "mistralai/Mixtral-8x7B-Instruct-v0.1",
// 				),
// 			);
// 		}
// 		const chat = col.get(sessionId)!;
// 		const res = await chat.chat(query);
// 		return {
// 			response: res,
// 			sessionId,
// 		};
// 	},
// 	{
// 		body: t.Object({
// 			query: t.String(),
// 			model: t.String(),
// 			sessionId: t.Optional(t.String()),
// 		}),
// 		headers: t.Object({
// 			authorization: t.String(),
// 		}),
// 		response: t.Object({
// 			response: t.String(),
// 			sessionId: t.String(),
// 		}),
// 		detail: {
// 			description: "Ask a question using DuckDuckGo Chat",
// 		},
// 	},
// );

elysia.get(
	"/ipinfo",
	async ({ query }) => {
		const { ip } = query;
		const ipRegex =
			/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		if (!ipRegex.test(ip)) return { error: "Invalid IP address" };
		return await getIpInfo(ip);
	},
	{
		query: t.Object({
			ip: t.String(),
		}),
		detail: {
			description: "Get information about an IP address",
		},
	},
);

function encrypt(text: string, secretKey: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv(
		"aes-256-gcm",
		Uint8Array.from(Buffer.from(secretKey, "hex")),
		Uint8Array.from(iv),
	);
	let encrypted = cipher.update(text, "utf-8", "hex");
	encrypted += cipher.final("hex");
	const authTag = cipher.getAuthTag();

	return {
		iv: iv.toString("hex"),
		encryptedData: encrypted,
		authTag: authTag.toString("hex"),
	};
}

function decrypt(
	encryptedData: string,
	secretKey: string,
	iv: string,
	authTag: string,
) {
	const decipher = createDecipheriv(
		"aes-256-gcm",
		new Uint8Array(Buffer.from(secretKey, "hex")),
		new Uint8Array(Buffer.from(iv, "hex")),
	);
	decipher.setAuthTag(new Uint8Array(Buffer.from(authTag, "hex")));

	let decrypted = decipher.update(encryptedData, "hex", "utf-8");
	decrypted += decipher.final("utf-8");
	return decrypted;
}

elysia.post(
	"/upload",
	async ({ body, request }) => {
		const { file, deleteAfter } = body;
		const id = nanoid(10);
		const key = randomBytes(32).toString("hex");
		try {
			const d = encrypt(
				Buffer.from(await file.arrayBuffer()).toString("base64"),
				key,
			);
			redis.set(
				`uploads:${id}`,
				JSON.stringify({
					data: d.encryptedData,
					type: file.type,
					name: file.name,
					date: Date.now(),
					iv: d.iv,
					authTag: d.authTag,
				}),
				"EX",
				(deleteAfter ?? 24 * 60) * 60,
			);
			const u = new URL(request.url);
			return {
				fileURL: `${u.href}s/${id}?key=${key}`,
			};
		} catch (e) {
			return e;
		}
	},
	{
		body: t.Object({
			file: t.File(),
			deleteAfter: t.Optional(t.Number()),
		}),
	},
);

elysia.get(
	"/uploads/raw/:id",
	async ({ query, params }) => {
		const { id } = params;
		const { key } = query;
		const data = await redis.get(`uploads:${id}`);
		if (!data) return { message: "File not found" };
		const { data: f, type, name, iv, authTag } = JSON.parse(data);
		const buffer = Buffer.from(decrypt(f, key, iv, authTag), "base64");
		const blob = new Blob([new Uint8Array(buffer)]);
		const file = new File([blob], name, { type });
		return file;
	},
	{
		detail: {
			description: "Get an uploaded file",
		},
		query: t.Object({
			key: t.String(),
		}),
	},
);

elysia.get(
	"/uploads/:id",
	async ({ params, query, request }) => {
		const { id } = params;
		const { key } = query;
		const data = await redis.get(`uploads:${id}`);
		if (!data) return { message: "File not found" };
		const { data: f, type, name, date } = JSON.parse(data);
		const buffer = Buffer.from(f, "base64");
		const fileSize = numeral(buffer.byteLength).format("0,0b");
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


</html>`;
	},
	{
		detail: {
			description: "Get an uploaded file",
		},
		query: t.Object({
			key: t.String(),
		}),
	},
);


elysia.get("/health", () => {
	return "OK";
})
elysia.get(
	"/hypixel",
	async ({ query }) => {
		if (commandHandler.prodMode)
			return { error: "This endpoint is disabled in production mode" };
		const { name: playerName } = query;
		const url = `http://plancke.io/hypixel/player/stats/${playerName}`;
		const headers = {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36 QIHU 360SE",
		};

		try {
			const response = await axios.get(url, { headers });
			const $ = cheerio.load(response.data);
			const card = $(
				"#wrapper > div.content-page > div > div > div:nth-child(2) > div.col-lg-3.b-0.p-0 > div:nth-child(1) > div",
			);
			const details = {
				rank:
					card
						.find("span")
						.text()
						.match(/\[([A-Z\d+]+)\]/)?.[1] ?? null,
				playerName:
					card.find("span").text().split("]").pop()?.split(" [")[0].trim() ??
					null,
				multiplier:
					card
						.find('b:contains("Multiplier:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				level:
					card
						.find('b:contains("Level:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				karma:
					card
						.find('b:contains("Karma:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				achievementPoints:
					card
						.find('b:contains("Achievement Points:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				questsCompleted:
					card
						.find('b:contains("Quests Completed:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				ranksGifted:
					card
						.find('b:contains("Ranks Gifted:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				firstLogin:
					card
						.find('b:contains("First login:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				lastLogin:
					card
						.find('b:contains("Last login:")')
						.parent()
						.text()
						.split(":")[1]
						?.split("\n")[0]
						?.trim() ?? null,
				skyblockLink:
					card.find('a:contains("SkyBlock Stats")').attr("href") ?? null,
			};
			return details;
		} catch (error) {
			console.error("Error fetching player info:", error);
		}
		// const cached = await redis.get(`hypixel:${playerName}`);
		// let data: string;
		// if (cached) {
		// 	data = cached;
		// } else {
		// 	const res = await axios.get(`https://plancke.io/hypixel/player/stats/${playerName}`);
		// 	if (res.status == 404) return { error: 'Player not found' };
		// 	data = res.data;
		// 	redis.set(`hypixel:${playerName}`, data, 'EX', 60 * 60);
		// }
		// const $ = cheerio.load(data);
		// const stats: { [key: string]: string | undefined | null } = {};
		// const playerInfoDiv = $('.card-box.m-b-10');
		// const firstSpan = playerInfoDiv.find('span');
		// const rank = firstSpan.first().text().match(/\[(.*?)\]/)?.[1];
		// const name = firstSpan.first().text().split('] ')[1].split(' [')[0];
		// const guild = firstSpan.first().text().split(' [')[1].replace(']', '');
		// stats.rank = rank;
		// stats.name = name;
		// stats.guild = guild;
		// function getData(label: string) {
		// 	return $(`b:contains(${label})`).next().text().trim();
		// }
		// stats.multiplier = getData("Multiplier:");
		// console.log($('/html/body/div/div[3]/div/div/div[2]/div[1]/div[1]/div/b[5]').text())
		// return stats;
	},
	{
		query: t.Object({
			name: t.String(),
		}),
	},
);
const genius = new Client();
const userAgent = new UserAgent();
elysia.get(
	"/lyrics",
	async ({ query }) => {
		const { query: q } = query;
		// Check cache first
		const cached = await redis.get(`lyrics:${q}`);
		if (cached) {
			return JSON.parse(cached);
		}

		const songs = await genius.songs.search(q, { sanitizeQuery: true });
		const song = songs[0];
		if (!song) return { error: "Song not found" };
		const lyrics = await song.lyrics();
		if (!lyrics) return { error: "Lyrics not found" };
		const { id } = song;
		const url = `https://genius.com/songs/${id}/apple_music_player?react=1`;
		const res = await axios.get(url, {
			headers: {
				"User-Agent": userAgent.random().toString(),
			},
		});
		const $ = cheerio.load(res.data);
		const previewURL = $('link[rel="preload"][as="audio"]').attr("href");

		const response = {
			lyrics,
			...song._raw,
			previewURL,
		};
		await redis.set(
			`lyrics:${q}`,
			JSON.stringify(response),
			"EX",
			60 * 60 * 24,
		);

		return response;
	},
	{
		query: t.Object({
			query: t.String(),
		}),
		headers: t.Object({
			authorization: t.String(),
		}),
	},
);

elysia.get(
	"/convertCurrency",
	async ({ query: { amount, from, to } }) => {
		const rates = await loadExchangeRates();

		if (!isValidCurrency(from, rates)) {
			return { error: `Invalid source currency "${from}"` };
		}

		if (!isValidCurrency(to, rates)) {
			return { error: `Invalid target currency "${to}"` };
		}

		const fromCurrency = findCurrency(from, rates)!;
		const toCurrency = findCurrency(to, rates)!;

		const result = amount * (toCurrency.value / fromCurrency.value);

		return {
			from: {
				...fromCurrency,
				formatted: `${numeral(amount).format("0,0")}${fromCurrency.unit}`,
			},
			to: {
				...toCurrency,
				formatted: `${numeral(result).format("0,0.0000")}${toCurrency.unit}`,
			},
			amount,
			result,
		};
	},
	{
		query: t.Object({
			from: t.String(),
			to: t.String(),
			amount: t.Number(),
		}),
	},
);

export default elysia;
