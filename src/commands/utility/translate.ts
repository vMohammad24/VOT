import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { DuckDuckGoTranslate } from "../../util/ddg";
import VOTEmbed from "../../util/VOTEmbed";



const tClient = new DuckDuckGoTranslate();
export default {
    name: "translate",
    description: "Translate text",
    aliases: ["tr"],
    options: [
        {
            name: "text",
            description: "The text you want to translate",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "lang",
            description: "The language you want to translate to",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    type: "all",
    execute: async ({ args, message, user }) => {
        let text = args.get("text") as string | undefined;
        const lang = args.get("lang") as string | undefined || "en";
        if (!text) {
            if (message && message.reference) {
                const m = await message.fetchReference();
                if (!m) return { ephemeral: true, content: "Please provide text to translate." };
                if (m.content) {
                    text = m.content;
                }
            }
        }
        if (!text) return { ephemeral: true, content: "Please provide text to translate." };
        const response = await tClient.translate(text, lang);
        if (!response) return { ephemeral: true, content: "An error occurred while translating the text." };
        const embed = new VOTEmbed()
            .setTitle("Translation")
            .setDescription(`\`\`\`\n${response}\n\`\`\``)
            .setColor("#00FF00")
            .author(user);
        return {
            embeds: [embed],
        }
    }
} as ICommand