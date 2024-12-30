import axios from 'axios';
import { ApplicationCommandOptionType, Collection, GuildTextBasedChannel } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { ddgModels, DuckDuckGoChat } from '../../util/ddg';
import { pagination } from '../../util/pagination';
import { isNullish } from '../../util/util';
const collection = new Collection<string, DuckDuckGoChat>();



function getURLSFromString(text: string): string[] {
	return text.match(/(https?:\/\/[^\s]+)/g) || [];
}
export default {
	name: 'ask',
	description: 'Ask a question to the AI',
	// disabled: true,
	options: [
		{
			name: 'question',
			type: ApplicationCommandOptionType.String,
			description: 'The question you want to ask',
			required: true,
		},
		{
			name: 'model',
			type: ApplicationCommandOptionType.String,
			description: 'The model you want to use',
			required: false,
			choices: Object.entries(ddgModels).map(([key, value]) => ({
				name: value,
				value: key,
			})),
		},
		{
			name: 'web',
			type: ApplicationCommandOptionType.Boolean,
			description: 'Whether to search the web for the question',
			required: false,
		},
	],
	type: 'all',
	cooldown: 30000,
	async execute({ args, interaction, message, user, editReply, channel }) {
		const question = args.get('question') as string | undefined;
		if (!question)
			return {
				content: 'Please provide a question',
				ephemeral: true,
			};

		let context = '';
		const web = args.get('web') ?? false;
		if (web) {
			const urls = getURLSFromString(question);
			const brave = (await searchBrave(question).then(a => a.data.body.response.web.results)).map(page => {
				urls.push(page.url);
				context += `**${page.title}**\n${page.description}\n${page.url}\n\n`;
			})
			const res = await Promise.all(urls.map(url => axios.get(url).then(a => (a.data as string))));
			context += res.map((text, i) => `**${urls[i]}**\n${text}`).join('\n\n');
		}
		const model = (args.get('model') as string) ?? 'gpt-4o-mini';
		let ddg = collection.get(user.id);

		if (!ddg) {
			ddg = new DuckDuckGoChat('gpt-4o-mini');
			collection.set(user.id, ddg);
		}
		if (ddg.getModel() != model) {
			try {
				ddg.setModel(model);
			} catch (e) {
				return {
					content: (e as any).message,
					ephemeral: true,
				};
			}
		}
		if (message) (channel as GuildTextBasedChannel).sendTyping();
		const time = Date.now();
		await ddg.chat('Only respond with "OK" until i say "**CONTEXT END** so i can give you context at any time.');
		if (!isNullish(context)) for (const text of context.match(/[\s\S]{1,1999}/g)!) {
			await ddg.chat(text);
		}
		const res = await ddg.chat('**CONTEXT END** you may now respond, my question is:' + question);
		if (isNullish(res)) {
			collection.delete(user.id);
			collection.set(user.id, new DuckDuckGoChat('gpt-4o-mini'));
		}
		const response = ((res as string) || '') + `\n\n-# Took ${Date.now() - time}ms using ${ddg.getModel()} model`;
		console.log(ddg.export())
		await pagination({
			interaction,
			message,
			pages: response.match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text,
					allowedMentions: {},
				},
			})),
			type: 'buttons',
		});
	},
} as ICommand;
