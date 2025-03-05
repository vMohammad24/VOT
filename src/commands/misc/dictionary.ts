import axios from 'axios';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { pagination, PaginationOptions } from '../../util/pagination';

export default {
	description: 'Get a defention of a word',
	options: [
		{
			name: 'word',
			description: 'The word to define/get info on',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	type: 'all',
	aliases: ['define', 'def', 'definition', 'urban'],
	execute: async ({ args, interaction, message }) => {
		const word = (args.get('word') as string) || undefined;
		if (!word)
			return {
				content: 'Please provide a word',
				ephemeral: true,
			};
		const reqUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
		const res = await axios.get(reqUrl);
		if (res.status == 404) {
			;
			const urbanRes = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
			const { data: urbanData, status } = urbanRes;
			if (status == 404) {
				return {
					content: 'No results found',
					ephemeral: true,
				};
			} else if (status != 200) {
				return {
					content: 'An error occured while fetching data from UrbanDictionary',
					ephemeral: true,
				};
			}
			if (urbanData.list.length == 0)
				return {
					content: 'No results found',
					ephemeral: true,
				};
			const urbanEmbeds: PaginationOptions['pages'] = (
				urbanData.list as {
					definition: string;
					example: string;
					thumbs_up: number;
				}[]
			)
				.sort((a, b) => b.thumbs_up - a.thumbs_up)
				.map((urban) => ({
					page: {
						embeds: [
							new EmbedBuilder()
								.setTitle(word)
								.setDescription(
									`
									**Definition:** ${urban.definition}\n\n
									${urban.example ? `**Example:** ${urban.example}` : ''}
									`,
								)
								.setColor('Random')
								.setTimestamp()
								.setFooter({ text: 'Powered by UrbanDictionary' }),
						],
					},
				}));
			await pagination({
				pages: urbanEmbeds,
				type: 'select',
				message,
				interaction,
				name: 'Select a definition',
			});
			return;
		}
		const { data } = res;
		// const embed = new EmbedBuilder()
		// 	.setTitle(data[0].word)
		// 	.setDescription(data[0].meanings[0].definitions[0].definition)
		// 	.setColor('Random')
		// 	.setTimestamp()
		// 	.setFooter({ text: 'Powered by dictionaryapi' });
		const embeds: PaginationOptions['pages'] = data[0].meanings.map(
			(meaning: {
				partOfSpeech: string;
				definitions: {
					definition: string;
					example: string;
				}[];
			}) => {
				return {
					page: {
						embeds: [
							new EmbedBuilder()
								.setTitle(data[0].word + ' - ' + meaning.partOfSpeech)
								.setDescription(
									meaning.definitions
										.map((def: { definition: string; example: string }) => {
											return `**Definition:** ${def.definition}\n${def.example ? `**Example:** ${def.example}` : ''}`;
										})
										.join('\n\n'),
								)
								.setColor('Random')
								.setTimestamp()
								.setFooter({ text: 'Powered by dictionaryapi' }),
						],
					},
					name: meaning.partOfSpeech,
				};
			},
		);
		await pagination({
			pages: embeds,
			type: 'select',
			message,
			interaction,
			name: 'Select an interjection',
		});
	},
} as ICommand;
