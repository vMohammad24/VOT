import { ApplicationCommandOptionType, Collection, GuildTextBasedChannel } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { ddgModels, DuckDuckGoChat } from '../../util/ddg';
import { pagination } from '../../util/pagination';
import { isNullish } from '../../util/util';
const collection = new Collection<string, DuckDuckGoChat>();
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
			context += (await searchBrave(question)).data.body.response.web.results
				.map((r) => `- ${r.title} - ${r.description} - ${r.url}`)
				.join('\n');
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
		const res = await ddg.chat(`Here's some context for you:\n${context}\n\n${question}`);
		if (isNullish(res)) {
			collection.delete(user.id);
			collection.set(user.id, new DuckDuckGoChat('gpt-4o-mini'));
		}
		const response = ((res as string) || '') + `\n\n-# Took ${Date.now() - time}ms using ${ddg.getModel()} model`;
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
