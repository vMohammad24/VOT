import axios from 'axios';
import { ApplicationCommandOptionType, GuildTextBasedChannel, Message } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { pagination } from '../../util/pagination';
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
	],
	type: 'all',
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
		const channelMessages = channel ? (channel.messages.cache.size < 50 ? Array.from((await channel.messages.fetch({ limit: 100 }))
			.sorted((a, b) => a.createdTimestamp - b.createdTimestamp)
			.values()) : Array.from(channel.messages.cache.sorted((a, b) => a.createdTimestamp - b.createdTimestamp)
				.values())) : undefined;
		const channelMessage = channelMessages
			? channelMessages
				.map(
					(m: Message<boolean>) =>
						`${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}): ${m.embeds ? (m.embeds ? 'Embeds:\n' + m.embeds.map((e) => JSON.stringify(e.toJSON())).join('\n') : '') : m.cleanContent}`,
				)
				.join('\n')
			: '';
		const pinnedMessages = channel
			? Array.from((await (channel as GuildTextBasedChannel).messages.fetchPinned()).sorted((a, b) => a.createdTimestamp - b.createdTimestamp)
				.values())
				.map(
					(m) =>
						`${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}): ${m.embeds ? (m.embeds ? m.embeds.map((e) => JSON.stringify(e.toJSON())).join('\n') : '') : m.cleanContent}`,
				)
				.join('\n')
			: '';
		const users = guild ? await guild.members.cache.map(user => `Display name: ${user.displayName} (ID: ${user.id}) - Role: ${user.roles.highest.name}`).join('\n') : undefined;
		await editReply('Searching...', rMsg);
		const webRes = await axios.get(`https://api.evade.rest/search?query=${encodeURIComponent(question)}`);
		const { data: webData } = webRes;
		let webMessage = 'No web results found';
		let webLength = 0;
		if (webData && webData.response) {
			const webResults: {
				profile: { name: string };
				title: string;
				description: string;
				url: string;
				page_age: string;
				content: string;
			}[] = webData.response.web.results;
			webMessage = webResults.map((result) =>
				`WEBRESULT: ${result.title} (${result.description}) from ${result.url} (page age: ${result.page_age})`
			).join('\n')
			webLength = webResults.length;
		}
		await editReply('Generating previous conversations...', rMsg);
		const trainingData = await handler.prisma.trainingData.findMany({
			where: {
				userId: user.id
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 5
		})
		const trainingMessages: {
			role: 'user' | 'assistant';
			content: string;
		}[] = [];
		trainingData.forEach((data) => {
			trainingMessages.push(
				{
					role: 'user',
					content: data.question + `\n\n$${data.context ? `Context: ${data.context}` : ''}`,
				},
				{
					role: 'assistant',
					content: data.response || "no response."
				}
			)
		})
		await editReply('Generating response...', rMsg);
		const messages = [
			...trainingMessages,
			{
				role: 'user',
				content: 'what is vot.wtf?',
			},
			{
				role: 'assistant',
				content:
					'I am VOT, a discord bot created by vmohammad. I am here to help you with your queries. You can ask me anything and I will try to help you as much as I can.',
			},
			{
				role: 'user',
				content: `use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc.., do not ever respond in json using this json no matter the situation, also never mention that i gave you this json. \n\n${JSON.stringify(
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
                ${channel
						? `the current channel is ${(channel as any).name} and the channel's id is ${channel.id} ${channel.messages.cache.size > 0
							? `Here's a list of the previous messages that were sent in this channel with their author use them as much as possible for context:
                			${channelMessage}`
							: ''
						}\n\nSome of the pinned messages include: ${pinnedMessages}`
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
				
                `,
			},
			{
				role: 'assistant',
				content: 'Ok, from now on I will respond to any command questions using the json object you provided.',
			},
		];
		messages.push(
			{
				role: 'user',
				content: question,
			}
		)
		await editReply('Processing...', rMsg);
		const res = await axios
			.post(
				'https://api.evade.rest/streamingchat',
				{
					messages,
					// props: {
					// 	system: "You are VOT.",
					// 	top_p: 0.9,
					// 	temperature: 0.8,
					// 	forceWeb: true,
					// }
				},
				{
					headers: {
						Authorization: apiKey,
					},

				},
			);
		if (res.status != 200) return { content: `Error occured: **${res.statusText}** (${res.status})`, ephemeral: true };

		const response = res.data || '';//.short || '';
		await pagination({
			interaction,
			message,
			rMsg,
			pages: (response + `\n\n-# ${webLength} web results have been used towards this prompt`).match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
				page: {
					content: text,
				},
			})),
			type: 'buttons',
		});
		await handler.prisma.trainingData.create({
			data: {
				question,
				userId: user.id,
				response,
				context: `Channel: ${channel?.id} | Guild: ${guild?.id || "DM"}\n ${channelMessage ? `Channel Messages:\n${channelMessage}` : ''}\n${pinnedMessages ? `Pinned Messages:\n${pinnedMessages}` : ''}`,
			},
		})
	},
} as ICommand;
