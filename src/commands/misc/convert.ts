import axios from "axios";
import { ApplicationCommandOptionType, Attachment } from "discord.js";
import sharp from "sharp";
import ICommand from "../../handler/interfaces/ICommand";
const choices = ['png', 'jpg', 'webp'];
export default {
    description: 'Convert files',
    options: [{
        name: 'file',
        description: 'The file you want to convert',
        type: ApplicationCommandOptionType.Attachment,
        required: true
    },
    {
        name: 'format',
        description: 'The format you want to convert to',
        type: ApplicationCommandOptionType.String,
        choices: choices.map((choice) => ({ name: choice, value: choice }))
    }],
    type: 'all',
    cooldown: 10000,
    execute: async ({ args }) => {
        const attachment = args.get('file') as Attachment | undefined;
        const format = (args.get('format') as string | undefined) || 'png';
        if (!attachment) return { ephemeral: true, content: 'Please provide a file to convert.' };
        if (!choices.includes(format)) return { ephemeral: true, content: 'Invalid format' };
        const file = Buffer.from(await axios.get(attachment.url, { responseType: 'arraybuffer' }).then((res) => res.data));
        switch (format) {
            case 'png':
                return {
                    files: [await sharp(file).toFormat('png').toBuffer()]
                }
            case 'jpg':
                return {
                    files: [await sharp(file).toFormat('jpeg').toBuffer()]
                }
            case 'webp':
                return {
                    files: [await sharp(file).toFormat('webp').toBuffer()]
                }
            default:
                return {
                    ephemeral: true,
                    content: 'Invalid format'
                }
        }
    }
} as ICommand