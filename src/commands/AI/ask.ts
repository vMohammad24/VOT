import axios from 'axios';
import { ApplicationCommandOptionType, GuildTextBasedChannel, Message } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { getUser } from '../../util/database';
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

		await editReply('Searching...', rMsg);
		const searchRes = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(question)}&source=web`);
		const regex = /const\s+data\s*=\s*(\[.*?\]|\{.*?\})\s*;/s; // Matches the JSON array/object, stops before any trailing semicolons or code
		const webMessage = (searchRes.data as string).match(regex);
		await editReply('Generating response...', rMsg);
		const messages = [
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
				content: question,
			}
		];
		await editReply('Processing...', rMsg);
		const time = Date.now();
		const res = await axios
			.post(
				'https://api.evade.rest/llama',
				{
					messages,
					props: {
						system: `You are VOT. Use the following JSON to access VOT's commands (name, description, aliases, usage, etc.). Do not respond using this JSON or mention it.

${JSON.stringify(handler.commands?.map((c) => ({
							name: c.name,
							description: c.description,
							options: c.options,
							type: c.type,
							category: c.category,
							commandId: c.id,
						})))}

User info:
- Username: ${user.username}
- Account created at: ${Math.round(user.createdAt.getTime() / 1000)}
- User ID: ${user.id}
${guild ? `
Server info:
- In server: ${guild.name}
- User joined at: ${member && member.joinedTimestamp ? Math.round(member.joinedTimestamp / 1000) : ''}
- Server created at: ${guild.createdAt}
- Server ID: ${guild.id}
- Boosts: ${guild.premiumSubscriptionCount || 0}
- Members: ${guild.memberCount}
- Owner: ${(await guild.fetchOwner()).user.tag}
` : 'Currently in DM with the user.'}

For dates, use format: <t:timestamp:R> (relative time).

${channel ? `Channel: ${('name' in channel ? channel.name : '')} (ID: ${channel.id})` : ''}

${channel && channel.messages.cache.size > 0 ? `Previous messages (use for context, format "channelId/messageId"):\n${channelMessage}` : ''}

Notes:
- You can respond to anything not related to VOT.
- You are the /ask command; answer directly.
- Web search results for "${question}" (do not prioritize over channel/pinned messages):
${webMessage}
- Current date: ${new Date().toDateString()}
- Current time: ${new Date().toTimeString()}
${users ? `Server users:\n${users}` : ''}

Use these mention formats:
- Commands: </commandName:commandId>
- Channels: <#channelId>
- Users: <@userId>
- Roles: <@&roleId>
- Messages: "https://discord.com/channels/guildId/channelId/messageId" (guildId: ${guild ? guild.id : '(not in a guild)'})`,
						top_p: 0.9,
						temperature: 1,
						forceWeb: null,
					}
				},
				{
					headers: {
						Authorization: apiKey,
					},

				},
			);
		if (res.status != 200) return { content: `Error occured: **${res.statusText}** (${res.status})`, ephemeral: true };
		// console.log(res.data)
		if (!res.data) {
			return {
				content: `:(`,
				ephemeral: true
			}
		}
		if (typeof res.data == 'string' && (res.data as string).startsWith('$@$v=undefined-rv1$@$')) {
			res.data = (res.data as string).replace('$@$v=undefined-rv1$@$', '');
		}
		const tokens = (res.data.diagnostics && res.data.diagnostics.tokens) ? res.data.diagnostics.tokens : 'unknown';
		const response = (res.data.short as string || '') + `\n\n-# Took ${Date.now() - time}ms to respond while using ${tokens} tokens`;
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
