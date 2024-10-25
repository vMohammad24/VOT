import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	RepliableInteraction,
	StringSelectMenuBuilder,
} from 'discord.js';
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
	execute: async ({ args, interaction: inter, message, editReply }) => {
		const q = args.get('question') as string || 'test';
		const rMsg = message ? await message.reply('Thinking...') : await inter!.deferReply();
		const func = async (query: string, interaction: RepliableInteraction, params?: string) => {
			const queryResponse = (await searchBrave(query, params)).data.body.response;
			if (!queryResponse || !queryResponse.chatllm || !queryResponse.chatllm.results || queryResponse.chatllm.results.length === 0) {
				return editReply({ content: 'No results found.', components: [] });
			}
			const result = queryResponse.chatllm.results[0];
			const summary = queryResponse.chatllm.summary_og;
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
				.setDescription(llm.raw_response || 'No results found')
				.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
			await interaction.editReply({
				embeds: [embed],
				content: query,
				components: [
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
						.setCustomId('followup')
						.setPlaceholder('Select a follow up')
						.addOptions(llm.followups!.map((v, i) => ({ label: v.slice(0, 99), value: i.toString() })))
					),
					new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
						.setLabel('View sources').setStyle(ButtonStyle.Primary)
						.setCustomId('enrichments')
					)],
				files: llm.images.map(v => ({ attachment: v.src, name: 'image.png' })),
			})

			const collector2 = rMsg.createMessageComponentCollector({ filter: i => (i.customId == 'followup' && i.user.id == interaction!.user.id) })
			collector2.on('collect', async i => {
				if (!i.isStringSelectMenu()) return;
				const page = parseInt(i.values[0]);
				const followUp = llm.followups![page];
				if (!followUp) return;
				await i.deferReply();
				await func(followUp, i, `&summary=${result.key}&summary_og=${summary}&source=llmFollowup`);
				// await i.deferReply();
				// const followUpSearch = await searchBrave(followUp, `&summary=${result.key}&summary_og=${summary}&source=llmFollowup`);
				// const followUpResponse = followUpSearch.data.body.response;
				// const followUpLlm = await chatllm(followUpResponse.chatllm.results[0]);
				// const embed = new EmbedBuilder()
				// 	.setTitle('Search results (Follow Up)')
				// 	.setDescription(followUpLlm.raw_response || 'No results found')
				// await i.editReply({
				// 	embeds: [embed],
				// 	files: followUpLlm.images.map(v => ({ attachment: v.src, name: 'image.png' })),
				// })
			})
		}
		await func(q, inter!, `&source=llm`);
	},
} as ICommand;
