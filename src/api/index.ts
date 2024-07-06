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

const server = express()
const upSince = Date.now();

server.use(express.json())
server.use(cors())
server.use(bodyParser.urlencoded({
    extended: true
}));
// Declare a route
server.get('/', function (req, res) {
    const ping = commandHandler.client.ws.ping;
    const totalMembers = commandHandler.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = commandHandler.client.guilds.cache.size;
    const totalCommands = commandHandler.commands!.length;
    res.send({ ping, upSince, totalMembers, totalGuilds, totalCommands })
})

server.get('/commands', (req, res) => {
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

server.get('/commands/:command', (req, res) => {
    const name = (req.params as any).command;
    const command = commandHandler.commands!.find(cmd => cmd.name === name);
    if (!command) return res.send({ error: 'Command not found' });
    res.send(command);
})


export default server;
