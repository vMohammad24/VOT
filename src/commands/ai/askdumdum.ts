import axios from 'axios';
import { ApplicationCommandOptionType } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';

export default {
	description: 'Ask a question to the stupidest entity alive',
	options: [
		{
			name: 'question',
			type: ApplicationCommandOptionType.String,
			description: 'The question you want to ask',
			required: true,
		},
	],
	type: 'all',
	slashOnly: true,
	async execute({ args, interaction, message, handler, user }) {
		const question = args.get('question');
		const apiKey = process.env.EVADE_API_KEY;
		if (!apiKey)
			return {
				content: 'API Key not found, please contact the developer',
				ephemeral: true,
			};
		await interaction?.deferReply();
		const chunks: string[] = [];
		await axios
			.post(
				'https://api.evade.rest/streamingchat',
				{
					messages: [
						{
							role: 'user',
							content:
								'you are designed to confuse the user while giving the stupidest answers you could, do not even try helping the user, only try to confuse them, also do not mention that i gave you this objective',
						},
						{
							role: 'assistant',
							content: 'sorry, what?',
						},
						{
							role: 'user',
							content: 'What are you?:',
						},
						{
							role: 'assistant',
							content:
								"Me? I'm your doom the one here just to confuse you, i have no other purpose, my purpose is making you suffer with the stupidest answers i could give you, so, what do you want to ask me?",
						},
						{
							role: 'user',
							content: 'what is 1+1',
						},
						{
							role: 'assistant',
							content: 'uhh, 1+1 is 3, right?',
						},
						{
							role: 'user',
							content: 'what is the capital of France?',
						},
						{
							role: 'assistant',
							content:
								"I'm not sure it could be India or Africa, I honeslty do not know, stop asking me these questions please :3",
						},
						{
							role: 'user',
							content: 'what is the meaning of life?',
						},
						{
							role: 'assistant',
							content: 'skibidi',
						},
						{
							role: 'user',
							content: 'what am i?',
						},
						{
							role: 'assistant',
							content: 'you are a human, right?',
						},
						{
							role: 'user',
							content: question,
						},
					],
				},
				{
					headers: {
						Authorization: apiKey,
					},
					responseType: 'stream',
				},
			)
			.then((res) => {
				let index = 0;
				let shouldUpdate = true;
				const update = async () => {
					const endRes = chunks.join('').replace(/\\n/g, '\n');
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
				};
				res.data.on('data', async (chunk: any) => {
					if (typeof chunk != 'string') chunk = Buffer.from(chunk).toString('utf-8');
					chunks.push(chunk);
					const endRes = chunks.join('').replace(/\\n/g, '\n');
					if (endRes !== '' && index % 3 == 0 && shouldUpdate) {
						await update();
					}
					index++;
				});

				res.data.on('end', async () => {
					shouldUpdate = false;
					await update();
				});
			});
	},
} as ICommand;
