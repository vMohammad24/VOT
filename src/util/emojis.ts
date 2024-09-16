import { file } from "bun";
import { ApplicationEmoji } from "discord.js";
import { join } from 'path';
import commandHandler from "..";

export const emojis = new Map<string, ApplicationEmoji>();

export async function initEmojis() {
    const { client, logger } = commandHandler;
    logger.info('Initializing emojis');
    const emojiFolder = join(import.meta.dirname, '..', '..', 'assets', 'emojis');
    const glob = new Bun.Glob('*.{png,jpg,jpeg,gif}');
    const gEmojis = await glob.scanSync({ cwd: emojiFolder, absolute: true });
    const ems = (await client.application?.emojis.fetch());
    for await (const emojiPath of gEmojis) {
        const emojiName = emojiPath.split('/').pop()!.split('.')[0];
        const existingEmoji = ems?.find(e => e.name === emojiName);
        if (existingEmoji) {
            logger.info(`Emoji ${emojiName} already exists with id ${existingEmoji.id}`);
            emojis.set(emojiName, existingEmoji);
        } else {
            const emojiData = Buffer.from(await file(emojiPath).arrayBuffer());
            logger.info(`Creating emoji ${emojiName}`);
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