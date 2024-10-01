import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export default {
	description: 'Displays all commands',
	cooldown: 5000,
	options: [
		{
			name: 'command',
			description: 'the name of the command to search for',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	execute: async ({ message, interaction, handler, args, member }) => {
		const categories = handler
			.commands!.map((cmd) => cmd.category)
			.filter((value, index, self) => self.indexOf(value) === index)
			.filter((cat) => cat != 'Developer')
			.sort() as string[];
		const command = args.get('command') as string | undefined;
		if (!command) {
			const embeds = categories.map((category) => {
				const commands = handler.commands!.filter((cmd) => cmd.category === category).sort();
				return {
					name: category,
					page: new EmbedBuilder()
						.setTitle(category)
						.setDescription(
							commands
								.filter((cmd) => cmd.category === category)
								.sort()
								.map((cmd) => `**${cmd.name}** - ${cmd.description}`)
								.join('\n'),
						)
						.setColor('Green')
						.setTimestamp(),
				};
			});
			const msg = await pagination({
				interaction: interaction || undefined,
				message: message || undefined,
				type: 'select',
				pages: embeds,
			});
		} else {
			const cmd = handler.commands!.find((cmd) => cmd.name === command);
			if (!cmd) return { content: `Command \`${command}\` not found`, ephemeral: true };
			return {
				embeds: [
					new EmbedBuilder().setTitle(cmd.name!).setDescription(cmd.description).setColor('Random').setTimestamp(),
				],
				ephemeral: true,
			};
		}
	},
} as ICommand;
