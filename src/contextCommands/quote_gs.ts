import {
	ApplicationCommandType,
	type MessageContextMenuCommandInteraction,
} from "discord.js";
import type { IContextCommand } from "../handler/interfaces/IContextCommand";
import { makeQuote } from "./quote";

export default {
	name: "Quote (Grayscale)",
	description: "Quote a message in grayscale",
	type: ApplicationCommandType.Message,
	context: "all",
	execute: async ({ targetMessage }: MessageContextMenuCommandInteraction) => {
		if (!targetMessage)
			return {
				content: "Please select a message to quote.",
				ephemeral: true,
			};
		const canvas = await makeQuote(
			targetMessage.cleanContent,
			targetMessage.author.username,
			targetMessage.author.displayAvatarURL({ size: 1024 }),
		);
		const ctx = canvas.getContext("2d");
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;

		for (let i = 0; i < data.length; i += 4) {
			const avg = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11; // Weighted grayscale formula
			data[i] = data[i + 1] = data[i + 2] = avg;
		}

		ctx.putImageData(imageData, 0, 0);

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
