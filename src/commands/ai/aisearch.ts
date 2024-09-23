import axios from "axios";
import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { pagination } from "../../util/pagination";

export default {
    description: "Ask brave a question",
    category: "ai",
    aliases: ["ask"],
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "question",
        description: "The question you want to ask brave",
        required: true
    }],
    type: 'all',
    userTier: 'Beta',
    slashOnly: true,
    execute: async ({ args, interaction, message, handler: { logger } }) => {
        const question = args.get("question");
        console.log(question)
        if (!question) return { ephemeral: true, content: "Please provide a question to ask" }
        const apiURL = `https://api.evade.rest/search/llm?query=${encodeURIComponent(question)}`
        const strings: string[] = [];
        await interaction?.deferReply();
        const res = await axios.get(apiURL, { responseType: 'stream' }).then(res => {
            res.data.on('data', async (chunk: string) => {
                if (typeof chunk != 'string') chunk = Buffer.from(chunk).toString('utf-8');
                strings.push(chunk.split("\n").join('').replace(/"(.{1})"/g, '$1'));
                const endRes = strings.join(' ').replace(/\\n/g, '\n')
                    .replace(/""/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace('" "', ' ')
                if (endRes !== "") {
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
            })
        })
        console.log('done')
    }
} as ICommand