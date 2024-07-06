import express from 'express'
import commandHandler from '..';
import { getFrontEndURL, getRedirectURL } from '../util/urls';
import queryString from 'query-string';
import cors from 'cors'
import bodyParser from 'body-parser';
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    GuildMember,
    type GuildTextBasedChannel,
} from 'discord.js';
import axios from 'axios';
import discord from './discord';
import spotify from './spotify';

const app = express()
const upSince = Date.now();

app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({
    extended: true
}));
// Declare a route
app.get('/', function (req, res) {
    const ping = commandHandler.client.ws.ping;
    const totalMembers = commandHandler.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = commandHandler.client.guilds.cache.size;
    const totalCommands = commandHandler.commands!.length;
    res.send({ ping, upSince, totalMembers, totalGuilds, totalCommands })
})

app.get('/commands', (req, res) => {
    const commands: {
        name: string,
        description: string
    }[] = []
    const cmds = commandHandler.commands!;
    for (const command of cmds) {
        if (command.options) {
            for (const option of command.options!) {
                if (option.type == ApplicationCommandOptionType.Subcommand) {
                    commands.push({ name: `${command.name} ${option.name}`, description: option.description })
                }
            }
        }
        commands.push({ name: command.name!, description: command.description })
    }
    res.send(commands);
})

app.get('/commands/:command', (req, res) => {
    const name = (req.params as any).command;
    const command = commandHandler.commands!.find(cmd => cmd.name === name);
    if (!command) return res.send({ error: 'Command not found' });
    res.send(command);
})


discord(app);
spotify(app);
export default app;