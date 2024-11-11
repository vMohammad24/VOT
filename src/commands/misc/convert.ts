import axios from 'axios';
import { ApplicationCommandOptionType, Attachment } from 'discord.js';
import sharp from 'sharp';
import ICommand from '../../handler/interfaces/ICommand';
const choices = ['png', 'jpg', 'webp', 'gif'];
export default {
	description: 'Convert files',
	options: [
		{
			name: 'file',
			description: 'The file you want to convert',
			type: ApplicationCommandOptionType.Attachment,
			required: true,
		},
		{
			name: 'format',
			description: 'The format you want to convert to',
			type: ApplicationCommandOptionType.String,
			choices: choices.map((choice) => ({ name: choice, value: choice })),
		},
	],
	type: 'all',
	cooldown: 10000,
	execute: async ({ args }) => {
		const attachment = args.get('file') as Attachment | undefined;
		const format = (args.get('format') as string | undefined) || 'png';
		if (!attachment) return { ephemeral: true, content: 'Please provide a file to convert.' };
		if (!choices.includes(format)) return { ephemeral: true, content: 'Invalid format' };
		let file = Buffer.from(await axios.get(attachment.url, { responseType: 'arraybuffer' }).then((res) => res.data));
		const fileName = attachment.name.split('.')[0];
		switch (format) {
			case 'png':
				file = await sharp(file).toFormat('png').toBuffer();
				break;
			case 'jpg':
				file = await sharp(file).toFormat('jpeg').toBuffer();
				break;
			case 'webp':
				file = await sharp(file).toFormat('webp').toBuffer();
				break;
			case 'gif':
				file = await sharp(file).toFormat('gif').toBuffer();
				break;
			default:
				return {
					ephemeral: true,
					content: 'Invalid format',
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
