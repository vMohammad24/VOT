import axios from "axios";
import {
    ApplicationCommandOptionType,
    type Attachment,
} from "discord.js";
import path from "path";
import sharp from "sharp";
import type ICommand from "../../handler/interfaces/ICommand";

const speechBubblePath = await Bun.file(path.join(import.meta.dirname, "..", "..", "..", "assets", "images", 'speechbubble.png')).arrayBuffer();

export default {
    description: "Add a speech bubble to an image",
    category: "misc",
    options: [
        {
            name: "image",
            description: "The image to add a speech bubble to",
            type: ApplicationCommandOptionType.Attachment,
            required: true,
        }
    ],
    type: "all",
    cooldown: 5000,
    aliases: ["speech", "bubble"],
    execute: async ({ args }) => {
        const attachment = args.get("image") as Attachment | undefined;

        if (!attachment)
            return {
                ephemeral: true,
                content: "Please provide an image to add a speech bubble to",
            };

        const imageBuffer = Buffer.from(
            await axios.get(attachment.url, { responseType: "arraybuffer" }).then((res) => res.data),
        );

        try {
            const metadata = await sharp(imageBuffer).metadata();

            const bubbleBuffer = Buffer.from(speechBubblePath);

            const width = metadata.width || 500;
            const height = metadata.height || 500;

            const bubbleMetadata = await sharp(bubbleBuffer).metadata();
            const bubbleAspectRatio = bubbleMetadata.width! / bubbleMetadata.height!;

            const bubbleWidth = width;

            const bubbleHeight = Math.min(
                height * 0.5,
                Math.floor(bubbleWidth / bubbleAspectRatio)
            );

            const resizedSpeechBubble = await sharp(bubbleBuffer)
                .resize({
                    width: bubbleWidth,
                    height: bubbleHeight,
                    fit: 'fill'
                })
                .toBuffer();

            const resultBuffer = await sharp(imageBuffer)
                .composite([
                    {
                        input: resizedSpeechBubble,
                        gravity: 'north'
                    }
                ])
                .png()
                .toBuffer();

            return {
                files: [{
                    attachment: resultBuffer,
                    name: 'speech_bubble.png'
                }]
            };
        } catch (error) {
            console.error('Error processing image:', error);
            return {
                ephemeral: true,
                content: "There was an error processing your image."
            };
        }
    },
} as ICommand;