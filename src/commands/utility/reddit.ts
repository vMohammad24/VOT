import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import TurnDownService from 'turndown';
import ICommand from '../../handler/interfaces/ICommand';
import { searchBrave } from '../../util/brave';
import { getEmoji } from '../../util/emojis';
import { pagination } from '../../util/pagination';

const turndownService = new TurnDownService();
export default {
    description: 'Searches reddit for a query',
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'query',
            description: 'The query you want to search for',
            required: true,
        },
    ],
    type: 'all',
    execute: async ({ args, interaction, message, handler: { client } }) => {
        const query = args.get('query') as string | undefined;
        if (!query) return { ephemeral: true, content: 'Please provide a query to search for' };
        interaction?.deferReply();
        const b = await searchBrave(query)
        // const result = b.data.body.response.infobox!.results[0];
        // console.log(`https://search.brave.com/api/chatllm/enrichments?key=${b.data.body.response.chatllm.results[0].key}`)
        if (!b.data.body.response.discussions) return { ephemeral: true, content: 'No results found' }
        const results = b.data.body.response.discussions.results
        if (results.length === 0) return { ephemeral: true, content: 'No results found' }
        await pagination({
            interaction,
            message,
            type: 'select',
            pages: results.slice(0, 25).map(result => {
                return {
                    page: {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(result.title)
                                .setDescription(turndownService.turndown(result.description.slice(0, 2048)))
                                .setURL(result.url)
                                .setColor('Random')
                                .setFooter({ text: `👍 ${result.data.score.split(' ')[0]} | 💬 ${result.data.num_answers}` })
                        ]
                    },
                    name: result.title.slice(0, 99),
                    description: result.data.forum_name.slice(0, 99),
                    emoji: getEmoji('reddit').toString() || '🔍',
                }
            }),
        })
    },
} as ICommand;
