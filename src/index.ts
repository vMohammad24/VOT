import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { inspect } from 'bun';
import { Client, EmbedBuilder, Events, IntentsBitField, WebhookClient } from 'discord.js';
import Redis from 'ioredis';
import { Kazagumo, Plugins } from 'kazagumo';
import Apple from 'kazagumo-apple';
import Spotify from 'kazagumo-spotify';
import { gracefulShutdown, scheduleJob, scheduledJobs } from 'node-schedule';
import { Connectors, type NodeOption } from 'shoukaku';
import app from './api';
import CommandHandler from './handler/index';
import { initEmojis } from './util/emojis';
import { endGiveaway } from './util/giveaways';
import { launchPuppeteer } from './util/puppeteer';
const isProduction = process.env.NODE_ENV === 'production';
export const upSince = Date.now();

const nodes: NodeOption[] = [
	{
		url: `${process.env.LAVALINK_URL}:2333`,
		name: 'local',
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
		defaultSearchEngine: 'youtube',
		send: (guildId, payload) => {
			const guild = client.guilds.cache.get(guildId);
			if (guild) guild.shard.send(payload);
		},
		plugins: [
			new Apple({
				countryCode: 'us',
				imageWidth: 640,
				imageHeight: 640,
			}),
			new Plugins.PlayerMoved(client),
			new Spotify({
				clientId: process.env.SPOTIFY_CLIENT_ID!,
				clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
			}),
		],
	},
	new Connectors.DiscordJS(client),
	nodes,
);

const prisma = new PrismaClient();
export const redis = new Redis({
	host: process.env.NODE_ENV === 'production' ? 'redis' : 'localhost',
});


const commandHandler = new CommandHandler({
	client,
	prisma,
	kazagumo,
	prodMode: isProduction,
	testServers: ['925779955500060762'],
	developers: import.meta.env.DEVELOPERS?.split(',') || ['921098159348924457', '981269274616295564'],
	commandsDir: `${import.meta.dir}/commands`,
	globalPrefix: ';',
	listenersDir: `${import.meta.dir}/listeners`,
	verbose: !isProduction,
});

commandHandler.logger.info(`Starting in ${isProduction ? 'production' : 'development'} mode`);

