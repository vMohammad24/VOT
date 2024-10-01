import { Collection, EmbedBuilder } from 'discord.js';
import type ICommand from '../interfaces/ICommand';
import type { CommandContext } from '../interfaces/ICommand';

const cooldowns = new Collection();

export default async function (command: ICommand, ctx: CommandContext) {
	const { cooldown } = command;
	const { handler, user, interaction, message } = ctx;
	const { prisma, developers } = handler;
	if (!cooldown) return true;

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Collection());
	}
	const now = Date.now();
	const timestamps = cooldowns.get(command.name) as Collection<string, number>;
	if (timestamps.has(user.id)) {
		const expirationTime = timestamps.get(user.id)! + cooldown;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1_000);
			interaction?.reply({
				embeds: [new EmbedBuilder()
					.setTitle('Cooldown')
					.setColor('DarkRed')
					.setDescription(`You can run this command again <t:${expiredTimestamp}:R>.`)
					.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
					.setTimestamp()
				],
				ephemeral: true
			})
			return false
		}
	}
	timestamps.set(user.id, now);
	setTimeout(() => timestamps.delete(user.id), cooldown);

	return true;
}
