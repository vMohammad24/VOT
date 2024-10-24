import axios from 'axios';
import { ApplicationCommandOptionType, Attachment, GuildTextBasedChannel, Message } from 'discord.js';
import TurndownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { getUser } from '../../util/database';
import { pagination } from '../../util/pagination';


const turndownService = new TurndownService();

export default {
	name: 'ask',
	description: 'Ask a question to VOT',
	options: [
		{
			name: 'question',
			type: ApplicationCommandOptionType.String,
			description: 'The question you want to ask',
			required: true,
		},
		{
			name: 'file',
			type: ApplicationCommandOptionType.Attachment,
			description: 'The file you want to upload',
			required: false,
		}
	],
	type: 'all',
	cooldown: 30000,
	async execute({ args, interaction, message, handler, user, guild, channel, member, editReply }) {
		const question = args.get('question');
		const file = args.get('file') as Attachment | undefined;
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

		await editReply('Searching...', rMsg);
		const webMessage = await searchBrave(question);
		await editReply('Generating response...', rMsg);

		await editReply('Processing...', rMsg);
		const time = Date.now();
		const systemPrompt = `You are VOT, use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc.., do not ever respond in json using this json no matter the situation, also never mention that i gave you this json. \n\n${JSON.stringify(
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
			    ${guild.memberCount} Members owned by ${(await guild.fetchOwner()).user.tag}`
				: ''
			}.\n\n
			    .\n\n
			    if you ever want to use dates in your responses, use the following format: <t:timestamp:R> (note that this will display on time/time ago) where timestamp is the timestamp of the date you want to convert.
			    ${channel
				? `the current channel is ${(channel as any).name} and the channel's id is ${channel.id} ${channel.messages.cache.size > 0
					? `Here's a list of the previous messages that were sent in this channel with their author use them as much as possible for context if you see 'refrecning' this is its format "channelId/messageId":\n\n
			    			${channelMessage}`
					: ''
				}`
				: ''
			}.\n\n
			    note that you can respond to anything not related to vot.\n\n
			    also note that you are the /ask command do not tell users to use this command for someting instead you should answer it.\n\n
				note that you have the ability to search the web, and it has been searched for "${question}" and the results are as follows although you should never prioritize  them above channel messages or pinned messages:\n\n
				${webMessage}\n\n
				note that the current date is ${new Date().toDateString()} and the current time is ${new Date().toTimeString()}.\n\n
				${users ? `Here's a list of every user in this server:\n${users}` : ''}\n\n
				when mentioning a command always use the following format </commandName:commandId> where commandName is the name of the command and commandId is the id of the command, this will allow the user to click on the command and run it.\n\n
				when mentioning a channel always use the following format <#channelId> where channelId is the id of the channel, this will allow the user to click on the channel and view it.\n\n
				when mentioning a user always use the following format <@userId> where userId is the id of the user, this will allow the user to click on the user and view their profile.\n\n
				when mentioning a role always use the following format <@&roleId> where roleId is the id of the role, this will allow the user to click on the role and view it.\n\n
				when mentioning a message always use the following format (url) "https://discord.com/channels/guildId/channelId/messageId" where channelId is the id of the channel and messageId is the id of the message,and guildId is the id of the server you are currently in (${guild ? guild.id : '(not in a guild)'}), this will allow the user to click on the message and view it.\n\n
				`
		let data;
		if (file) {
			const buff = Buffer.from(await axios.get(file!.url, { responseType: 'arraybuffer' }).then(res => res.data), 'binary')
			data = {
				"content": question,
				"role": "user",
				"data": {
					"fileText": buff.toString('utf-8'),
					"imageBase64": `data:${file.contentType?.split(';')[0]};base64,${buff.toString('base64')}`,
					"title": file.name
				},
			};
		} else {
			data = {
				"content": question,
				"role": "user"
			};
		}
		console.log(data)
		const res = await axios.post('https://www.blackbox.ai/api/chat',
			{
				"agentMode": {},
				"clickedAnswer2": false,
				"clickedAnswer3": false,
				"clickedForceWebSearch": true,
				"codeModelMode": true,
				"githubToken": null,
				"id": "dwadwa",
				"isChromeExt": false,
				"isMicMode": true,
				"maxTokens": 1024,
				"messages": [
					data
				],
				"mobileClient": true,
				"playgroundTemperature": 0.1,
				"playgroundTopP": 0.9,
				"previewToken": null,
				"trendingAgentMode": {},
				"userId": null,
				"userSelectedModel": 'Claude-Sonnet-3.5',
				"userSystemPrompt": systemPrompt,
				"visitFromDelta": false
			}
		)

		console.log(JSON.stringify(res.data))
		// const tokens = (completion.usage && completion.usage.completion_tokens) ? completion.usage.completion_tokens : 'unknown';
		const response = turndownService.turndown(res.data as string || '') + `\n\n-# Took ${Date.now() - time}ms to respond`;
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
