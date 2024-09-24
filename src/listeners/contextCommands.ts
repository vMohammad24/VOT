import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Events } from "discord.js";
import { IListener } from "../handler/ListenerHandler";

export default {
    name: 'Context Commands',
    description: 'A listener that listens for context commands',
    execute: async ({ client }) => {

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isMessageContextMenuCommand()) return;
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
            ctx.shadowBlur = 20;  // Increase or decrease to control the amount of glow
            ctx.shadowColor = message.author.hexAccentColor || 'white';  // The color of the glow
            ctx.drawImage(loadedAvatar, 0, 0, width / 2, height);
            ctx.shadowBlur = 0;  // Increase or decrease to control the amount of glow
            ctx.shadowColor = 'transparent';  // The color of the glow
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'italic 28px serif';
            ctx.fillText(`"${content}"`, (width * 3) / 4, height / 2);

            // Add the author text
            ctx.font = 'bold 16px serif';
            ctx.fillText(`- ${userName}`, (width * 3) / 4, height / 2 + 40);
            interaction.editReply({ files: [canvas.toBuffer("image/png")] });
        })
    }
} as IListener