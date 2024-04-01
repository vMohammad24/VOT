import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
import { File } from 'buffer';
import { UserTier } from "../../handler/interfaces/ICommand";
export default {
    name: "upload",
    description: "Upload a file to nest.rip",
    slashOnly: true,
    options: [{
        name: "file",
        type: ApplicationCommandOptionType.Attachment,
        description: "The file to upload",
        required: true
    }],
    userTier: UserTier.Beta,
    execute: async ({ interaction }) => {
        const file = interaction!.options.get("file", true).attachment;
        if (!file) return interaction!.reply("No file provided.");
        const url = file.proxyURL;
        const res = await uploadFile(url);
        interaction!.reply(res);
    }
} as ICommand