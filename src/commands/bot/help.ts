import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';
import VOTEmbed from '../../util/VOTEmbed';

function getOptionName(value: number): string | undefined {
	return Object.keys(ApplicationCommandOptionType).find((key) => (ApplicationCommandOptionType as any)[key] === value);
}

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
	type: 'all',
	execute: async ({ message, interaction, handler, args, member }) => {
		const categories = handler
			.commands!.filter((a) => a.category)
			.map((cmd) => cmd.category)
			.filter((value, index, self) => self.indexOf(value) === index)
			.filter((cat) => cat != 'Developer')
			.sort() as string[];
		const command = args.get('command') as string | undefined;
		if (!command) {
			const embeds = categories.map((category) => {
				const commands = handler.commands!.filter((cmd) => cmd.category === category).sort();
				return {
					name: category,
					emoji: (getEmoji(`c_${category.toLowerCase()}`) || '❔').toString(),
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
				name: 'Select a category',
			});
		} else {
			const cmd = handler.commands!.find((cmd) => cmd.name === command);
			if (!cmd) return { content: `Command \`${command}\` not found`, ephemeral: true };
			const embed = new VOTEmbed();
			embed.setTitle(cmd.name!).setDescription(cmd.description).setColor('Random').setTimestamp();
			for (const option of cmd.options || []) {
				embed.addFields({
					name: option.name,
					value: `**Type**: ${getOptionName(option.type)}\n**Required**: ${'required' in option ? (option.required ? 'Yes' : 'No') : 'Yes'}`,
				});
			}

			cmd.aliases &&
				cmd.aliases.length > 0 &&
				embed.addFields({
					name: 'Aliases',
					value: cmd.aliases.join(', '),
				});
			return {
				embeds: [embed],
				ephemeral: true,
			};
		}
	},
} as ICommand;
