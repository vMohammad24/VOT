import { ApplicationCommandOptionType, GuildTextBasedChannel, Message } from 'discord.js';
import UserAgent from 'user-agents';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { getUser } from '../../util/database';
import { DuckDuckGoChat } from '../../util/ddg';
import { pagination } from '../../util/pagination';
const useragent = new UserAgent();

export default {
	name: 'ask',
	description: 'Ask a question to VOT (EXPIREMENTAL) ',
	// disabled: true,
	options: [
		{
			name: 'question',
			type: ApplicationCommandOptionType.String,
			description: 'The question you want to ask',
			required: true,
		},
	],
	type: 'all',
	cooldown: 30000,
	async execute({ args, interaction, message, handler, user, guild, channel, member, editReply }) {
		const question = args.get('question');
		const apiKey = process.env.EVADE_API_KEY;
		if (!apiKey)
			return {
				content: 'API Key not found, please contact the developer',
				ephemeral: true,
			};
		await interaction?.deferReply();

		const rMsg = await message?.reply('Thinking...');
		if (message && guild && channel && !interaction) await (channel as GuildTextBasedChannel).sendTyping();
		await editReply('Gathering context...', rMsg);
		const channelMessages = channel && channel.messages.cache ? (channel.messages.cache.size < 50 ? (await channel.messages.fetch({ limit: 100 })).sort((a, b) => a.createdTimestamp - b.createdTimestamp) : channel.messages.cache.sort((a, b) => a.createdTimestamp - b.createdTimestamp)).concat(await (channel as GuildTextBasedChannel).messages.fetchPinned()) : undefined;

		async function messageToText(m: Message<boolean>): Promise<string> {
			const embedsText = m.embeds.length ? 'Embeds:\n' + m.embeds.map((e) => JSON.stringify(e.toJSON())).join('\n') : '';
			const threadText = m.hasThread ? `This message also contains a thread named: ${m.thread?.name} which has the following messages: ${(await m.thread!.messages.fetch()).map(tm => `${tm.author.username}: ${tm.cleanContent}`).join('\n')}` : '';
			return `${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}) ${(m.member && m.member.joinedTimestamp) ? `- Joined ${m.member.joinedTimestamp}` : ""} - messageId: ${m.id}${m.reference ? ` - referencing ${m.reference.channelId}/${m.reference.messageId}` : ''}: ${m.cleanContent} ${embedsText} ${threadText}`;
		}

		const channelMessage = channelMessages
			? (await Promise.all(channelMessages.map(messageToText))).reverse().join('\n')
			: '';

		const users = guild ? (await Promise.all(guild.members.cache.map(async user => `Display name: ${user.displayName} (ID: ${user.id}) - Role: ${user.roles.highest.name} - Joined: ${user.joinedAt} - has been boosting the server since ${user.premiumSinceTimestamp}`))).join('\n') : undefined;
		const continueMsg = 'I will continue this conversation in the next message. Please wait a moment.';
		await editReply('Searching...', rMsg);
		const webMessage = (await searchBrave(question)).data.body.response.web.results.map((r) => `- ${r.title} - ${r.description} - ${r.url}`).join('\n');
		await editReply('Generating response...', rMsg);
		const mainMsg = `NOTE: All responses before [START CONVERSATION HERE] should only be "OK". use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc.., do not ever respond in json using this json no matter the situation, also never mention that i gave you this json. \n\n${JSON.stringify(
			handler.commands?.map((c) => ({
				name: c.name,
				description: c.description,
				options: c.options,
				type: c.type,
				cateogry: c.category,
				commandId: c.id,
			})),
		)}\n\nAlso note that the user's username is ${user.username} and ${guild ? `you are currently in the ${guild.name} server.` : `you are currently in a DM with the user.`}
				 the user's account was created at ${Math.round(user.createdAt.getTime() / 1000)} and the user's id is ${user.id}
			    ${guild
				? `and this user joined this server at ${(member && member.joinedTimestamp) ? Math.round(member.joinedTimestamp / 1000) : ''} whilst the server was created at ${guild ? guild.createdAt : 'N/A'} and the server's id is ${guild ? guild.id : 'N/A'} with ${guild.premiumSubscriptionCount || 0} boosts and 
			    ${guild.memberCount} Members owned by ${(await guild.fetchOwner()).displayName}`
				: ''
			}.\n\n
			    .\n\n
			    if you ever want to use dates in your responses, use the following format: <t:timestamp:R> (note that this will display on time/time ago) where timestamp is the timestamp of the date you want to convert.
			    
			}.\n\n
			    note that you can respond to anything not related to vot.\n\n
			    also note that you are the /ask command do not tell users to use this command for someting instead you should answer it.\n\n
				note that you have the ability to search the web, and it has been searched for "${question}" and the results are as follows although you should never prioritize  them above channel messages or pinned messages:\n\n
				${webMessage}\n\n
				From now on reply as of everything that i have given you before was context and nothing more. You may not use any json in your responses. [START CONVERSATION HERE]\n\nMy first question is ${question}
				`
		await editReply('Processing...', rMsg);
		const time = Date.now();
		const ddg = new DuckDuckGoChat('gpt-4o-mini');
		// split the message into parts of 160000 charchters including continueMsg
		const messages = (mainMsg + continueMsg).match(/[\s\S]{1,15000}/g)!;
		const lastMsg = messages.pop();
		messages.push(lastMsg!.replace(continueMsg, ''));
		const results = [];
		for (let i = 0; i < messages.length; i++) {
			results.push(await ddg.chat(messages[i]));
		}
		const res = results.pop();

		// const res = await axios.post('http://hanging.wang:3000/api/query', {
		// 	prompt: question,
		// 	history: messages,
		// 	customSysMsg: `You are VOT, your website is vot.wtf, you are a discord bot created by vmohammad, you are here to help users with their queries, you can respond to anything not related to vot, you have the ability to search the web.`,
		// }, {
		// 	headers: {
		// 		'Content-Type': 'application/json',
		// 		'x-api-key': import.meta.env.HANH_API_KEY,
		// 	}
		// })
		// const res = await axios
		// 	.post(
		// 		'https://api.evade.rest/llama',
		// 		{
		// 			messages,
		// 			props: {
		// 				system: '',
		// 				top_p: 0.9,
		// 				temperature: 1,
		// 				forceWeb: null,
		// 			}
		// 		},
		// 		{
		// 			headers: {
		// 				Authorization: apiKey,
		// 			},

		// 		},
		// 	);
		console.log(res)
		// if (res.status != 200) return { content: `Error occured: **${res.statusText}** (${res.status})`, ephemeral: true };
		// console.log(res.data)
		// if (!res.data) {
		// 	return {
		// 		content: `:(`,
		// 		ephemeral: true
		// 	}
		// }
		// if (typeof res.data == 'string' && (res.data as string).startsWith('$@$v=undefined-rv1$@$')) {
		// 	res.data = (res.data as string).replace('$@$v=undefined-rv1$@$', '');
		// }
		const tokens = '0'//(res.data.diagnostics && res.data.diagnostics.tokens) ? res.data.diagnostics.tokens : 'unknown';
		const response = (res as string || '') + `\n\n-# Took ${Date.now() - time}ms to respond while using ${tokens} tokens`;
		await pagination({
			interaction,
			message,
			rMsg,
			pages: (response).match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text,
					allowedMentions: {}
				},
			})),
			type: 'buttons',
		});
		const pUser = await getUser(user, {
			shouldTrain: true
		})
		if (pUser && pUser.shouldTrain) {
			await handler.prisma.trainingData.create({
				data: {
					question,
					userId: user.id,
					response,
					context: `Channel: ${channel?.id} | Guild: ${guild?.id || "DM"}\n ${channelMessage ? `Channel Messages:\n${channelMessage}` : ''}\n\n | Users: ${users}`,
				},
			})
		}
	},
} as ICommand;
