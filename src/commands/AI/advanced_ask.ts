import { ApplicationCommandOptionType, GuildTextBasedChannel, Message } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { advancedChat, AIMessage } from "../../util/ai";
import { searchBrave } from "../../util/brave";
import { pagination } from "../../util/pagination";
// expirement command from a very old src brought back because of deepseek <3 
export default {
    name: "advanced ask",
    aliases: ["aask", "aa"],
    description: "Ask a question to the AI BUT WITH A SHIT TON OF CONTEXT",
    options: [
        {
            name: "quesiton",
            description: "The question you'd like to ask it",
            type: ApplicationCommandOptionType.String,
            required: true
        },
    ],
    execute: async ({ args, editReply, guild, message, interaction, channel, handler, user, member }) => {
        const question = args.get("quesiton");
        if (!question) {
            console.log(args)
            return {
                content: "Please supply a quesiton to ask the AI, it has context but it can NOT read your mind. (YET)",
                ephemeral: true
            }
        }
        const rMsg = await message?.reply('Thinking...');
        if (message && guild && channel && !interaction) await (channel as GuildTextBasedChannel).sendTyping();
        await editReply('Gathering context...', rMsg);
        const channelMessages = channel ? (channel.messages.cache.size < 50 ? Array.from((await channel.messages.fetch({ limit: 100 }))
            .sorted((a, b) => a.createdTimestamp - b.createdTimestamp)
            .values()) : Array.from(channel.messages.cache.sorted((a, b) => a.createdTimestamp - b.createdTimestamp)
                .values())).concat(Array.from((await (channel as GuildTextBasedChannel).messages.fetchPinned()).values())) : undefined;
        async function messageToText(m: Message<boolean>): Promise<string> {
            return `${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}) ${(m.member && m.member.joinedTimestamp) ? `- Joined ${m.member.joinedTimestamp}` : ""} - messageId: ${m.id}${m.reference ? ` - refrecning ${m.reference.channelId}/${m.reference.messageId}` : ''}: ${m.embeds ? (m.embeds ? 'Embeds:\n' + m.embeds.map((e) => JSON.stringify(e.toJSON())).join('\n') : '') : m.cleanContent} ${m.hasThread ?
                `This message also contains a thread named: ${m.thread?.name} which has the following messages: ${(await m.thread?.awaitMessages())?.map(async tm => await messageToText(tm))}` : ''}`
        }
        const channelMessage = channelMessages
            ? (await Promise.all(channelMessages
                .map(
                    async (m: Message<boolean>) =>
                        await messageToText(m),
                )))
                .join('\n')
            : '';
        const users = guild ? await guild.members.cache.map(user => `Display name: ${user.displayName} (ID: ${user.id}) - Role: ${user.roles.highest.name} - Joined: ${user.joinedAt} - Boosting since ${user.premiumSinceTimestamp}`).join('\n') : undefined;
        await editReply('Searching...', rMsg);
        const webRes = (await searchBrave(question)).data.body.response;
        let webMessage = 'No web results found';
        let webLength = 0;
        if (webRes) {
            const { web, infobox } = webRes;
            const results = web.results;
            webLength = results.length;
            if (results.length > 0) {
                webMessage = results.map((result) => {
                    return `**${result.title}**\n${result.description}\n${result.url}`;
                }).join('\n\n');
            }
            if (infobox) {
                const ib = infobox.results[0];
                if (ib.description) {
                    webMessage = ib.description;
                }
            } else {
                webMessage = 'No web results found';
            }
        }
        await editReply('Generating response...', rMsg);
        const messages: AIMessage[] = [
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
        const response = await advancedChat(messages, 'deepseek-r1', 'Blackbox');
        console.log(response)
        await pagination({
            interaction,
            message,
            rMsg,
            pages: (response + `\n\n-# ${webLength} web results have been used towards this prompt`).match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
                page: {
                    content: text,
                    allowedMentions: {}
                },
            })),
            type: 'buttons',
        });
    }
} as ICommand