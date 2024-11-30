import axios from 'axios';
import { ApplicationCommandOptionType } from "discord.js";
import TurndownService from "turndown";
import commandHandler, { redis } from '../..';
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from '../../util/VOTEmbed';


interface HighlightResult {
    value: string;
    matchLevel: string;
    fullyHighlighted: boolean;
    matchedWords: string[];
}

interface SearchResult {
    id: number;
    type: string;
    objectID: string;
    _highlightResult: {
        name: HighlightResult;
    };
}


async function createIndex() {
    try {
        const indexExists = await redis.call('FT._LIST');
        const indexNames = indexExists as string[];

        if (!indexNames.includes('games_index')) {
            // If the index doesn't exist, create it
            await redis.call('FT.CREATE', 'games_index', 'SCHEMA', 'appid', 'NUMERIC', 'name', 'TEXT');
            commandHandler.logger.info('Index created successfully.');
        } else {
            commandHandler.logger.info('Index already exists, skipping creation.');
        }
    } catch (err) {
        commandHandler.logger.error(err, 'Error creating index:');
    }
}

async function indexGames() {
    const url = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
    await createIndex();
    const response = await axios.get(url);
    const games = response.data.applist.apps as GameData[];

    await Promise.all(games.map(async (game) => {
        const { appid, name } = game;
        const exists = await redis.exists(`game:${appid}`);
        if (!exists) {
            await redis.hmset(`game:${appid}`, 'appid', appid, 'name', name);
        }
    }));
    commandHandler.logger.info('Games indexed into Redis successfully.');
}

interface GameData {
    appid: string;
    name: string;
}
indexGames();
// Function to perform fuzzy search on indexed games
async function searchGames(query: string) {
    try {
        // Use FT.SEARCH for full-text search. Wrap the query with '%' for fuzzy matching.
        const results: Array<string | number> = await redis.call(
            'FT.SEARCH',
            'games_index',
            query.replace(/[\|\-\*\%\(\)]/g, ''),
            'LIMIT',
            '0',
            '10'
        ) as Array<string | number>;

        const matches = results.slice(1);
        const gameData: GameData[] = [];

        for (let i = 0; i < matches.length; i += 2) {
            const appid = matches[i].toString().split(':')[1];
            const fields = matches[i + 1] as unknown as string[];
            const nameIndex = fields.indexOf('name');
            const name = nameIndex !== -1 ? fields[nameIndex + 1] : 'Unknown';
            gameData.push({ appid, name });
        }

        return gameData;
    } catch (err) {
        console.error('Error performing search:', err);
    }
}

async function search(query: string) {
    const response = await axios.post(
        'https://94he6yatei-dsn.algolia.net/1/indexes/all_names/query?x-algolia-agent=SteamDB%20Autocompletion',
        {
            hitsPerPage: 20,
            attributesToSnippet: null,
            attributesToHighlight: 'name',
            attributesToRetrieve: 'type,id,lastUpdated,small_capsule',
            query: query
        },
        {
            headers: {
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9,ar-JO;q=0.8,ar;q=0.7',
                'content-type': 'text/plain;charset=UTF-8',
                'sec-ch-ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'x-algolia-api-key': 'OTdiYzdhZTRjMmRhOWQ4M2Q5MDgzYTI4YmIxMDE0MmZjM2E0MDk4NTA1NmUxNzJlOWJkNTE1OWVhZjU3ODc3OHZhbGlkVW50aWw9MTczMzU2ODk0NiZ1c2VyVG9rZW49ODM0YjhlMjkyODQ4Njk3ZTJkMmY3YjFkZWU5NTgxN2Y=',
                'x-algolia-application-id': '94HE6YATEI',
                'Referer': 'https://steamdb.info/',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
        }
    );

    return response.data.hits as SearchResult[];
}

async function getAppDetails(appId: string) {
    const response = await axios.get(`https://steamdb.info/api/ExtensionApp/?appid=${appId}`, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'SteamDB'
        }
    });
    return response.data;
}

async function getGameInfo(appId: number) {
    const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    const data = response.data[appId].data;
    // console.log(appId, response.data)
    if (!data) return null;
    return {
        name: data.name,
        description: turndown.turndown(data.detailed_description),
        about: turndown.turndown(data.about_the_game),
        short_description: turndown.turndown(data.short_description),
        headerImage: data.header_image,
        price: data.price_overview ? data.price_overview.final_formatted : 'Free',
        platforms: Object.keys(data.platforms).filter(platform => data.platforms[platform as keyof typeof data.platforms] === true),
        developers: data.developers,
        publishers: data.publishers,
        releaseDate: data.release_date.date,
        genres: data.genres.map((genre: any) => genre.description),
        screenshots: data.screenshots.map((screenshot: any) => screenshot.path_full),
        movies: (data.movies || []).map((movie: any) => movie.webm.max),
        achievements: data.achievements ? data.achievements.highlighted.map((achievement: any) => ({
            name: achievement.name,
            path: achievement.path
        })) : []
    };
}

const turndown = new TurndownService();
export default {
    description: "Search for a game on Steam",
    aliases: ["game", 'games'],
    options: [{
        type: ApplicationCommandOptionType.String,
        description: "The game you want to search for",
        name: "game",
        required: true,
        autocomplete: true
    }],
    init: async (handler) => {
        handler.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isAutocomplete()) return;
            if (interaction.commandName !== 'steam') return;
            const game = interaction.options.getString('game');
            if (!game) return interaction.respond([{ name: 'Please provide a game to search for', value: '' }]);
            const response = await searchGames(game);
            if (!response) return interaction.respond([{ name: 'No games found', value: '' }]);
            // console.log(response)
            await interaction.respond(response.map((hit) => ({ name: hit.name, value: hit.appid.toString() })));
        })
    },
    execute: async ({ args, channel }) => {
        let query = args.get('game')
        if (!query) return {
            content: 'Please provide a game to search for',
            ephemeral: true
        };
        if (isNaN(Number(query))) {
            const results = await searchGames(query);
            if (!results || results.length === 0) {
                return {
                    content: 'No games found with that name',
                    ephemeral: true
                }
            }
            query = results[0].appid;
        }
        const [game] = await Promise.all([
            getGameInfo(query),
        ])
        if (!game) {
            return {
                content: 'Game not found',
                ephemeral: true
            }
        }
        const embed = await new VOTEmbed().setTitle(game.name ?? "N/A")
            .setDescription(game.short_description ?? "N/A")
            .addFields(
                { name: 'Developers', value: game.developers.join(', ') ?? "N/A", inline: true },
                { name: 'Publishers', value: game.publishers.join(', ') ?? "N/A", inline: true },
                { name: 'Genres', value: game.genres.join(', ') ?? "N/A", inline: true },
                { name: 'Platforms', value: game.platforms.join(', ') ?? "N/A", inline: true },
                { name: 'Release Date', value: game.releaseDate ?? "N/A", inline: true },
            )
            .setImage(game.headerImage ?? null)
            .dominant()

        // if (prices) {
        //     embed.addFields(
        //         { name: 'Price', value: prices.currentPrice ?? "N/A", inline: true },
        //         { name: 'Lowest Discount', value: prices.lowestRecordedPrice ?? "N/A", inline: true },
        //     );
        // }

        return {
            embeds: [embed]
        }
    }
} as ICommand