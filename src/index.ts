import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { inspect } from "bun";
import {
	ActivityType,
	Client,
	EmbedBuilder,
	Events,
	IntentsBitField,
	WebhookClient,
} from "discord.js";
import Redis from "ioredis";
import { Kazagumo, Plugins } from "kazagumo";
import Spotify from "kazagumo-spotify";
import { gracefulShutdown, scheduleJob, scheduledJobs } from "node-schedule";
import { Connectors, type NodeOption } from "shoukaku";
import UserAgent from "user-agents";
import app from "./api";
import CommandHandler from "./handler/index";
import { initEmojis } from "./util/emojis";
import { endGiveaway } from "./util/giveaways";
import { launchPuppeteer } from "./util/puppeteer";
const isProduction = process.env.NODE_ENV === "production";
export const upSince = Date.now();

const nodes: NodeOption[] = [
	{
		url: `${process.env.LAVALINK_URL}:2333`,
		name: "local",
		auth: process.env.LAVALINK_PASSWORD!,
		secure: false,
	},
];
const client = new Client({
	intents: [
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildVoiceStates,
		IntentsBitField.Flags.MessageContent,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildModeration,
	],
});

const errorsWebhook = new WebhookClient({
	url: process.env.WEBHOOK_URL!,
});

const kazagumo = new Kazagumo(
	{
		defaultSearchEngine: "youtube",
		send: (guildId, payload) => {
			const guild = client.guilds.cache.get(guildId);
			if (guild) guild.shard.send(payload);
		},
		plugins: [
			new Plugins.PlayerMoved(client),
			new Spotify({
				clientId: process.env.SPOTIFY_CLIENT_ID!,
				clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
			}),
		],
	},
	new Connectors.DiscordJS(client),
	nodes,
	{
		resumeByLibrary: true,
		resumeTimeout: 5_000,
	},
);

const prisma = new PrismaClient();
export const redis = new Redis({
	host: process.env.NODE_ENV === "production" ? "redis" : "localhost",
});

const commandHandler = new CommandHandler({
	client,
	prisma,
	kazagumo,
	prodMode: isProduction,
	testServers: ["925779955500060762"],
	developers: import.meta.env.DEVELOPERS?.split(",") || [
		"921098159348924457",
		"981269274616295564",
	],
	commandsDir: `${import.meta.dir}/commands`,
	listenersDir: `${import.meta.dir}/listeners`,
	contextCommandsDir: `${import.meta.dir}/contextCommands`,
	globalPrefix: ";",
	verbose: !isProduction,
});

commandHandler.logger.info(
	`Starting in ${isProduction ? "production" : "development"} mode`,
);

