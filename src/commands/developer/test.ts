import axios from 'axios';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { chatllm, searchBrave } from '../../util/brave';


import TurnDownService from 'turndown';
const turndownService = new TurnDownService();
const parseDDG = async (query: string) => {
	const res1 = (await axios.get(`https://duckduckgo.com/?t=ffab&q=${encodeURIComponent(query)}&ia=web`)).data;
	const lookFor = '<link id="deep_preload_link" rel="preload" as="script" href=';
	const index = res1.indexOf(lookFor);
	const index2 = res1.indexOf('>', index);
	const url = res1.substring(index + lookFor.length + 1, index2 - 2);
	const res2 = (await axios.get(url)).data;
	const urlRegex = /(?:http[s]?:\/\/.)(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gm;
	const urls = res2.match(urlRegex);
	console.log(urls)
}





export default {
	description: 'test command for devs',
	// perms: 'dev',
	type: 'all',
	// cooldown: 60000,
	disabled: commandHandler.prodMode,
	options: [{
		name: 'query',
		description: 'The search query',
		type: ApplicationCommandOptionType.String,
		required: false
	}],
	execute: async ({ user, interaction, handler, args, guild, channel, message, editReply }) => {
		return nigger;
		const query = args.get('query') as string || 'test';
		const { key } = (await searchBrave(query)).data.body.response.chatllm.results[0];
		const llm = await chatllm(key);
		const rMsg = message ? await message.reply('Loading...') : await interaction!.deferReply();
		console.log(llm)
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
			.setTitle('AI Search')
			.setDescription(llm.raw_response)
		await editReply({
			embeds: [embed],
			content: '',
			components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
				// .setCustomId(`enrichments_${id}`)
				.setLabel('View sources').setStyle(ButtonStyle.Primary)
				.setCustomId('enrichments')
			)],
			files: llm.images.map(v => ({ attachment: v.src, name: 'image.png' })),
		}, rMsg)
	},
} as ICommand;
