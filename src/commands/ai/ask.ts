import axios from "axios";
import { ApplicationCommandOptionType } from "discord.js";
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
    slashOnly: true,
    async execute({ args, interaction, message }) {
        const question = args.get('question')
        const apiKey = process.env.EVADE_API_KEY
        if (!apiKey) return {
            content: 'API Key not found, please contact the developer',
            ephemeral: true
        }
        await interaction?.deferReply();
        const chunks: string[] = [];
        await axios.post('https://api.evade.rest/streamingchat', {
            messages: [{
                role: 'user',
                content: question
            }]
        }, {
            headers: {
                "Authorization": apiKey
            },
            responseType: 'stream'
        }).then(res => {
            let index = 0;
            let shouldUpdate = true;
            const update = async () => {
                const endRes = chunks.join('').replace(/\\n/g, '\n')
                await pagination({
                    interaction,
                    message,
                    pages: endRes.match(/[\s\S]{1,1999}/g)!.map((text, i) => ({
                        page: {
                            content: text
                        }
                    })),
                    type: 'buttons'
                })
            }
            res.data.on('data', async (chunk: any) => {
                if (typeof chunk != 'string') chunk = Buffer.from(chunk).toString('utf-8');
                chunks.push(chunk)
                const endRes = chunks.join('').replace(/\\n/g, '\n')
                if (endRes !== "" && index % 3 == 0 && shouldUpdate) {
                    await update()
                }
                index++;
            })

            res.data.on('end', async () => {
                shouldUpdate = false;
                await update();
            })
        })
    },
} as ICommand