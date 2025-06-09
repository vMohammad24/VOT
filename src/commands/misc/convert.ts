import axios from "axios";
import { ApplicationCommandOptionType, type Attachment } from "discord.js";
import sharp from "sharp";
import type ICommand from "../../handler/interfaces/ICommand";
const choices = ["png", "jpg", "webp", "gif"];
export default {
	description: "Convert files",
	options: [
		{
			name: "file",
			description: "The file you want to convert",
			type: ApplicationCommandOptionType.Attachment,
			required: false,
		},
		{
			name: "format",
			description: "The format you want to convert to",
			type: ApplicationCommandOptionType.String,
			choices: choices.map((choice) => ({ name: choice, value: choice })),
			required: false,
		},
	],
	type: "all",
	cooldown: 10000,
	aliases: ["gif"],
	execute: async ({ args, message }) => {
		let attachment = args.get("file") as Attachment | undefined;
		const format = (args.get("format") as string | undefined) || "gif";
		if (!attachment) {
			if (message?.reference) {
				const m = await message.fetchReference();
				if (!m)
					return {
						ephemeral: true,
						content: "Please provide a file to convert.",
					};
				if (m.attachments.size > 0) {
					attachment = m.attachments.first()!;
				}
			}
		}
		if (!attachment)
			return { ephemeral: true, content: "Please provide a file to convert." };
		if (!choices.includes(format))
			return { ephemeral: true, content: "Invalid format" };
		let file = Buffer.from(
			await axios
				.get(attachment.url, { responseType: "arraybuffer" })
				.then((res) => res.data),
		);
		const fileName = attachment.name.split(".")[0];
		switch (format) {
			case "png":
				file = await sharp(file).toFormat("png").toBuffer();
				break;
			case "jpg":
				file = await sharp(file).toFormat("jpeg").toBuffer();
				break;
			case "webp":
				file = await sharp(file).toFormat("webp").toBuffer();
				break;
			case "gif":
				file = await sharp(file).toFormat("gif").toBuffer();
				break;
			default:
				return {
					ephemeral: true,
					content: "Invalid format",
				};
		}
		return {
			files: [
				{
					attachment: file,
					name: `VOT_CONVERTED_${fileName}.${format}`,
				},
			],
		};
	},
} as ICommand;
