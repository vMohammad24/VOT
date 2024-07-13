
import { Prisma, PrismaClient } from "@prisma/client";
import { Client, EmbedBuilder, IntentsBitField, Webhook, WebhookClient } from "discord.js";
import { Kazagumo, Plugins } from "kazagumo";
import { Connectors, type NodeOption } from "shoukaku";
import CommandHandler from "./handler/index";
import axios from "axios";
import Spotify from 'kazagumo-spotify'
import { scheduleJob, scheduledJobs } from "node-schedule";
import { endGiveaway } from "./util/giveaways";
import Redis from "ioredis";
import { createPrismaRedisCache } from "prisma-redis-middleware";
import app from "./api";
import { inspect } from "bun";
const isProduction = process.env.NODE_ENV === "production";
const nodes: NodeOption[] = [
    {
        url: `${process.env.LAVALINK_URL}:2333`,
        name: 'local',
        auth: process.env.LAVALINK_PASSWORD!,
        secure: false,
    }
]
const client = new Client({
    intents: [IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildModeration]
})

const errorsWebhook = new WebhookClient({
    url: process.env.WEBHOOK_URL!
})


const kazagumo = new Kazagumo({
    defaultSearchEngine: "youtube",
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    },
    plugins: [new Plugins.PlayerMoved(client),
    new Spotify({
        clientId: process.env.SPOTIFY_CLIENT_ID!,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    })
    ]
}, new Connectors.DiscordJS(client), nodes);


const prisma = new PrismaClient();
const redis = new Redis({
    host: process.env.NODE_ENV === 'production' ? 'redis' : 'localhost',
})
const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
    models: [
        { model: "User", excludeMethods: ["findMany"] },
    ],
    storage: { type: "redis", options: { client: redis as any, invalidation: { referencesTTL: 300 } } },
    cacheTime: 300,
    excludeModels: ["TicketSettings", "Ticket", "Discord", "Spotify", "WelcomeSettings"],
});

prisma.$use(cacheMiddleware);
const commandHandler = new CommandHandler({
    client,
    prisma,
    kazagumo,
    prodMode: isProduction,
    testServers: ["925779955500060762"],
    developers: ['921098159348924457', '981269274616295564'],
    commandsDir: `${import.meta.dir}/commands`,
    globalPrefix: ";",
    listenersDir: `${import.meta.dir}/listeners`,
})
commandHandler.logger.info(`Starting in ${isProduction ? "production" : "development"} mode`)
client.on("ready", async (c) => {
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
    commandHandler.logger.info(`Logged in as ${c.user.displayName}`)
    axios.defaults.headers.common["Accept-Encoding"] = "gzip";
    axios.interceptors.response.use(function (response) {
        return response;
    }, function (error) {
        console.error(error.response?.data);
        return Promise.reject(error);
    });
    app.listen(process.env.PORT || 8080, () => {
        commandHandler.logger.info(`API listening on port ${process.env.PORT || 8080}`)
    })
})

process.on("unhandledRejection", (reason, p) => {
    commandHandler.logger.error("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    const embed = new EmbedBuilder();
    embed
        .setTitle("Unhandled Rejection/Catch")
        .setURL("https://nodejs.org/api/process.html#event-unhandledrejection")
        .addFields(
            {
                name: "Reason",
                value: `\`\`\`${inspect(reason, { depth: 0 }).slice(0, 1000)}\`\`\``,
            },
            {
                name: "Promise",
                value: `\`\`\`${inspect(p, { depth: 0 }).slice(0, 1000)}\`\`\``,
            }
        )
        .setTimestamp();

    return errorsWebhook.send({ embeds: [embed] });
});

process.on("uncaughtException", (err, origin) => {
    commandHandler.logger.error("Uncaught Exception at: ", origin, " reason: ", err);
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
            }
        )
        .setTimestamp();

    return errorsWebhook.send({ embeds: [embed] });
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
    commandHandler.logger.error("Uncaught Exception at: ", origin, " reason: ", err);
    const embed = new EmbedBuilder();
    embed
        .setTitle("Uncaught Exception Monitor")
        .setURL(
            "https://nodejs.org/api/process.html#event-uncaughtexceptionmonitor"
        )
        .addFields(
            {
                name: "Error",
                value: `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``,
            },
            {
                name: "Origin",
                value: `\`\`\`${inspect(origin, { depth: 0 }).slice(0, 1000)}\`\`\``,
            }
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



client.on("error", (err) => {
    console.log(err);

    const embed = new EmbedBuilder();
    embed
        .setTitle("Discord API Error")
        .setURL("https://discordjs.guide/popular-topics/errors.html#api-errors")
        .setDescription(
            `\`\`\`${inspect(err, { depth: 0 }).slice(0, 1000)}\`\`\``
        )
        .setTimestamp();

    return errorsWebhook.send({ embeds: [embed] });
});


export default commandHandler;
client.login(process.env.TOKEN)