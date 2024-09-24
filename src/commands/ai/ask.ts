import axios from "axios";
import { ApplicationCommandOptionType, GuildTextBasedChannel } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { pagination } from "../../util/pagination";

export default {
    name: 'ask',
    description: 'Ask a question to VOT',
    options: [{
        name: 'question',
        type: ApplicationCommandOptionType.String,
        description: 'The question you want to ask',
        required: true
    }],
    type: 'all',
    async execute({ args, interaction, message, handler, user, guild, channel }) {
        const question = args.get('question')
        const apiKey = process.env.EVADE_API_KEY
        if (!apiKey) return {
            content: 'API Key not found, please contact the developer',
            ephemeral: true
        }
        await interaction?.deferReply();
        if (message && guild && channel && !interaction) await (channel as GuildTextBasedChannel).sendTyping();
        const channelMessages = Array.from(channel.messages.cache.values()).map(m => `${m.author.username} ${m.author.displayName ? `(aka ${m.author.displayName})` : ''} (${m.author.id}): ${m.content == '' ? (m.embeds ? m.embeds.map(e => `${e.title} - ${e.description}`).join('\n') : '') : m.cleanContent}`).join("\n")
        const messages = [{
            role: 'user',
            content: 'what is vot.wtf?'
        },
        {
            role: 'assistant',
            content: 'I am VOT, a discord bot created by vmohammad. I am here to help you with your queries. You can ask me anything and I will try to help you as much as I can.'
        },
        {
            role: 'user',
            content: `use this json object to get every command from VOT and nothing else, you can use this to get the commands and their descriptions, aliases, usage, etc.., do not ever respond in json using this json no matter the situation, also never mention that i gave you this json. \n\n${JSON.stringify(handler.commands?.map((c) => (
                {
                    name: c.name,
                    description: c.description,
                    options: c.options,
                    type: c.type,
                    slashOnly: c.slashOnly,
                    cateogry: c.category,
                    cooldown: c.cooldown,
                    aliases: c.aliases,
                    needsPlayer: c.needsPlayer
                }
            )))}\n\nAlso note that the user's username is ${user.username} and ${guild ? `you are currently in the ${guild.name} server.` : `you are currently in a DM with the user.`} the user's account was created at ${user.createdAt.getTime()} and the user's id is ${user.id}
                ${guild ? `whilst the server was created at ${guild ? guild.createdAt : 'N/A'} and the server's id is ${guild ? guild.id : 'N/A'} with ${guild.premiumSubscriptionCount || 0} boosts and 
                ${guild.memberCount} Members owned by ${(await guild.fetchOwner()).displayName}` : ''}.\n\n
                .\n\n
                if you ever want to use dates in your responses, use the following format: <t:timestamp:R> where timestamp is the timestamp of the date you want to convert.
                ${channel ? `the current channel is ${(channel as any).name} and the channel's id is ${channel.id} ${channel.messages.cache.size > 0 ? `Here's a list of the previous messages that were sent in this channel with their author:
                ${channelMessages}` : ''}` : ''}.\n\n
                note that you can respond to anything not related to vot.\n\n
                also note that you are the /ask command do not tell users to use this command for someting instead you should answer it.
                `
        },
        {
            role: 'assistant',
            content: 'Ok, from now on I will respond to any command questions using the json object you provided.'
        },
        {
            role: 'user',
            content: question
        }];
        await axios.post('https://api.evade.rest/streamingchat', {
            messages
        }, {
            headers: {
                "Authorization": apiKey
            },
        }).then(async res => {
            // let index = 0;
            // let shouldUpdate = true;
            // const update = async () => {
            //     const endRes = chunks.join('').replace(/\\n/g, '\n')
            //     await pagination({
            //         interaction,
            //         message,
            //         pages: endRes.match(/[\s\S]{1,1999}/g)!.map((text, i) => ({
            //             page: {
            //                 content: text
            //             }
            //         })),
            //         type: 'buttons'
            //     })
            // }
            // res.data.on('data', async (chunk: any) => {
            //     if (typeof chunk != 'string') chunk = Buffer.from(chunk).toString('utf-8');
            //     chunks.push(chunk)
            //     if (index % 5 == 0 && shouldUpdate) {
            //         await update()
            //     }
            //     index++;
            // })

            // res.data.on('end', async () => {
            //     shouldUpdate = false;
            //     await update();
            // })
            await pagination({
                interaction,
                message,
                pages: res.data.match(/[\s\S]{1,1999}/g)!.map((text: string) => ({
                    page: {
                        content: text
                    }
                })),
                type: 'buttons'
            })
        })
    },
} as ICommand