import axios from "axios";
import type ICommand from "../../handler/interfaces/ICommand";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";

export default {
    description: "Get a random cat image/gif",
    name: "cat",
    options: [{
        name: "tag",
        description: "The tag you want to search for",
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
    }],
    init: async ({ client }) => {
        client.on('interactionCreate', async (inter) => {
            if (!inter.isAutocomplete()) return;
            if (inter.commandName !== "cat") return;
            const res = await axios.get('https://cataas.com/api/tags', {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            const search = inter.options.getString("tag");
            const tags = (res.data as string[]).filter((tag) => tag.length > 0).filter(tag => search ? tag.includes(search) : true).slice(0, 25);
            const options = tags.map((tag: string) => ({
                name: tag,
                value: tag
            }))
            inter.respond(options)
        })
    },
    execute: async ({ args }) => {
        const tag = args[0];
        const reqUrl = `https://cataas.com/cat?json=true${tag ? '&tag=' + tag : ''}`;
        const res = (await axios.get(reqUrl));
        const url = 'https://cataas.com/cat/' + res.data._id;
        if (res.status !== 200) {
            return {
                content: "An error has occured",
                ephemeral: true
            }
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Cat")
                    .setImage(url)
                    .setColor("Random")
                    .setTimestamp()
                    .setFooter({ text: "Powered by cataas.com" })
            ]
        }
    }
} as ICommand