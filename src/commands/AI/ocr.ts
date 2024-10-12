import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from "discord.js";
import { join } from 'path';
import { createWorker } from "tesseract.js";
import ICommand from "../../handler/interfaces/ICommand";
const langs: { name: string; value: string }[] = [
    { "name": "Arabic", "value": "ara" },
    { "name": "Bengali", "value": "ben" },
    { "name": "Chinese - Simplified", "value": "chi_sim" },
    { "name": "Chinese - Traditional", "value": "chi_tra" },
    { "name": "Danish", "value": "dan" },
    { "name": "Dutch; Flemish", "value": "nld" },
    { "name": "English", "value": "eng" },
    { "name": "French", "value": "fra" },
    { "name": "German", "value": "deu" },
    { "name": "Greek, Modern (1453-)", "value": "ell" },
    { "name": "Hebrew", "value": "heb" },
    { "name": "Hindi", "value": "hin" },
    { "name": "Indonesian", "value": "ind" },
    { "name": "Italian", "value": "ita" },
    { "name": "Japanese", "value": "jpn" },
    { "name": "Korean", "value": "kor" },
    { "name": "Malay", "value": "msa" },
    { "name": "Persian", "value": "fas" },
    { "name": "Polish", "value": "pol" },
    { "name": "Portuguese", "value": "por" },
    { "name": "Russian", "value": "rus" },
    { "name": "Spanish; Castilian", "value": "spa" },
    { "name": "Swedish", "value": "swe" },
    { "name": "Turkish", "value": "tur" },
    { "name": "Vietnamese", "value": "vie" }
]



export default {
    description: 'Extract text from an image',
    category: 'ai',
    options: [{
        name: 'image',
        description: 'The image you want to extract text from',
        type: ApplicationCommandOptionType.Attachment,
        required: true
    },
    {
        name: 'lang',
        description: 'The language you want to extract text in',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: langs

    }],
    type: 'all',
    execute: async ({ args, interaction }) => {
        const attachment = args.get('image') as Attachment | undefined;
        const lang = (args.get('lang') as string | undefined) || 'eng';
        if (!attachment) return { ephemeral: true, content: 'Please provide an image to extract text from' };
        await interaction?.deferReply();
        let text = '';
        let conf = 0;
        try {
            const worker = await createWorker(lang, undefined, {
                cachePath: join(import.meta.dir, '..', '..', '..', 'assets', 'tesseract')
            });
            const data = (await worker.recognize(attachment.url)).data;
            text = data.text;
            conf = data.confidence;
            await worker.terminate();
        } catch (e) {
            text = 'Invalid image/language';
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle('Extracted Text')
                    .setDescription(text)
                    .setFooter({ text: `Confidence: ${conf}` })
                    .setColor(text.includes('Invalid') ? 'Red' : 'Green')
                    .setImage(attachment.url)
            ]
        };
    }
} as ICommand