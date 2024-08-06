import axios from 'axios';
import { crc32 } from 'crc';
import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from 'discord.js';
import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import type ICommand from '../../handler/interfaces/ICommand';
async function compressImage(inputBuffer: Buffer, maxSizeBytes = 512 * 1024): Promise<Buffer> {
	let { width, height } = await sharp(inputBuffer).metadata();
	console.log(width, height);
	if (inputBuffer.length <= maxSizeBytes && width! < 320 && height! < 320) return inputBuffer;
	console.log('compressing');
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

function convertToPNG(data: ParsedFrame): Buffer {
	const { pixels, dims, colorTable, transparentIndex } = data;

	const { width, height } = dims;
	const png = new PNG({ width, height });

	// Fill in the image data
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = pixels[y * width + x];
			const color = colorTable[index];

			if (index === transparentIndex) {
				png.data[(y * width + x) * 4 + 3] = 0; // Set alpha to 0 for transparency
			} else {
				png.data[(y * width + x) * 4 + 0] = color[0]; // Red
				png.data[(y * width + x) * 4 + 1] = color[1]; // Green
				png.data[(y * width + x) * 4 + 2] = color[2]; // Blue
				png.data[(y * width + x) * 4 + 3] = 255; // Alpha
			}
		}
	}

	return PNG.sync.write(png);
}

async function convertGifToPngs(frames: ParsedFrame[]): Promise<string | Buffer[]> {
	try {
		const bufferSize = (512 * 1024) / frames.length;
		const buffers: Buffer[] = [];
		for (const frame of frames) {
			const buffer = await convertToPNG(frame);
			const compressed = await compressImage(buffer, bufferSize);
			buffers.push(compressed);
		}
		return buffers;
	} catch (error) {
		return 'Error processing gif';
	}
}

async function compressGif(inputBuffer: Buffer): Promise<Buffer | string> {
	const gif = parseGIF(inputBuffer as any as ArrayBuffer);
	const gifFrames = decompressFrames(gif, true);
	const images = await convertGifToPngs(gifFrames);
	if (typeof images === 'string') return images;
	const actl = Buffer.alloc(20);
	actl.writeUInt32BE(8, 0); // length of chunk
	actl.write('acTL', 4); // type of chunk
	actl.writeUInt32BE(images.length, 8); // number of frames
	actl.writeUInt32BE(0, 12); // number of times to loop (0 - infinite)
	actl.writeUInt32BE(crc32(actl.slice(4, 16)), 16); // crc

	const frames: Buffer[] = images.map((data, idx) => {
		const ihdr = findChunk(data, 'IHDR');

		const fctl = Buffer.alloc(38);
		fctl.writeUInt32BE(26, 0); // length of chunk
		fctl.write('fcTL', 4); // type of chunk
		fctl.writeUInt32BE(idx ? idx * 2 - 1 : 0, 8); // sequence number
		fctl.writeUInt32BE(ihdr.readUInt32BE(8), 12); // width
		fctl.writeUInt32BE(ihdr.readUInt32BE(12), 16); // height
		fctl.writeUInt32BE(0, 20); // x offset
		fctl.writeUInt32BE(0, 24); // y offset
		fctl.writeUInt16BE(1, 28); // frame delay - fraction numerator
		fctl.writeUInt16BE(1, 30); // frame delay - fraction denominator
		fctl.writeUInt8(0, 32); // dispose mode
		fctl.writeUInt8(0, 33); // blend mode
		fctl.writeUInt32BE(crc32(fctl.subarray(4, 34)), 34); // crc

		const idat = findChunk(data, 'IDAT');

		// All IDAT chunks except first one are converted to fdAT chunks
		let fdat: Buffer;

		if (idx === 0) {
			fdat = idat;
		} else {
			const length = idat.length + 4;

			fdat = Buffer.alloc(length);

			fdat.writeUInt32BE(length - 12, 0); // length of chunk
			fdat.write('fdAT', 4); // type of chunk
			fdat.writeUInt32BE(idx * 2, 8); // sequence number
			idat.copy(fdat, 12, 8); // image data
			fdat.writeUInt32BE(crc32(fdat.slice(4, length - 4)), length - 4); // crc
		}

		return Buffer.concat([fctl, fdat]);
	});
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = findChunk(images[0], 'IHDR');
	const iend = Buffer.from('0000000049454e44ae426082', 'hex');

	return Buffer.concat([signature, ihdr, actl, ...frames, iend]);
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
		interaction?.deferReply();
		if (!file.contentType.endsWith('gif')) {
			oFile = await compressImage(oFile);
		} else {
			const apng = await compressGif(oFile);
			if (typeof apng === 'string')
				return {
					ephemeral: true,
					content: 'Error compressing gif, please try again later',
				};
			oFile = apng;
		}
		let content: string = '';
		switch (type) {
			case 'stickers':
				embed.setTitle('Stickers');
				try {
					const sticker = await guild.stickers.create({
						file: Buffer.from(oFile),
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
						attachment: Buffer.from(oFile),
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