client.on(Events.ClientReady, async (c) => {
	initEmojis();
	c.user.setActivity({
		name: "vot.wtf",
		type: ActivityType.Watching,
		url: "https://vot.wtf",
	});
	const giveaways = await prisma.giveaway.findMany();
	for (const giveaway of giveaways) {
		if (!giveaway.ended) {
			if (new Date(giveaway.end).getTime() < Date.now()) {
				endGiveaway(giveaway.id);
				continue;
			}
			if (scheduledJobs[giveaway.id]) return;
			scheduleJob(giveaway.id, giveaway.end, async () => {
				endGiveaway(giveaway.id);
			});
		}
	}
	commandHandler.logger.info(`Logged in as ${c.user.displayName}`);
	axios.defaults.headers.common["Accept-Encoding"] = "gzip";

	axios.interceptors.response.use(
		(response) => response,
		(error) => {
			console.error(error.response?.data);
			return Promise.reject(error);
		},
	);

	axios.defaults.headers.common["User-Agent"] = new UserAgent().toString();
	axios.defaults.headers.common["Accept-Language"] = "en-US,en;q=0.9";
	axios.defaults.headers.common["Accept"] =
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";
	axios.defaults.headers.common["cache-control"] = "max-age=0";
	axios.defaults.headers.common["dnt"] = "1";
	axios.defaults.headers.common["sec-ch-prefers-color-scheme"] = "dark";
	axios.defaults.headers.common["sec-ch-ua"] =
		'"Not;A=Brand";v="24", "Chromium";v="128"';
	axios.defaults.headers.common["sec-ch-ua-mobile"] = "?0";
	axios.defaults.headers.common["sec-ch-ua-platform"] = '"Windows"';
	axios.defaults.headers.common["sec-fetch-dest"] = "document";
	axios.defaults.headers.common["sec-fetch-mode"] = "navigate";
	axios.defaults.headers.common["sec-fetch-site"] = "none";
	axios.defaults.headers.common["sec-fetch-user"] = "?1";
	axios.defaults.headers.common["upgrade-insecure-requests"] = "1";
	axios.defaults.headers.common["viewport-width"] = "1920";

	axios.defaults.validateStatus = () => true;

	app.listen(process.env.PORT ?? 8080, () => {
		if (commandHandler.verbose)
			commandHandler.logger.info(`API listening on port ${app.server?.port}`);
	});

	const { CHANGELOG_WEBHOOK: clwb, GITHUB_TOKEN: ghToken } = import.meta.env;
	if (clwb && ghToken && commandHandler.prodMode) {
		const webhook = new WebhookClient(
			{
				url: clwb,
			},
			{
				allowedMentions: {},
			},
		);
		const headers = {
			Authorization: `Bearer ${ghToken}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		};
		const { data } = await axios.get(
			"https://api.github.com/repos/vMohammad24/VOT/commits",
			{
				headers,
			},
		);
		const latestVOTCommit = data[0].commit;
		const VOTcommitMessage = (latestVOTCommit.message as string).includes("---")
			? latestVOTCommit.message.split("---")[1]
			: latestVOTCommit.message;
		const VOTcommitAuthor = latestVOTCommit.author.name;
		const embed = new EmbedBuilder()
			.setTitle(`Changelog - VOT`)
			.setDescription(VOTcommitMessage)
			.setFooter({ text: `Committed by ${VOTcommitAuthor}` })
			.setTimestamp();

		const { data: data2 } = await axios.get(
			"https://api.github.com/repos/vMohammad24/VOT-Frontend/commits",
			{
				headers,
			},
		);
		const latestVOTFrontendCommit = data2[0].commit;
		const VOTFrontendcommitMessage = latestVOTFrontendCommit.message;
		const VOTFrontendcommitAuthor = latestVOTFrontendCommit.author.name;
		const embed2 = new EmbedBuilder()
			.setTitle(`Changelog - VOT's frontend`)
			.setDescription(VOTFrontendcommitMessage)
			.setFooter({ text: `Committed by ${VOTFrontendcommitAuthor}` })
			.setTimestamp();
		const embeds = [embed, embed2];
		if (VOTcommitMessage.startsWith("[silent]")) {
			embeds.shift();
		}
		if (VOTFrontendcommitMessage.startsWith("[silent]")) {
			embeds.pop();
		}
		if (embeds.length === 0) return;
		webhook.send({ embeds, username: "VOT Changelog", content: "New Update!" });
	}
});

process.on("unhandledRejection", (reason, p) => {
	commandHandler.logger.error(
		`Unhandled Rejection at: Promise ${inspect(p)} reason: ${inspect(reason)}`,
	);
	const embed = new EmbedBuilder();
	embed
		.setTitle("Rejection Promise")
		.addFields(
			{
				name: "Reason",
				value: `\`\`\`${inspect(reason, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: "Promise",
				value: `\`\`\`${inspect(p, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on("uncaughtException", (err, origin) => {
	commandHandler.logger.error(
		"Uncaught Exception at: " + origin + " reason: " + err,
	);
	const embed = new EmbedBuilder();
	embed
		.setTitle("Uncaught Exception/Catch")
		.setURL("https://nodejs.org/api/process.html#event-uncaughtexception")
		.addFields(
			{
				name: "Error",
				value: `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: "Origin",
				value: `\`\`\`${inspect(origin, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
	commandHandler.logger.error(
		"Uncaught Exception at: " + origin,
		" reason: " + err,
	);
	const embed = new EmbedBuilder();
	embed
		.setTitle("Uncaught Exception Monitor")
		.setURL(
			"https://nodejs.org/api/process.html#event-uncaughtexceptionmonitor",
		)
		.addFields(
			{
				name: "Error",
				value: `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: "Origin",
				value: `\`\`\`${inspect(origin, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on("multipleResolves", (type, promise, reason) => {
	commandHandler.logger.error("Multiple Resolves: ", type, " reason: ", reason);
});

process.on("warning", (warn) => {
	commandHandler.logger.warn("Warning: ", warn);
	const embed = new EmbedBuilder();
	embed
		.setTitle("Uncaught Exception Monitor Warning")
		.setURL("https://nodejs.org/api/process.html#event-warning")
		.addFields({
			name: "Warning",
			value: `\`\`\`${inspect(warn, { depth: 0 }).slice(0, 1000)}\`\`\``,
		})
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

client.on(Events.Error, (err) => {
	commandHandler.logger.error("Discord Client Error: " + inspect(err));
	const embed = new EmbedBuilder();
	embed
		.setTitle("Discord API Error")
		.setDescription(
			`\`\`\`${inspect(err)
				.split("\n")
				.filter((c) => !c.includes("node_modules"))
				.join()
				.slice(0, 1000)}\`\`\``,
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

const shutdown = async () => {
	const start = Date.now();
	commandHandler.logger.info("Shutting down...");
	await Promise.all([
		client.destroy(),
		prisma.$disconnect(),
		redis.quit(),
		gracefulShutdown(),
		(await launchPuppeteer()).close(),
	]);
	commandHandler.logger.info(`Shut down in ${Date.now() - start}ms`);
	process.exit(0);
};
process.on("SIGINT", async () => {
	await shutdown();
});
process.on("SIGTERM", async () => {
	await shutdown();
});
process.on("exit", async () => {
	await shutdown();
});
process.on("beforeExit", async () => {
	await shutdown();
});

export default commandHandler;
client.login(process.env.TOKEN);
