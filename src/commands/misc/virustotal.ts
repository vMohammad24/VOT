import { ApplicationCommandOptionType } from "discord.js";
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
    userInstall: true,
    execute: async ({ interaction, args }) => {
        const url = args[0];
        if (!url) return {
            content: "No url provided.",
            ephemeral: true
        };
        const res = await axios.get(
            `https://www.virustotal.com/vtapi/v2/url/report?apikey=${process.env.VIRUSTOTAL_API_KEY}&resource=${url}`
        );
        if (res.data.response_code === 1) {
            return `detected ${res.data.positives}/${res.data.total} for ${url.replaceAll("http://" || "https://", "").split("/")[0]}`;
        } else {
            console.log(res.data);
            return "No results found";
        }
    }
} as ICommand