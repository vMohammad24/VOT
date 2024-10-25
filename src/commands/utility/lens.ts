import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { getEmoji } from '../../util/emojis';
import { GoogleLens } from '../../util/lens';
import { pagination, PaginationPage } from '../../util/pagination';
import { isNullish } from '../../util/util';

export default {
    description: 'Search an image using google lens',
    category: 'misc',
    aliases: ['googlelens', 'imagesearch'],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'image_url',
            description: 'The image url you want to search for',
            required: false,
        },
        {
            type: ApplicationCommandOptionType.Attachment,
            name: 'image',
            description: 'The image you want to search for',
            required: false,
        }
    ],
    type: 'all',
    execute: async ({ args, interaction, message, handler: { client } }) => {
        const query = args.get('image_url') || args.get('image')?.url;
        if (!query) return { ephemeral: true, content: 'Please provide an image to search for' };
        const lens = new GoogleLens();
        const result = await lens.searchByUrl(query)
        const filteredResults = result.similar.filter((item: { pageURL: any; sourceWebsite: any; thumbnail: any; }) => item.pageURL && item.sourceWebsite && item.thumbnail);
        const mappedResults: PaginationPage[] = filteredResults.splice(0, 24).map((item: { sourceWebsite: string; title: string; pageURL: string | null; thumbnail: string | null; }) => {
            let emojiName = item.sourceWebsite.toLowerCase().split(' ')[0].trim();
            if (emojiName === 'x') emojiName = 'twitter';
            const emoji = !isNullish(emojiName) ? getEmoji(emojiName).toString() || '🔍' : '🔍';
            return {
                name: item.sourceWebsite.substring(0, 99) || 'No source',
                description: item.title.substring(0, 99) || 'No title',
                emoji,
                page: {
                    embeds: [new EmbedBuilder()
                        .setTitle(item.sourceWebsite || 'No source')
                        .setDescription(item.title || 'No title')
                        .setURL(item.pageURL)
                        .setImage(item.thumbnail)],
                    content: `Found ${filteredResults.length + 1} similar images`
                }
            }
        });
        if (mappedResults.length > 0) await pagination({
            interaction,
            message,
            pages: mappedResults,
            type: 'select',
            name: 'Select an image',
        }); else
            return { content: 'No results found', ephemeral: true };
    },
} as ICommand;
