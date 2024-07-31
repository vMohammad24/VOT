import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
import { UserTier } from "../../handler/interfaces/ICommand";
import axios from "axios";
export default {
    name: "virustotal",
    description: "Check a url for viruses",
    slashOnly: true,
    options: [{
        name: "url",
        type: ApplicationCommandOptionType.String,
        description: "The url to check for viruses on",
        required: true
    }],
    type: "all",
    execute: async ({ interaction, args }) => {
        const url = args.get("url") as string || undefined;
        if (!url) return {
            content: "No url provided.",
            ephemeral: true
        };
        const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
        const regex = new RegExp(expression);
        if (!url.match(regex)) return {
            content: "Invalid url.",
            ephemeral: true
        }
        const res = await axios.get(
            `https://www.virustotal.com/vtapi/v2/url/report?apikey=${process.env.VIRUSTOTAL_API_KEY}&resource=${url}`
        );
        const embed = new EmbedBuilder()
            .setTitle("Virustotal")
            .setAuthor({ name: "Scan", url: res.data.permalink })
            .setColor("Random")
            .setDescription(`${res.data.positives} positive result(s) out of ${res.data.total}.`);
        for (const [name, s] of Object.entries(res.data.scans)) {
            const scan = s as any;
            if ((scan as any).detected) {
                const text = scan.detail ? `[${scan.result}](${scan.detail})` : scan.result;
                embed.addFields({ name: name, value: text, inline: true })
            }
        }
        if (res.data.response_code === 1) {
            return {
                embeds: [embed]
            }
        } else {
            return "No results found";
        }
    }
} as ICommand