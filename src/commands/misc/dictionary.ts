import axios from "axios";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Get a defention of a word",
    options: [{
        name: "word",
        description: "The word to define/get info on",
        type: ApplicationCommandOptionType.String,
        required: true,
    }],
    type: "all",
    execute: async ({ args }) => {
        const word = args.get("word") as string || undefined;
        if (!word) return {
            content: "Please provide a word",
            ephemeral: true
        }
        try {
            const reqUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
            const res = (await axios.get(reqUrl));
            if (res.status == 404) {
                return {
                    content: "Word not found",
                    ephemeral: true
                }
            }
            const { data } = res;
            const embed = new EmbedBuilder()
                .setTitle(data[0].word)
                .setDescription(data[0].meanings[0].definitions[0].definition)
                .setColor("Random")
                .setTimestamp()
                .setFooter({ text: "Powered by dictionaryapi" })

            return {
                embeds: [embed]
            }
        } catch (e) {
            return {
                content: (e as any).response.data.message || "An error has occured",
                ephemeral: true
            }
        }
    }
} as ICommand