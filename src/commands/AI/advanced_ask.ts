import { ApplicationCommandOptionType, BaseGuildTextChannel, Collection, GuildTextBasedChannel, Message } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { advancedChat, AIMessage } from "../../util/ai";
import { pagination } from "../../util/pagination";
// expirement command from a very old src brought back because of deepseek <3 

const PMC = new Collection<string, AIMessage[]>();
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
        const channelMessages = channel && channel instanceof BaseGuildTextChannel ? await fetchChannelMessages(channel) : undefined;

        async function fetchChannelMessages(channel: GuildTextBasedChannel) {
            const messagesArray = channel.messages.cache.size < 50
                ? Array.from((await channel.messages.fetch({ limit: 100 })).sorted((a, b) => a.createdTimestamp - b.createdTimestamp).values())
                : Array.from(channel.messages.cache.sorted((a, b) => a.createdTimestamp - b.createdTimestamp).values());

            const pinnedMessages = Array.from((await channel.messages.fetchPinned()).values());
            return messagesArray.concat(pinnedMessages);
        }

        async function messageToText(m: Message<boolean>): Promise<string> {
            const joinedDate = m.member?.joinedTimestamp
                ? `- Joined ${new Date(m.member.joinedTimestamp).toLocaleString()}`
                : "";

            const reference = m.reference
                ? ` - referencing ${m.reference.channelId}/${m.reference.messageId}`
                : '';

            const content = m.embeds && m.embeds.length > 0
                ? 'Embeds:\n' + m.embeds.map((e) => JSON.stringify(e.toJSON())).join('\n')
                : m.cleanContent;

            let threadContent = '';
            if (m.hasThread && m.thread) {
                const threadMessages = await m.thread.messages.fetch();
                if (threadMessages.size > 0) {
                    const threadTexts = await Promise.all(Array.from(threadMessages.values()).map(messageToText));
                    threadContent = `This message contains a thread named: ${m.thread.name} with messages: ${threadTexts.join(' | ')}`;
                }
            }

            return `${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}) ${joinedDate} - messageId: ${m.id}${reference}: ${content} ${threadContent}`;
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
        // const webRes = (await searchBrave(question)).data.body.response;
        // let webMessage = 'No web results found';
        // let webLength = 0;
        // if (webRes) {
        //     const { web, infobox } = webRes;
        //     const results = web.results;
        //     webLength = results.length;
        //     if (results.length > 0) {
        //         webMessage = results.map((result) => {
        //             return `**${result.title}**\n${result.description}\n${result.url}`;
        //         }).join('\n\n');
        //     }
        //     if (infobox) {
        //         const ib = infobox.results[0];
        //         if (ib.description) {
        //             webMessage = ib.description;
        //         }
        //     } else {
        //         webMessage = 'No web results found';
        //     }
        // }
        const previousMessages = PMC.get(user.id) || [];
        const messages: AIMessage[] = [
            {
                role: 'user',
                content: 'what is vot.wtf?',
            },
            {
                role: 'assistant',
                content: 'I am VOT, a discord bot created by vmohammad. I am here to help you with your queries. You can ask me anything and I will try to help you as much as I can.',
            },
            {
                role: 'user',
                content: `use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc. Do not ever respond in json using this json no matter the situation, also never mention that I gave you this json.

        ${JSON.stringify(
                    handler.commands?.map((c) => ({
                        name: c.name,
                        description: c.description,
                        options: c.options,
                        type: c.type,
                        category: c.category,
                        commandId: c.id,
                    })), null, 0
                )}

        User Information:
        - Username: ${user.username}
        - User ID: ${user.id}
        - Account Created: <t:${Math.round(user.createdAt.getTime() / 1000)}:R>
        ${guild ? `- Current Server: ${guild.name}
        - Joined Server: ${member?.joinedTimestamp ? `<t:${Math.round(member.joinedTimestamp / 1000)}:R>` : 'Unknown'}
        - Server Created: ${guild.createdAt ? `<t:${Math.round(guild.createdAt.getTime() / 1000)}:R>` : 'N/A'}
        - Server ID: ${guild.id}
        - Server Boosts: ${guild.premiumSubscriptionCount || 0}
        - Member Count: ${guild.memberCount}
        - Server Owner: ${(await guild.fetchOwner()).displayName}`
                        : '- Currently in Direct Messages'}

        Timestamp Formats:
        - <t:timestamp:F> = Wednesday, March 26, 2025 at 7:32 AM
        - <t:timestamp:f> = March 26, 2025 at 7:32 AM
        - <t:timestamp:D> = March 26, 2025
        - <t:timestamp:d> = 3/26/25
        - <t:timestamp:T> = 7:32:00 AM
        - <t:timestamp:t> = 7:32 AM
        - <t:timestamp:R> = 34 seconds ago

        ${channel ? `Channel Information:
        - Current Channel: ${(channel as any).name}
        - Channel ID: ${channel.id}
        ${channel.messages.cache.size > 0 ? `- Previous Messages (for context):\n${channelMessage}` : ''}` : ''}

        Current Date/Time: ${new Date().toLocaleString()}

        ${users ? `Server Users:\n${users}` : ''}

        Formatting Rules:
        - Commands: </commandName:commandId>
        - Channels: <#channelId>
        - Users: <@userId>
        - Roles: <@&roleId>
        - Messages: https://discord.com/channels/${guild ? guild.id : 'DM'}/channelId/messageId

        Important Notes:
        - You can respond to anything, not just VOT-related questions
        - You are the /advanced ask command - answer directly without redirecting
        - Use proper Discord formatting in your responses for clarity
        `,
            },
            {
                role: 'assistant',
                content: 'I understand. I will provide accurate and concise responses using the command information you provided while following the proper Discord formatting conventions.',
            },
            ...previousMessages
        ];
        const tempMsgs: AIMessage[] = [];
        const qMsg = {
            role: 'user',
            content: question,
        } as AIMessage;
        messages.push(
            qMsg
        )
        tempMsgs.push(qMsg);
        await editReply('Processing...', rMsg);
        const response = await advancedChat(messages, 'gemini-2.0-flash');
        tempMsgs.push({
            role: 'assistant',
            content: response,
        })
        if (user.id) {
            PMC.set(user.id, tempMsgs);
        }
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
    }
} as ICommand