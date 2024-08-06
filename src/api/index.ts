import { ApplicationCommandOptionType } from 'discord.js';
import Elysia from 'elysia';
import commandHandler from '..';
import discord from './discord';
import spotify from './spotify';

const elysia = new Elysia();

let totalCommands = -1;
const upSince = Date.now();
let lastPing: number | 'N/A' = -1;
elysia.get('/', function () {
	if (totalCommands == -1) totalCommands = commandHandler.commands!.length;
	const actualPing = commandHandler.client.ws.ping;
	const ping = (actualPing == -1 ? lastPing : actualPing) == -1 ? 'N/A' : lastPing;
	lastPing = ping;
	return { ping, upSince, totalCommands };
});

elysia.get('/commands', () => {
	const commands: {
		name: string;
		description: string;
	}[] = [];
	const cmds = commandHandler.commands!;
	for (const command of cmds) {
		if (command.perms == 'dev') continue;
		if (command.options) {
			for (const option of command.options!) {
				if (option.type == ApplicationCommandOptionType.Subcommand) {
					commands.push({
						name: `${command.name} ${option.name}`,
						description: option.description,
					});
				}
			}
		}
		commands.push({ name: command.name!, description: command.description });
	}
	return commands;
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

discord(elysia);
spotify(elysia);
export default elysia;
