import axios from 'axios';
import { file, write } from 'bun';
import { ApplicationEmoji, Collection } from 'discord.js';
import { join } from 'path';
import sharp from 'sharp';
import commandHandler from '..';

const emojis = new Map<string, ApplicationEmoji>();

export function getEmoji(name: string) {
	if (commandHandler.verbose && !emojis.has(name)) {
		commandHandler.logger.warn(`Emoji ${name} not found`);
	}
	return emojis.get(name)!;
}

export async function addEmoji(emojiPath: string, ems: Collection<string, ApplicationEmoji> | undefined) {
	if (!ems) return;
	const { verbose, logger, client } = commandHandler;
	const emojiName = emojiPath.split('/').pop()!.split('.')[0];
	if (emojis.has(emojiName)) return emojis.get(emojiName)!;

	let emoji = ems?.find((e) => e.name === emojiName);
	try {
		if (emoji) {
			if (verbose) logger.info(`Emoji ${emojiName} already exists with id ${emoji.id}`);
			emojis.set(emojiName, emoji);
		} else {
			const f = await file(emojiPath);
			const dims = 128;
			let emojiData = Buffer.from(await f.arrayBuffer());
			logger.info(`Creating emoji ${emojiName}`);
			if (f.type == 'image/svg+xml') {
				if (verbose) logger.info(`Converting SVG to PNG`);
				const svg = (await f.text()).replace(
					'width="16" height="16" fill="currentColor"',
					`width="${dims}" height="${dims}" fill="white"`,
				);
				emojiData = await sharp(Buffer.from(svg)).png().resize(dims, dims).toBuffer();
			}
			emoji = await client.application?.emojis.create({
				attachment: emojiData,
				name: emojiName,
			})!;
			if (verbose) logger.info(`Initialized emoji ${emoji?.name} with id ${emoji?.id}`);
			emojis.set(emojiName, emoji);
		}
		return emoji;
	} catch (e) {
		return '';
	}
}

export async function initEmojis() {
	const { client, logger, verbose } = commandHandler;
	if (verbose) logger.info('Initializing emojis');
	const emojiFolder = join(import.meta.dirname, '..', '..', 'assets', 'emojis');
	const glob = new Bun.Glob('*.{png,jpg,jpeg,gif,svg}');
	const gEmojis = await glob.scanSync({ cwd: emojiFolder, absolute: true });
	const ems = await client.application?.emojis.fetch();
	const paths: string[] = [];
	for (const emojiPath of gEmojis) {
		paths.push(emojiPath);
	}
	const start = Date.now();
	await Promise.all(
		paths.map(async (emojiPath) => {
			await addEmoji(emojiPath, ems);
		}),
	);
	// check if a file was deleted and the emoji still exists
	emojis.forEach((emoji) => {
		const emojiFileExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
		const emojiExists = emojiFileExtensions.some((ext) => paths.includes(join(emojiFolder, `${emoji.name}.${ext}`)));
		if (!emojiExists) {
			if (verbose) logger.info(`Deleting emoji ${emoji.name}`);
			emoji.delete();
		}
	});
	logger.info('Finished initializing emojis, took ' + (Date.now() - start) + 'ms');
}

export async function addEmojiByURL(name: string, url: string, ems: Collection<string, ApplicationEmoji> | undefined) {
	const res = await axios.get(url, { responseType: 'arraybuffer' });
	const path = join(import.meta.dir, '..', '..', '..', 'assets', 'emojis', `${name}.png`);
	await write(path, res.data);
	const emoji = await addEmoji(path, ems);
	return emoji;
}
