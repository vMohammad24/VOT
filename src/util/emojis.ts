import { file } from "bun";
import { ApplicationEmoji } from "discord.js";
import { join } from 'path';
import sharp from "sharp";
import commandHandler from "..";

const emojis = new Map<string, ApplicationEmoji>();


export function getEmoji(name: string) {
    return emojis.get(name)!;
}

export async function initEmojis() {
    const { client, logger } = commandHandler;
    logger.info('Initializing emojis');
    const emojiFolder = join(import.meta.dirname, '..', '..', 'assets', 'emojis');
    const glob = new Bun.Glob('*.{png,jpg,jpeg,gif,svg}');
    const gEmojis = await glob.scanSync({ cwd: emojiFolder, absolute: true });
    const ems = (await client.application?.emojis.fetch());
    for await (const emojiPath of gEmojis) {
        const emojiName = emojiPath.split('/').pop()!.split('.')[0];
        const existingEmoji = ems?.find(e => e.name === emojiName);
        if (existingEmoji) {
            logger.info(`Emoji ${emojiName} already exists with id ${existingEmoji.id}`);
            emojis.set(emojiName, existingEmoji);
        } else {
            const f = await file(emojiPath);;
            let emojiData = Buffer.from(await f.arrayBuffer());
            logger.info(`Creating emoji ${emojiName}`);
            if (f.type == 'image/svg+xml') {
                logger.info(`Converting SVG to PNG`);
                emojiData = await sharp(emojiData).png().resize(512, 512).toBuffer();
            }
            const emoji = await client.application?.emojis.create({
                attachment: emojiData,
                name: emojiName,
            });
            logger.info(`Initialized emoji ${emoji?.name} with id ${emoji?.id}`);
            emojis.set(emojiName, emoji!);
        }

    }
    logger.info('Finished initializing emojis');
}