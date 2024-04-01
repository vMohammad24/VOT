
import { Prisma, PrismaClient } from "@prisma/client";
import { Client, IntentsBitField } from "discord.js";
import { Kazagumo, Plugins } from "kazagumo";
import { Connectors, type NodeOption } from "shoukaku";
import CommandHandler from "./handler/index";
import axios from "axios";
import Spotify from 'kazagumo-spotify'
import server from "./api";
import { scheduleJob, scheduledJobs } from "node-schedule";
import { endGiveaway } from "./util/giveaways";
import Redis from "ioredis";
import { createPrismaRedisCache } from "prisma-redis-middleware";
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
    storage: { type: "redis", options: { client: redis, invalidation: { referencesTTL: 300 } } },
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
            if (giveaway.end < new Date()) {
                endGiveaway(commandHandler, giveaway.id);
                continue;
            }
            if (scheduledJobs[giveaway.id]) return;
            scheduleJob(giveaway.id, giveaway.end, async () => {
                endGiveaway(commandHandler, giveaway.id);
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
    server.listen({ port: parseInt(process.env.SERVER_PORT || '8080') })
})


export default commandHandler;
client.login(process.env.TOKEN)