client.on(Events.ClientReady, async (c) => {
	initEmojis();
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
	axios.defaults.headers.common['Accept-Encoding'] = 'gzip';

	axios.interceptors.response.use(
		function (response) {
			return response;
		},
		function (error) {
			console.error(error.response?.data);
			return Promise.reject(error);
		},
	);

	axios.defaults.validateStatus = () => true;

	app.listen(process.env.PORT || 8080, () => {
		if (commandHandler.verbose)
			commandHandler.logger.info(`API listening on port ${app.server?.port}`);
	});

	const { CHANGELOG_WEBHOOK: clwb, GITHUB_TOKEN: ghToken } = import.meta.env;
	if (clwb && ghToken) {
		const webhook = new WebhookClient({
			url: clwb,
		}, {
			allowedMentions: {},
		});
		const headers = {
			Authorization: `Bearer ${ghToken}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
		};
		const { data } = await axios.get('https://api.github.com/repos/vMohammad24/VOT/commits', {
			headers,
		});
		const latestVOTCommit = data[0].commit;
		const VOTcommitMessage = latestVOTCommit.message;
		const VOTcommitAuthor = latestVOTCommit.author.name;
		const embed = new EmbedBuilder()
			.setTitle(`Changelog - VOT`)
			.setDescription(VOTcommitMessage)
			.setFooter({ text: `Committed by ${VOTcommitAuthor}` })
			.setTimestamp();

		const { data: data2 } = await axios.get('https://api.github.com/repos/vMohammad24/VOT-Frontend/commits', {
			headers,
		});
		const latestVOTFrontendCommit = data2[0].commit;
		const VOTFrontendcommitMessage = latestVOTFrontendCommit.message;
		const VOTFrontendcommitAuthor = latestVOTFrontendCommit.author.name;
		const embed2 = new EmbedBuilder()
			.setTitle(`Changelog - VOT's frontend`)
			.setDescription(VOTFrontendcommitMessage)
			.setFooter({ text: `Committed by ${VOTFrontendcommitAuthor}` })
			.setTimestamp();
		const embeds = [embed, embed2];
		if (VOTcommitMessage.startsWith('[silent]')) {
			embeds.shift();
		}
		if (VOTFrontendcommitMessage.startsWith('[silent]')) {
			embeds.pop();
		}
		if (embeds.length === 0) return;
		webhook.send({ embeds, username: 'VOT Changelog', content: 'New Update!' });
	}
});

process.on('unhandledRejection', (reason, p) => {
	commandHandler.logger.error(`Unhandled Rejection at: Promise ${inspect(p)} reason: ${inspect(reason)}`);
	const embed = new EmbedBuilder();
	embed
		.setTitle('Rejection Promise')
		.addFields(
			{
				name: 'Reason',
				value: `\`\`\`${inspect(reason, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: 'Promise',
				value: `\`\`\`${inspect(p, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on('uncaughtException', (err, origin) => {
	commandHandler.logger.error('Uncaught Exception at: ', origin, ' reason: ', err);
	const embed = new EmbedBuilder();
	embed
		.setTitle('Uncaught Exception/Catch')
		.setURL('https://nodejs.org/api/process.html#event-uncaughtexception')
		.addFields(
			{
				name: 'Error',
				value: `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: 'Origin',
				value: `\`\`\`${inspect(origin, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
	commandHandler.logger.error('Uncaught Exception at: ', origin, ' reason: ', err);
	const embed = new EmbedBuilder();
	embed
		.setTitle('Uncaught Exception Monitor')
		.setURL('https://nodejs.org/api/process.html#event-uncaughtexceptionmonitor')
		.addFields(
			{
				name: 'Error',
				value: `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
			{
				name: 'Origin',
				value: `\`\`\`${inspect(origin, { depth: 0 }).slice(0, 1000)}\`\`\``,
			},
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

process.on('multipleResolves', (type, promise, reason) => {
	commandHandler.logger.error('Multiple Resolves: ', type, ' reason: ', reason);
});

process.on('warning', (warn) => {
	commandHandler.logger.warn('Warning: ', warn);
	const embed = new EmbedBuilder();
	embed
		.setTitle('Uncaught Exception Monitor Warning')
		.setURL('https://nodejs.org/api/process.html#event-warning')
		.addFields({
			name: 'Warning',
			value: `\`\`\`${inspect(warn, { depth: 0 }).slice(0, 1000)}\`\`\``,
		})
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

client.on(Events.Error, (err) => {
	commandHandler.logger.error('Discord Client Error: ' + inspect(err));
	const embed = new EmbedBuilder();
	embed
		.setTitle('Discord API Error')
		.setURL('https://discordjs.guide/popular-topics/errors.html#api-errors')
		.setDescription(
			`\`\`\`${inspect(err)
				.split('\n')
				.filter((c) => !c.includes('node_modules'))
				.join()
				.slice(0, 1000)}\`\`\``,
		)
		.setTimestamp();

	return errorsWebhook.send({ embeds: [embed] });
});

const shutdown = async () => {
	const start = Date.now();
	commandHandler.logger.info('Shutting down...');
	await Promise.all([
		client.destroy(),
		prisma.$disconnect(),
		redis.quit(),
		gracefulShutdown(),
		(await launchPuppeteer()).close(),
	])
	commandHandler.logger.info(`Shut down in ${Date.now() - start}ms`);
	process.exit(0);
}
process.on('SIGINT', async () => {
	await shutdown();
});
process.on('SIGTERM', async () => {
	await shutdown();
});
process.on('exit', async () => {
	await shutdown();
});
process.on('beforeExit', async () => {
	await shutdown();
});

export default commandHandler;
client.login(process.env.TOKEN);
