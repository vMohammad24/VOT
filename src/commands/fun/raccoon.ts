import axios from "axios";
import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Get a random raccoon image",
    aliases: ["raccoon"],
    name: "raccoon",
    type: "all",
    execute: async () => {
        const res = (await axios.get("https://api.racc.lol/v1/raccoon?json=true"));
        const data = res.data.data;
        if (res.status !== 200) {
            return {
                content: "An error has occured",
                ephemeral: true
            }
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Raccoon")
                    .setImage(data.url)
                    .setColor("Random")
                    .setTimestamp()
                    .setFooter({ text: "Powered by racc.lol" })
            ]
        }
    }
} as ICommand