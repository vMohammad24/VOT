import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
    name: 'yoink',
    description: 'Yoinks emojis from a message and adds them to the guild',
    options: [
        {
            name: 'emojis',
            description: 'The emojis to yoink',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    perms: ['ManageEmojisAndStickers'],
    aliases: ['yoinkemoji', 'stealemoji', 'steal'],
    execute: async ({ args, interaction, guild, member }) => {
        await interaction?.deferReply();
        const text = args.get('emojis') as string | undefined;
        if (!text) {
            return {
                content: 'No emojis provided',
                ephemeral: true,
            };
        }
        const emojiMatches = text.match(/<a?:\w+:(\d+)>/g);
        if (!emojiMatches) {
            return {
                content: 'No valid emojis found',
                ephemeral: true,
            };
        }

        const results = [];
        for (const emoji of emojiMatches) {
            const id = emoji.match(/<a?:\w+:(\d+)>/)?.[1];
            const name = emoji.match(/<a?:\w+:(\d+)>/)?.[0].split(':')[1];
            const url = `https://cdn.discordapp.com/emojis/${id}.png`;
            try {
                const e = await guild.emojis.create({
                    attachment: url,
                    name: name ?? 'yoinked_' + id,
                    reason: `Yoinked by ${member.user.tag}`,
                });
                results.push(e.toString());
            } catch (e) {
                if ((e as any).message.includes('Maximum number of emojis reached')) {
                    return {
                        content: 'Maximum number of emojis reached',
                        ephemeral: true,
                    };
                }
            }
        }

        return {
            content: `Successfully yoinked emojis: ${results.join(', ')}`,
        };
    },
} as ICommand;
