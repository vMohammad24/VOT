import { PrismaClient } from "@prisma/client";
import { Client, IntentsBitField } from "discord.js";
import { Kazagumo, Plugins } from "kazagumo";
import { Connectors, type NodeOption } from "shoukaku";
import CommandHandler from "./handler/index";
import axios from "axios";
import Spotify from 'kazagumo-spotify'
import fastify from "./api";
const nodes: NodeOption[] = [
    {
        url: '127.0.0.1:2333',
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
const commandHandler = new CommandHandler({
    client,
    prisma,
    kazagumo,
    prodMode: process.env.NODE_ENV === "production",
    testServers: ["925779955500060762"],
    developers: ['921098159348924457', '981269274616295564'],
    commandsDir: `${import.meta.dir}/commands`,
    globalPrefix: ";",
    listenersDir: `${import.meta.dir}/listeners`,
})
client.on("ready", async (c) => {
    commandHandler.logger.info(`Logged in as ${c.user.displayName}`)
    axios.defaults.headers.common["Accept-Encoding"] = "gzip";
    axios.interceptors.response.use(function (response) {
        return response;
    }, function (error) {
        console.error(error.response?.data);
        return Promise.reject(error);
    });
    fastify.listen({ port: parseInt(process.env.SERVER_PORT || '8080') }, function (err, address) {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }
    })
})


export default commandHandler;
client.login(process.env.TOKEN)