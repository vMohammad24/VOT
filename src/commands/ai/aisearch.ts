import axios from 'axios';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

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
	slashOnly: true,
	execute: async ({ args, interaction, message, handler: { logger }, user }) => {
		const question = args.get('question');
		console.log(question);
		if (!question) return { ephemeral: true, content: 'Please provide a question to ask' };
		const encoded = encodeURIComponent(question);
		const apiURL = `https://api.evade.rest/search/llm?query=${encoded}`;
		const enURL = `https://api.evade.rest/search/llm/enrichments?query=${question}`;
		const strings: string[] = [];
		await interaction?.deferReply();
		const res = await axios.get(apiURL, { responseType: 'stream' }).then((res) => {
			res.data.on('data', async (chunk: string) => {
				if (typeof chunk != 'string') chunk = Buffer.from(chunk).toString('utf-8');
				strings.push(
					chunk
						.split('\n')
						.join('')
						.replace(/"(.{1})"/g, '$1'),
				);
				const endRes = strings
					.join(' ')
					.replace(/\\n/g, '\n')
					.replace(/""/g, '\n')
					.replace(/\\t/g, '\t')
					.replace('" "', ' ');
				if (endRes !== '') {
					await pagination({
						interaction,
						message,
						pages: endRes.match(/[\s\S]{1,1999}/g)!.map((text, i) => ({
							page: {
								content: text,
							},
						})),
						type: 'buttons',
					});
				}
			});
			res.data.on('end', async () => {
				res = await axios.get(enURL, { responseType: 'json' });
				const id = Buffer.from(res.data.raw_response).toString('base64').slice(0, 22);
				const reply = await pagination({
					interaction,
					message,
					pages: (res.data.raw_response as string).match(/[\s\S]{1,1999}/g)!.map((text, i) => ({
						page: {
							content: text,
							components: [
								new ActionRowBuilder<ButtonBuilder>().setComponents(
									new ButtonBuilder()
										.setCustomId(`enrichment_${id}`)
										.setLabel('View sources')
										.setStyle(ButtonStyle.Primary),
								),
							],
						},
					})),
					type: 'buttons',
				});
				const collector = await reply.createMessageComponentCollector({
					filter: (i) => i.customId == `enrichment_${id}` && i.user.id == user.id,
					time: 60000,
				});
				collector.on('collect', async (i) => {
					i.reply({
						embeds: [
							{
								title: 'Sources',
								description: res.data.context_results
									.map((i: { url: string; title: string }) => `[${i.title}](${i.url})`)
									.join('\n'),
							},
						],
						ephemeral: true,
					});
				});
			});
		});
		console.log('done');
	},
} as ICommand;
