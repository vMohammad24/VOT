import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { ApplicationCommandType, MessageContextMenuCommandInteraction } from 'discord.js';
import { join } from 'path';
import { IContextCommand } from '../handler/interfaces/IContextCommand';
import { loadImg } from '../util/database';
import { getTwoMostUsedColors } from '../util/util';

GlobalFonts.registerFromPath(join(import.meta.dir, '..', '..', 'assets', 'fonts', 'VarelaRound-Regular.ttf'));

export const makeQuote = async (content: string, userName: string, avatar: string) => {
	const width = 1200;
	const height = 600;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	const loadedAvatar = await loadImg(avatar);
	ctx.fillStyle = 'black';
	ctx.fillRect(width / 2, 0, width / 2, height);
	ctx.shadowBlur = 50;

	const colors = getTwoMostUsedColors(loadedAvatar);
	const colorsS = `rgba(${colors[0].join(', ')}, 1)`;
	ctx.shadowColor = colorsS;
	ctx.drawImage(loadedAvatar, 0, 0, width / 2, height);

	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
	ctx.fillStyle = 'white';
	ctx.textAlign = 'center';

	const drawText = (content: string, width: number, height: number) => {
		let fontSize = 28;
		const maxWidth = width * 0.4;
		const maxHeight = height * 0.8;
		const lineHeight = fontSize * 1.2;
		let lines: string[] = [];

		while (fontSize > 10) {
			ctx.font = `italic 400 ${fontSize}px 'Varela Round', sans-serif`;
			const words = content.split(' ');
			lines = [];
			let line = '';

			words.forEach((word, index) => {
				const testLine = line + word + ' ';
				const testWidth = ctx.measureText(testLine).width;
				if (testWidth > maxWidth && line.length > 0) {
					lines.push(line);
					line = word + ' ';
				} else {
					line = testLine;
				}
				if (index === words.length - 1) {
					lines.push(line);
				}
			});

			if (lines.length * lineHeight <= maxHeight) {
				break;
			}

			fontSize--;
		}

		const textY = height / 2 - (lines.length / 2) * lineHeight + lineHeight / 2;
		lines.forEach((line, i) => {
			ctx.fillText(line, (width * 3) / 4, textY + i * lineHeight);
		});

		return textY + lines.length * lineHeight;
	};

	const textBottom = drawText(content, width, height);

	ctx.font = "bold 400 18px 'Varela Round', sans-serif";
	ctx.fillText(`- ${userName}`, (width * 3) / 4, textBottom + 20);
	return canvas;
};

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
		const canvas = await makeQuote(content, userName, avatar);
		return {
			files: [
				{
					name: 'VOT-quote.png',
					attachment: canvas.toBuffer('image/png'),
				},
			],
		};
	},
} as IContextCommand;
