import axios from "axios";
import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    description: 'Image generation (Premium Only)',
    options: [
        {
            name: 'prompt',
            type: ApplicationCommandOptionType.String,
            description: 'The prompt for the image',
            required: true
        }
    ],
    userTier: 'Premium',
    type: 'all',
    execute: async ({ args, user, editReply, interaction, message }) => {
        const prompt = args.get('prompt') as string | undefined;
        if (!prompt) return {
            content: 'Please provide a prompt',
            ephemeral: true
        }
        const res = await axios.post('https://api.evade.rest/image', {
            prompt
        }, {
            headers: {
                Authorization: process.env.EVADE_API_KEY!
            },
            params: {
                watermark: false
            },
            responseType: 'arraybuffer'
        })
        if (res.status !== 200) return {
            content: 'Failed to generate image',
            ephemeral: true
        }
        const buffer = Buffer.from(res.data)
        return {
            embeds: [await new VOTEmbed()
                .setTitle('Image Generation')
                .setDescription(`> ${prompt}`)
                .setTimestamp()
                .setImage('attachment://image.png')
                .author(user)
                .dominant()
            ],
            files: [{
                attachment: buffer,
                name: 'image.png'
            }],
        }
    }
} as ICommand