import { EmbedBuilder, Events, Message, type Client } from 'discord.js';
import type { Kazagumo } from 'kazagumo';
import CommandHandler from '.';
import { getGuild, getUserByID } from '../util/database';
import type ICommand from './interfaces/ICommand';
import type LegacyHandler from './interfaces/ILegacyHandler';


const getPrefix = async (message: Message<boolean>) => {
	let prefix = null;
	const pUser = await getUserByID(message.author.id, { prefix: true });
	if (pUser && pUser.prefix) {
		prefix = pUser.prefix;
	} else {
		if (message.guild) {
			const guild = await getGuild(message.guild, { prefix: true });
			if (guild) {
				prefix = guild.prefix;
			}
		}
	}
	return prefix;
}
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
			const prefix = (await getPrefix(message)) ?? gPrefix;
			let commandName = message.content.startsWith(prefix) ? message.content.slice(prefix.length).split(' ')[0] : null;
			console.log(prefix);
			if (!message.content.startsWith(prefix)) {
				if (message.mentions.users.has(client.user!.id)) {
					if (!message.content.includes(' ')) {
						message.reply({
							embeds: [
								new EmbedBuilder()
									.setDescription(`Your prefix is \`${prefix}\``)
							]
						})
						return;
					}
					commandName = 'ask';
				}
			}
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
					const msg = await message.reply({
						allowedMentions: {},
						...execution,
					});
					if (msg.embeds.length > 0 && (msg.embeds[0].title === 'Error' || msg.embeds[0].color == 10038562)) {
						setTimeout(async () => {
							await Promise.all([
								msg.delete(),
								message.delete()
							]);
						}, 3000)
					}
				} catch (e) {
					try {
						const msg = await message.reply({
							allowedMentions: {},
							...execution,
						});
						if (msg.embeds.length > 0 && (msg.embeds[0].title === 'Error' || msg.embeds[0].color == 10038562)) {
							setTimeout(async () => {
								await Promise.all([
									await msg.delete(),
									await message.delete()
								]);
							}, 3000)
						}
					} catch (error) {

					}
				}
			}
		});
	}
}
