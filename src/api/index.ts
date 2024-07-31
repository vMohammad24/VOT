import { ApplicationCommandOptionType } from 'discord.js';
import Elysia from 'elysia';
import commandHandler from '..';
import discord from './discord';
import spotify from './spotify';

const upSince = Date.now();
const elysia = new Elysia();

elysia.get('/', function () {
    const ping = commandHandler.client.ws.ping;
    const totalMembers = commandHandler.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalGuilds = commandHandler.client.guilds.cache.size;
    const totalCommands = commandHandler.commands!.length;
    return { ping, upSince, totalMembers, totalGuilds, totalCommands }
})

elysia.get('/commands', () => {
    const commands: {
        name: string,
        description: string
    }[] = []
    const cmds = commandHandler.commands!;
    for (const command of cmds) {
        if (command.perms == "dev") continue;
        if (command.options) {
            for (const option of command.options!) {
                if (option.type == ApplicationCommandOptionType.Subcommand) {
                    commands.push({ name: `${command.name} ${option.name}`, description: option.description })
                }
            }
        }
        commands.push({ name: command.name!, description: command.description })
    }
    return commands;
})

elysia.get('/commands/:name', ({ params: { name }, set }) => {
    const command = commandHandler.commands!.find(cmd => cmd.name === name);
    if (!command) {
        set.status = 404;
        return {
            error: "Command not found"
        }
    }
    return command;
})


discord(elysia);
spotify(elysia);
export default elysia;