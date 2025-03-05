import axios from 'axios';
import { ApplicationCommandOptionType } from "discord.js";
import numeral from 'numeral';
import TurndownService from "turndown";
import commandHandler, { redis } from '../..';
import ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from '../../util/VOTEmbed';
import { capitalizeString, isNullish } from '../../util/util';

interface ProtonDBGame {
    bestReportedTier: string;
    confidence: string;
    score: number;
    tier: string;
    total: number;
    trendingTier: string;
}



async function getProtonDB(appId: number): Promise<ProtonDBGame | null> {
    const res = await axios.get(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`)
    if (res.status == 404) {
        return null;
    }
    return res.data;
}

async function searchSteamDB(query: string) {
    const apiKey = 'MzQ1ZjdkNzVjM2I0YjFkYmFlZDViYTgwNDY5MjNlNGY4NzY1NDEzNmIzMmY3YzIzZjVjYmQ2NjJlMzMxN2YxM3ZhbGlkVW50aWw9MTczMzU5MzI0MiZ1c2VyVG9rZW49YTQzOThiNGZiYzQwOTc1NDkzMGRhOTkyNDU3MjI4YTk='
    const response = await axios.request({
        method: 'POST',
        url: 'https://94he6yatei-dsn.algolia.net/1/indexes/*/queries',
        params: {
            'x-algolia-agent': 'Algolia for JavaScript (5.14.0); Lite (5.14.0); Browser; instantsearch.js (4.75.5); JS Helper (3.22.5)',
            'x-algolia-api-key': apiKey,
            'x-algolia-application-id': '94HE6YATEI'
        },
        headers: {
            'Accept-Language': 'en-US,en;q=0.9,ar-JO;q=0.8,ar;q=0.7',
            Connection: 'keep-alive',
            DNT: '1',
            Origin: 'https://steamdb.info',
            Referer: 'https://steamdb.info/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            accept: 'application/json',
            'content-type': 'text/plain',
            'sec-ch-ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        },
        data: {
            "requests": [
                {
                    "indexName": "steamdb",
                    "attributesToHighlight": [
                        "name"
                    ],
                    "attributesToRetrieve": [
                        "lastUpdated",
                        "small_capsule",
                        "name",
                        "oslist",
                        "price_us",
                        "releaseYear",
                        "userScore"
                    ],
                    "facets": [
                        "appType",
                        "categories",
                        "developer",
                        "followers",
                        "hardwareCategories",
                        "languages",
                        "languagesAudio",
                        "languagesSubtitles",
                        "multiplayerCategories",
                        "oslist",
                        "price_us",
                        "publisher",
                        "releaseYear",
                        "reviews",
                        "tags",
                        "technologies",
                        "userScore"
                    ],
                    // "highlightPostTag": "__/ais-highlight__",
                    // "highlightPreTag": "__ais-highlight__",
                    "hitsPerPage": 20,
                    "maxValuesPerFacet": 200,
                    "page": 0,
                    "query": query
                }
            ]
        }
    })
    try {
        return response.data.results[0].hits as {
            name: string;
            userScore: number;
            objectID: string;
        }[];
    } catch (e) { return null; }
}


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

async function getGameInfo(appId: number) {
    const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    const data = response.data[appId].data;
    // console.log(appId, response.data)
    if (!data) return null;
    return {
        name: isNullish(data.name) ? null : data.name,
        description: turndown.turndown(data.detailed_description),
        about: turndown.turndown(data.about_the_game),
        short_description: isNullish(data.short_description) ? null : turndown.turndown(data.short_description),
        headerImage: data.header_image,
        price: data.price_overview as {
            currency: string;
            initial: number;
            final: number;
            discount_percent: number;
            initial_formatted: string;
            final_formatted: string;
        } | null,
        platforms: Object.keys(data.platforms).filter(platform => data.platforms[platform as keyof typeof data.platforms] === true),
        developers: data.developers || [],
        publishers: data.publishers || [],
        releaseDate: data.release_date.date,
        genres: (data.genres || []).map((genre: any) => genre.description),
        screenshots: (data.screenshots || []).map((screenshot: any) => screenshot.path_full) as string[],
        movies: (data.movies || []).map((movie: any) => movie.webm.max),
        achievements: data.achievements ? {
            total: data.achievements.total as number,
            highlighted: data.achievements.highlighted.map((achievement: any) => ({
                name: achievement.name,
                path: achievement.path
            }))
        } : null,
        pc_requirements: data.pc_requirements as {
            minimum: string;
            recommended: string;
        } | null,
        recommendations: data.recommendations as {
            total: number;
        } | null,
        requiredAge: data.required_age,
        categories: data.categories.map((category: any) => category.description),
        rating: (data.ratings && data.ratings.pegi) ? data.ratings.pegi as {
            rating: string;
            descriptors: string;
            use_age_gate: string;
            required_age: string;
        } | null : null,
    };
}

const turndown = new TurndownService();
export default {
    description: "Search for a game on Steam",
    type: 'all',
    aliases: ["game", 'games'],
    options: [{
        type: ApplicationCommandOptionType.String,
        description: "The game you want to search for",
        name: "game",
        required: true,
        autocomplete: true
    }],
    autocomplete: async (interaction) => {
        const game = interaction.options.getString('game');
        if (!game) return interaction.respond([{ name: 'Please provide a game to search for', value: '' }]);
        const response = await searchGames(game);
        if (!response) return interaction.respond([{ name: 'No games found', value: '' }]);
        await interaction.respond(response/*.sort((a, b) => b.userScore - a.userScore)*/.map((hit) => ({ name: hit.name, value: hit.appid })));
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
        const [game, protonDB] = await Promise.all([
            getGameInfo(query),
            getProtonDB(Number(query))
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
                { name: 'Price', value: game.price?.discount_percent ? `~~${game.price.initial_formatted}~~ → ${game.price.final_formatted}` : game.price?.final_formatted ?? "N/A", inline: true },
                { name: 'Achievements', value: game.achievements ? game.achievements.total.toString() : 'N/A', inline: true },
                { name: 'Recommendations', value: game.recommendations ? numeral(game.recommendations.total).format('0,0') : 'N/A', inline: true },
                { name: 'Developers', value: game.developers.join(', ') ?? "N/A", inline: true },
                { name: 'Publishers', value: game.publishers.join(', ') ?? "N/A", inline: true },
                { name: 'Genres', value: game.genres.join(', ') ?? "N/A", inline: true },
                { name: 'Rating', value: game.rating ? `${game.rating.rating}+` : "N/A", inline: true },
                { name: 'Platforms', value: game.platforms.join(', ') ?? "N/A", inline: true },
                { name: 'Release Date', value: game.releaseDate ?? "N/A", inline: true },
            )
            .setImage(game.headerImage ?? null)
            .dominant()

        // if (game.pc_requirements) {
        //     embed.addFields(
        //         { name: 'Minimum Requirements', value: turndown.turndown(game.pc_requirements.minimum) ?? "N/A", inline: true },
        //         { name: 'Recommended Requirements', value: turndown.turndown(game.pc_requirements.recommended) ?? "N/A", inline: true },
        //     );
        // }
        // if (prices) {
        //     embed.addFields(
        //         { name: 'Price', value: prices.currentPrice ?? "N/A", inline: true },
        //         { name: 'Lowest Discount', value: prices.lowestRecordedPrice ?? "N/A", inline: true },
        //     );
        // }
        if (protonDB) {
            embed.addDescription(`\nReported by ${protonDB.total} users to work with ${protonDB.confidence} confidence and a score of ${protonDB.score * 100} (${capitalizeString(protonDB.tier)}) on ProtonDB`)
        }
        return {
            embeds: [embed],
        }
    }
} as ICommand