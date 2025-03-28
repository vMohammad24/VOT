import { join } from "path";
import { GlobalFonts, type SKRSContext2D, createCanvas } from "@napi-rs/canvas";
import {
	ApplicationCommandType,
	type MessageContextMenuCommandInteraction,
} from "discord.js";
import commandHandler from "..";
import type { IContextCommand } from "../handler/interfaces/IContextCommand";
import { loadImg } from "../util/database";

const AVATAR_SIZE = 40;
const PADDING = 15;
const LINE_HEIGHT = 18;
const MAX_WIDTH = 500; // Maximum width for message content

// Register fonts for consistent styling
GlobalFonts.registerFromPath(
	join(import.meta.dir, "..", "..", "assets", "fonts", "whitney-medium.otf"),
);
GlobalFonts.registerFromPath(
	join(import.meta.dir, "..", "..", "assets", "fonts", "ggsans-Normal.ttf"),
);

// Utility function to format the date
const formatTimestamp = (date: Date): string => {
	return date.toLocaleString("en-US", {
		hour: "numeric",
		minute: "numeric",
		hour12: true,
	});
};

// Function to draw the Discord-style message
export async function drawDiscordMessage({
	avatarUrl,
	username,
	timestamp,
	content,
}: {
	avatarUrl: string;
	username: string;
	timestamp: Date;
	content: string;
}) {
	// Temporary canvas for calculating content dimensions
	const tempCanvas = createCanvas(1, 1);
	const tempCtx = tempCanvas.getContext("2d");

	// Set font and calculate message dimensions
	tempCtx.font = '14px "gg sans"';
	const lines = wrapText(tempCtx, content, MAX_WIDTH);
	const contentHeight = lines.length * LINE_HEIGHT;

	// Calculate dynamic width and height
	tempCtx.font = 'bold 16px "Whitney, Medium"';
	const usernameWidth = tempCtx.measureText(username).width;

	tempCtx.font = '12px "gg sans"';
	const timestampWidth = tempCtx.measureText(formatTimestamp(timestamp)).width;

	const textWidth = Math.min(
		MAX_WIDTH,
		Math.max(...lines.map((line) => tempCtx.measureText(line).width)),
	);
	const dynamicWidth = Math.max(
		AVATAR_SIZE + PADDING * 3 + textWidth,
		AVATAR_SIZE + PADDING * 3 + usernameWidth + timestampWidth + 8,
	);
	const dynamicHeight = PADDING * 2 + AVATAR_SIZE + contentHeight;

	// Create the main canvas with dynamic dimensions
	const canvas = createCanvas(dynamicWidth, dynamicHeight);
	const ctx = canvas.getContext("2d");

	// Fill the background
	ctx.fillStyle = "#36393F";
	ctx.fillRect(0, 0, dynamicWidth, dynamicHeight);

	// Load and draw the avatar
	const avatar = await loadImg(avatarUrl);
	ctx.save();
	ctx.beginPath();
	ctx.arc(
		PADDING + AVATAR_SIZE / 2,
		PADDING + AVATAR_SIZE / 2,
		AVATAR_SIZE / 2,
		0,
		Math.PI * 2,
	);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar, PADDING, PADDING, AVATAR_SIZE, AVATAR_SIZE);
	ctx.restore();

	// Draw the username
	ctx.fillStyle = "#FFFFFF";
	ctx.font = 'bold 16px "Whitney, Medium"';
	ctx.fillText(username, PADDING * 2 + AVATAR_SIZE, PADDING + 18);

	// Draw the timestamp right after the username
	ctx.fillStyle = "#72767D";
	ctx.font = '12px "gg sans"';
	const formattedTimestamp = formatTimestamp(timestamp);

	// Adjust timestamp position to appear right after username
	const timestampX = PADDING * 2 + AVATAR_SIZE + usernameWidth + 10;
	ctx.fillText(formattedTimestamp, timestampX, PADDING + 18);

	// Draw the message content
	ctx.fillStyle = "#DCDDDE";
	ctx.font = '14px "gg sans"';
	const textX = PADDING * 2 + AVATAR_SIZE;
	const textY = PADDING + 38;
	lines.forEach((line, index) => {
		ctx.fillText(line, textX, textY + index * LINE_HEIGHT);
	});

	return canvas;
}

// Utility function to wrap text based on the max width
function wrapText(
	ctx: SKRSContext2D,
	text: string,
	maxWidth: number,
): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	words.forEach((word) => {
		const testLine = currentLine + word + " ";
		const metrics = ctx.measureText(testLine);
		if (metrics.width > maxWidth && currentLine.length > 0) {
			lines.push(currentLine);
			currentLine = word + " ";
		} else {
			currentLine = testLine;
		}
	});
	if (currentLine) {
		lines.push(currentLine);
	}
	return lines;
}

export default {
	name: "sigma",
	description: "yessir",
	type: ApplicationCommandType.Message,
	disabled: commandHandler.prodMode,
	context: "all",
	execute: async ({ targetMessage }: MessageContextMenuCommandInteraction) => {
		if (!targetMessage)
			return {
				content: "Please select a message to quote.",
				ephemeral: true,
			};
		const canvas = await drawDiscordMessage({
			avatarUrl: targetMessage.author.displayAvatarURL({ size: 1024 }),
			username: targetMessage.author.username,
			timestamp: targetMessage.createdAt,
			content: targetMessage.cleanContent,
		});
		return {
			files: [
				{
					attachment: canvas.toBuffer("image/png"),
					name: "VOT-quoteGS.png",
				},
			],
		};
	},
} as IContextCommand;
