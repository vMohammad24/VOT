import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
import { UserTier } from "../../handler/interfaces/ICommand";
import axios from "axios";
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
        interaction?.deferReply({ ephemeral: true });
        const file = interaction!.options.get("file", true).attachment;
        if (!file) return interaction!.reply("No file provided.");
        const content = (await axios.get(file.url, { responseType: "arraybuffer" })).data;
        const f = new File([content], file.name);
        const res = await uploadFile(f);
        return {
            content: res.accessibleURL,
            ephemeral: true
        };
    }
} as ICommand