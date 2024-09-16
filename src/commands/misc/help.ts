import { EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export default {
	description: 'Displays all commands',
	cooldown: 5000,
	execute: async ({ message, interaction, handler, channel, member }) => {
		const categories = handler
			.commands!.map((cmd) => cmd.category)
			.filter((value, index, self) => self.indexOf(value) === index)
			.filter((cat) => cat != 'Developer')
			.sort() as string[];
		const embeds = categories.map((category) => {
			const commands = handler.commands!.filter((cmd) => cmd.category === category).sort();
			return {
				name: category,
				embed: new EmbedBuilder()
					.setTitle(category)
					.setDescription(
						commands
							.filter((cmd) => cmd.category === category)
							.sort()
							.map((cmd) => `**${cmd.name}** - ${cmd.description}`)
							.join('\n'),
					)
					.setColor('Green')
					.setTimestamp()
			}
		});
		await pagination({
			interaction: interaction || undefined,
			message: message || undefined,
			type: 'select',
			embeds
		});
	},
} as ICommand;
