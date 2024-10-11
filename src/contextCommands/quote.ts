import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
import { IContextCommand } from "../handler/interfaces/IContextCommand";
console.log("HIII")

export default {
    name: 'Quote',
    type: ApplicationCommandType.Message,
    context: 'installable',
    description: 'Quote a message',
    execute: async (interaction: MessageContextMenuCommandInteraction) => {
        await interaction.deferReply();
        const message = interaction.targetMessage;
        if (!message) return interaction.editReply({ content: "Couldn't find the message" });
        const avatar = message.author.displayAvatarURL({ size: 1024 });
        const content = message.content;
        const userName = message.author.username;
        const loadedAvatar = await loadImage(avatar);
        const width = 1200;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(width / 2, 0, width / 2, height);
        ctx.shadowBlur = 20; // Increase or decrease to control the amount of glow
        ctx.shadowColor = message.author.hexAccentColor || 'white'; // The color of the glow
        ctx.drawImage(loadedAvatar, 0, 0, width / 2, height);
        ctx.shadowBlur = 0; // Increase or decrease to control the amount of glow
        ctx.shadowColor = 'transparent'; // The color of the glow
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const drawText = (content: string, width: number, height: number) => {
            let fontSize = 28; // Initial font size
            const maxWidth = width * 0.5; // Define the maximum width the text can occupy
            let ctxFont = `italic ${fontSize}px serif`;
            ctx.font = ctxFont;

            // Measure the text width
            let textWidth = ctx.measureText(`"${content}"`).width;

            // Adjust font size if text exceeds the maximum allowed width
            while (textWidth > maxWidth && fontSize > 10) { // Adjust the font size down until it fits or hits a minimum
                fontSize--;
                ctxFont = `italic ${fontSize}px serif`;
                ctx.font = ctxFont;
                textWidth = ctx.measureText(`"${content}"`).width;
            }

            // Finally, draw the text
            ctx.fillText(`"${content}"`, (width * 3) / 4, height / 2);
        }
        drawText(content, width, height);

        // Add the author text
        ctx.font = 'bold 16px serif';
        ctx.fillText(`- ${userName}`, (width * 3) / 4, height / 2 + 40);
        interaction.editReply({ files: [canvas.toBuffer('image/png')] });
    }
} as IContextCommand