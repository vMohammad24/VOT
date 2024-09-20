import axios from "axios";
import { APIUser, ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import TurnDownService from 'turndown';
import ICommand from "../../handler/interfaces/ICommand";
import { pagination } from "../../util/pagination";

const turndownService = new TurnDownService();
export default {
    description: "Search for a query on the internet",
    category: "misc",
    aliases: ["google"],
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "query",
        description: "The query you want to search for",
        required: true
    }],
    type: 'all',
    execute: async ({ args, interaction, message, handler: { client } }) => {
        const query = args.get("query") as string | undefined;
        if (!query) return { ephemeral: true, content: "Please provide a query to search for" }
        const apiURL = `https://api.evade.rest/search?query=${encodeURIComponent(query)}`
        console.log(apiURL);
        const res = await axios.get(apiURL);
        const { data } = res;
        const results: {
            profile: { name: string }
            title: string;
            description: string
            url: string;
        }[] = data.response.web.results;
        if (!results) return { ephemeral: true, content: "No results found" }
        const evadeUser = await client.rest.get('/users/1228765716321271999') as APIUser;
        const isGif = evadeUser.avatar!.startsWith('a_');
        const evadeAvatar = `https://cdn.discordapp.com/avatars/${evadeUser.id}/${evadeUser.avatar}.${isGif ? 'gif' : 'png'}?size=1024?quality=loseless`;
        const embeds = results.map((result, index) => {
            return {
                embed: new EmbedBuilder()
                    .setTitle(result.title)
                    .setDescription(turndownService.turndown(result.description))
                    .setURL(result.url)
                    .setFooter({ text: 'Powered by evade.rest', iconURL: evadeAvatar }),
                name: result.profile.name
            }
        })
        await pagination({ interaction, message, embeds, type: 'select', })
    }
} as ICommand;