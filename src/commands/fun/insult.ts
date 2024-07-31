import axios from "axios";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Insults you",
    name: "insult",
    options: [{
        name: "language",
        description: "The language you want the insult in (This needs to be 2 letters only)",
        type: ApplicationCommandOptionType.String,
        required: false,
    }],
    type: "all",
    execute: async ({ args }) => {
        const lang = args.get("language") as string || "en";
        const reqUrl = `https://evilinsult.com/generate_insult.php?lang=${lang}&type=json`;
        const res = (await axios.get(reqUrl));
        const { insult } = res.data;
        if (res.status !== 200) {
            return {
                content: "An error has occured",
                ephemeral: true
            }
        }
        if (!insult) return {
            content: "Invalid language provided",
            ephemeral: true
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Insult")
                    .setDescription(insult)
                    .setColor("Random")
                    .setTimestamp()
                    .setFooter({ text: "Powered by evilinsult.com" })
            ]
        }
    }
} as ICommand