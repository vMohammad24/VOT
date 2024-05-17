import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { shortenUrl, uploadFile } from "../../util/nest";
import { UserTier } from "../../handler/interfaces/ICommand";

export default {
    name: "shorten",
    description: "Shorten a URL",
    options: [{
        name: "url",
        type: ApplicationCommandOptionType.String,
        description: "The URL to shorten",
        required: true
    },
    {
        name: "password",
        type: ApplicationCommandOptionType.String,
        description: "The password to protect the URL",
        required: false
    }],
    userTier: UserTier.Premium,
    execute: async ({ interaction, args }) => {
        const url = args[0]
        const password = args[1];
        const res = await shortenUrl(url, password);
        interaction!.reply({ content: res, ephemeral: true });
    }
} as ICommand