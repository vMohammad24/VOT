import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { generateImage } from "../../util/ai";
import { isProfane } from "../../util/util";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    description: 'Image generation using flux-schnell',
    options: [
        {
            name: 'prompt',
            type: ApplicationCommandOptionType.String,
            description: 'The prompt for the image',
            required: true
        }
    ],
    type: 'all',
    execute: async ({ args, user, editReply, interaction, message }) => {
        const prompt = args.get('prompt') as string | undefined;
        if (!prompt) return {
            content: 'Please provide a prompt',
            ephemeral: true
        }
        const profane = isProfane(prompt);
        if (profane.containsProfanity) return {
            embeds: [
                new VOTEmbed()
                    .setTitle('Profanity Detected')
                    .setDescription(`> ${prompt}\n\n**Profanity Words:**\n${profane.profanityWords.map((word: string) => `- ${word}`).join('\n')}`)
                    .setFooter({ text: 'Please avoid using profanity in your prompts.' })
                    .setTimestamp()
                    .author(user)
                    .setColor('Red')
            ],
            ephemeral: true
        }
        const imageUrl = (await generateImage(prompt))[0];
        return {
            embeds: [new VOTEmbed()
                .setTitle('Image Generation')
                .setDescription(`> ${prompt}`)
                .setTimestamp()
                .setImage('attachment://image.png')
                .author(user)
            ],
            files: [{
                attachment: imageUrl,
                name: 'VOT_GENERATED_IMAGE.png'
            }],
        }
    }
} as ICommand