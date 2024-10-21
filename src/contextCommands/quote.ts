import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
import { join } from 'path';
import { IContextCommand } from "../handler/interfaces/IContextCommand";
import { getTwoMostUsedColors } from '../util/util';
GlobalFonts.registerFromPath(
    join(import.meta.dir, '..', '..', 'assets', 'fonts', 'VarelaRound-Regular.ttf')
)
export default {
    name: 'Quote',
    type: ApplicationCommandType.Message,
    context: 'all',
    description: 'Quote a message',
    execute: async (interaction: MessageContextMenuCommandInteraction) => {
        await interaction.deferReply();
        const message = interaction.targetMessage;
        if (!message) {
            return { content: "Couldn't find the message" };
        }
        const avatar = message.author.displayAvatarURL({ size: 1024 });
        const content = message.cleanContent;
        const userName = message.author.username;
        const loadedAvatar = await loadImage(avatar);
        const width = 1200;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(width / 2, 0, width / 2, height);
        ctx.shadowBlur = 50;
        const colors = getTwoMostUsedColors(loadedAvatar);
        const colorsS = `rgba(${colors[0].join(', ')}, 1)`;
        ctx.shadowColor = colorsS;
        ctx.drawImage(loadedAvatar, 0, 0, width / 2, height);
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const drawText = (content: string, width: number, height: number) => {
            let fontSize = 28; const maxWidth = width * 0.5; let ctxFont = `italic 400 ${fontSize}px 'Varela Round', sans-serif`;
            ctx.font = ctxFont;

            let textWidth = ctx.measureText(`"${content}"`).width;

            while (textWidth > maxWidth && fontSize > 10) {
                fontSize--;
                ctxFont = `italic ${fontSize}px serif`;
                ctx.font = ctxFont;
                textWidth = ctx.measureText(`"${content}"`).width;
            }

            ctx.fillText(`"${content}"`, (width * 3) / 4, height / 2);
        }
        drawText(content, width, height);

        ctx.font = "bold 400 16px 'Varela Round', sans-serif";
        ctx.fillText(`- ${userName}`, (width * 3) / 4, height / 2 + 40);
        return { files: [canvas.toBuffer('image/png')] };
    }
} as IContextCommand