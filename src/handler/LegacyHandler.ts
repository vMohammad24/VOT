import { Events, type Client } from 'discord.js';
import type { Kazagumo } from 'kazagumo';
import CommandHandler from '.';
import type ICommand from './interfaces/ICommand';
import type LegacyHandler from './interfaces/ILegacyHandler';

export default class LegacyCommandHandler {
	public commands: ICommand[] = [];
	private handler: CommandHandler;
	constructor({ client, commands, kazagumo, globalPrefix }: LegacyHandler, handler: CommandHandler) {
		this.commands = commands;
		this.handler = handler;
		this.initListener(client, kazagumo, globalPrefix);
	}

	public initListener(client: Client, kazagumo: Kazagumo, gPrefix: string) {
		client.on(Events.MessageCreate, async (message) => {
			if (message.author.bot) return;
			let prefix = gPrefix;
			if (message.guild) {
				const guild = await this.handler.prisma.guild.findFirst({
					where: { id: message.guild.id },
				});
				if (guild) {
					prefix = guild.prefix;
				} else {
					await this.handler.prisma.guild.create({
						data: {
							id: message.guild.id,
							prefix: gPrefix,
							name: message.guild.name,
						},
					});
				}
			}
			if (!message.content.startsWith(prefix)) return;
			const commandName = message.content.slice(prefix.length).split(' ')[0];
			if (!commandName) return;
			const command = this.commands.find(
				(cmd) =>
					cmd.name?.toLowerCase() == commandName.toLowerCase() ||
					cmd.aliases?.map((a) => a.toLowerCase()).includes(commandName.toLowerCase()),
			);
			if (!command) return;
			if (command.slashOnly) {
				const msg = await message.reply({
					content: 'This command is only available as a slash command',
					allowedMentions: {},
				});
				return;
			}
			const execution = await this.handler.executeCommand(command, message);
			if (execution) {
				try {
					await message.reply({
						allowedMentions: {},
						...execution,
					});
				} catch (e) {
					await message.channel.send(execution);
				}
			}
		});
	}
}
