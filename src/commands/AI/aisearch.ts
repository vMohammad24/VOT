import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { chatllm, searchBrave } from '../../util/brave';

export default {
	description: 'Ask brave a question',
	category: 'ai',
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: 'question',
			description: 'The question you want to ask brave',
			required: true,
		},
	],
	type: 'all',
	execute: async ({ args, interaction, message, editReply }) => {
		const query = args.get('question') as string || 'test';
		const rMsg = message ? await message.reply('Thinking...') : await interaction!.deferReply();
		const queryResponse = (await searchBrave(query)).data.body.response;
		if (!queryResponse || !queryResponse.chatllm || !queryResponse.chatllm.results || queryResponse.chatllm.results.length === 0) {
			return editReply({ content: 'No results found.', components: [] });
		}
		const result = queryResponse.chatllm.results[0];
		const llm = await chatllm(result);
		const collector = rMsg.createMessageComponentCollector({ filter: i => i.customId == 'enrichments' })
		collector.on('collect', async i => {
			const embed = new EmbedBuilder()
				.setTitle('Sources')
				.setDescription(llm.context_results.map(v => `- [${v.title}](${v.url})`).join('\n'))
			await i.reply({
				embeds: [embed],
				ephemeral: true
			})
		})
		const embed = new EmbedBuilder()
			.setTitle('Search results')
			.setDescription(llm.raw_response)
		await editReply({
			embeds: [embed],
			content: '',
			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
				.setLabel('View sources').setStyle(ButtonStyle.Primary)
				.setCustomId('enrichments')
			)],
			files: llm.images.map(v => ({ attachment: v.src, name: 'image.png' })),
		}, rMsg)
	},
} as ICommand;
