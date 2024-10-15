import axios from 'axios';
import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from 'discord.js';
import sharp from 'sharp';
import type ICommand from '../../handler/interfaces/ICommand';
async function compressImage(inputBuffer: Buffer, maxSizeBytes = 512 * 1024): Promise<Buffer> {
	let { width, height } = await sharp(inputBuffer).metadata();
	if (inputBuffer.length <= maxSizeBytes && width! < 320 && height! < 320) return inputBuffer;
	if (width! > 320) {
		inputBuffer = await sharp(inputBuffer).resize({ width: 319 }).toBuffer();
	}
	if (height! > 320) {
		inputBuffer = await sharp(inputBuffer).resize({ height: 319 }).toBuffer();
	}
	let quality = 80; // Starting quality
	let buffer = await sharp(inputBuffer).png({ quality }).toBuffer();

	// Reduce quality until the image size is within the desired limit
	while (buffer.length > maxSizeBytes && quality > 10) {
		quality -= 10;
		buffer = await sharp(inputBuffer).png({ quality }).toBuffer();
	}

	// If reducing quality didn't work, resize the image
	while (buffer.length > maxSizeBytes && width! > 10 && height! > 10) {
		width = Math.round(width! * 0.9);
		height = Math.round(height! * 0.9);
		buffer = await sharp(inputBuffer).resize(width, height).png({ quality }).toBuffer();
	}

	return buffer;
}

function findChunk(buffer: Buffer, type: string): Buffer {
	let offset = 8;

	while (offset < buffer.length) {
		const chunkLength = buffer.readUInt32BE(offset);
		const chunkType = buffer.subarray(offset + 4, offset + 8).toString('ascii');

		if (chunkType === type) {
			return buffer.subarray(offset, offset + chunkLength + 12);
		}

		offset += 4 + 4 + chunkLength + 4;
	}

	throw new Error(`Chunk "${type}" not found`);
}

export default {
	name: 'add',
	description: 'Add a sticker/emoji to the guild',
	options: [
		{
			name: 'type',
			description: 'choose between stickers or emojis',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{
					name: 'Stickers',
					value: 'stickers',
				},
				{
					name: 'Emojis',
					value: 'emojis',
				},
			],
		},
		{
			name: 'file',
			description: 'file of the sticker/emoji',
			type: ApplicationCommandOptionType.Attachment,
			required: true,
		},
		{
			name: 'name',
			description: 'name of the sticker/emoji',
			type: ApplicationCommandOptionType.String,
			required: false,
			minLength: 2,
			maxLength: 32,
		},
	],
	perms: ['ManageEmojisAndStickers'],
	execute: async ({ args, interaction, guild, member }) => {
		const type = args.get('type') as string | undefined;
		const file = args.get('file') as Attachment | undefined;
		if (!file) {
			return {
				content: 'No file provided',
				ephemeral: true,
			};
		}
		if (!file.contentType?.startsWith('image')) {
			return {
				content: 'File must be an image',
				ephemeral: true,
			};
		}
		const name = (args.get('name') || file.name.trim().replace(/\.[^/.]+$/, '')) as string;

		const embed = new EmbedBuilder();
		let oFile: Buffer = (
			await axios.get(file.url, {
				responseType: 'arraybuffer',
			})
		).data;
		await interaction?.deferReply();
		if (!file.contentType.endsWith('gif')) {
			oFile = await compressImage(oFile);
		} else {
			// TODO: Implement gif support
			return {
				ephemeral: true,
				content: 'Gif support is not implemented yet',
			};
			// const apng = await compressGif(oFile);
			// if (typeof apng === 'string')
			// 	return {
			// 		ephemeral: true,
			// 		content: 'Error compressing gif, please try again later',
			// 	};
			// oFile = apng;
		}
		let content: string = '';
		switch (type) {
			case 'stickers':
				embed.setTitle('Stickers');
				try {
					const sticker = await guild.stickers.create({
						file: oFile,
						name,
						tags: name,
					});
					embed.setDescription('Sticker added successfully');
					content = sticker.url;
				} catch (err) {
					embed.setColor('Red');
					embed.setDescription('Failed to add sticker (' + (err as any).message + ')');
				}
				break;
			case 'emojis':
				embed.setTitle('Emojis');
				try {
					const emoji = await guild.emojis.create({
						attachment: oFile,
						name,
						reason: `Added by ${member.user.username} (${member.user.id})`,
					});
					embed.setDescription('Emoji added successfully');
					content = emoji.url;
				} catch (err) {
					embed.setColor('Red');
					embed.setDescription('Failed to add emoji (' + (err as any).message + ')');
				}
				break;
			default:
				embed.setTitle('Invalid type');
				embed.setColor('Red');
				embed.setDescription('Type can either be stickers or emojis');
				break;
		}
		if (!embed.data.color) embed.setColor('Green');
		return {
			embeds: [embed],
			content,
			files: [oFile],
		};
	},
} as ICommand;
