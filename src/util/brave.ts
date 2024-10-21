import axios from "axios";
import commandHandler, { redis } from "..";

interface BraveSearchBody {
    key: number;
    mixerTime: number;
    shouldFallback: boolean;
    clusterResultsMin: number;
    response: {
        query: {
            original: string;
            show_strict_warning: boolean;
            spellcheck_off: boolean;
            country: string;
            bad_results: boolean;
            postal_code: string;
            city: string;
            header_country: string;
            more_results_available: boolean;
            state: string;
            related_queries: Array<Array<[boolean, string]>>;
            related_queries_autocomplete_like: boolean;
            bo_altered_diff: any[];
        };
        mixed: {
            type: string;
            top: Array<{ all: boolean; index?: number; type: string }>;
            main: Array<{ all: boolean; index?: number; type: string }>;
            side: Array<{ all: boolean; index?: number; type: string }>;
        };
        web: {
            type: string;
            results: Array<{
                title: string;
                url: string;
                description: string;
                page_age?: string;
                profile: {
                    name: string;
                    url: string;
                    long_name: string;
                    img: string;
                };
                language: string;
                type: string;
                subtype: string;
                is_live: boolean;
                meta_url: {
                    scheme: string;
                    netloc: string;
                    hostname: string;
                    favicon: string;
                    path: string;
                };
                thumbnail: {
                    src: string;
                    original: string;
                    logo?: boolean;
                    duplicated?: boolean;
                    is_tripadvisor?: boolean;
                };
                age?: string;
                descriptionLength: number;
                video?: {
                    thumbnail: {
                        src: string;
                        original: string;
                        is_tripadvisor?: boolean;
                    };
                };
                article?: {
                    author: Array<{ type: string; name: string; url?: string }>;
                    date: string;
                    publisher: {
                        type: string;
                        name: string;
                        url: string;
                        thumbnail?: {
                            src: string;
                            original: string;
                            is_tripadvisor?: boolean;
                        };
                    };
                    isAccessibleForFree?: boolean;
                };
                faq?: {
                    items: Array<{
                        question: string;
                        answer: string;
                        title: string;
                        url: string;
                        meta_url: {
                            scheme: string;
                            netloc: string;
                            hostname: string;
                            favicon: string;
                            path: string;
                        };
                    }>;
                };
                organization?: {
                    type: string;
                    name: string;
                    contactPoints: any[];
                };
            }>;
            bo_left_right_divisive: boolean;
        };
        news: {
            type: string;
            mutated_by_goggles: boolean;
            results: Array<{
                title: string;
                url: string;
                description: string;
                age: string;
                meta_url: {
                    scheme: string;
                    netloc: string;
                    hostname: string;
                    favicon: string;
                    path: string;
                };
                is_live: boolean;
            }>;
        };
        videos: {
            type: string;
            mutated_by_goggles: boolean;
            results: Array<{
                title: string;
                url: string;
                meta_url: {
                    scheme: string;
                    netloc: string;
                    hostname: string;
                    favicon: string;
                    path: string;
                };
                page_age: string;
                description: string;
                thumbnail: {
                    src: string;
                    original: string;
                    is_tripadvisor?: boolean;
                };
                video: {
                    thumbnail: {
                        src: string;
                        original: string;
                        is_tripadvisor?: boolean;
                    };
                };
            }>;
        };
        infobox?: {
            type: "graph";
            results: {
                title: string;
                url: string;
                is_source_local: boolean;
                is_source_both: boolean;
                description: string;
                family_friendly: boolean;
                bo_debug: Record<string, unknown>;
                type: string;
                position: number;
                category: string;
                long_desc: string;
                attributes: [string, string][];
                profiles: {
                    name: string;
                    url: string;
                    long_name: string;
                    img: string;
                }[];
                website_url: string;
                attributes_shown: number;
                ratings: {
                    // Define the structure for ratings if available
                }[];
                providers: {
                    type: string;
                    name: string;
                    url: string;
                    img: string;
                }[];
                images: {
                    src: string;
                    alt: string;
                    original: string;
                    logo: boolean;
                    click_url: string;
                    is_tripadvisor: boolean;
                }[];
                subtype: string;
                chatllm: {
                    type: string;
                    key: string;
                    context: any[];
                    query: string;
                    bo_callback_lazy_load: string;
                    bo_callback_show_more: string;
                    bo_callback_copy_to_clipboard: string;
                    bo_callback_share_link: string;
                };
                summary_og: string;
                nonce: string;
            }[];
        };
        chatllm: {
            type: string;
            trigger: boolean;
            possible: boolean;
            summary_og: string;
            nonce: string;
            results: Array<{
                key: string;
                query: string;
                context: any[];
                bo_callback_lazy_load: string;
                bo_callback_show_more: string;
                bo_callback_copy_to_clipboard: string;
                bo_callback_share_link: string;
            }>;
        };
        discussions: {
            type: "search";
            mutated_by_goggles: boolean;
            bo_callback_show_more: string;
            results: {
                title: string;
                url: string;
                meta_url: {
                    scheme: string;
                    netloc: string;
                    hostname: string;
                    favicon: string;
                    path: string;
                };
                data: {
                    forum_name: string;
                    num_votes?: number;
                    num_answers: number;
                    score: string;
                    title: string;
                    top_comment?: string;
                    question?: string;
                };
                age: string;
                description: string;
            }[];
            summarizer?: any;
            locations?: any;
            recipes?: any;
            chatllm: {
                type: "chatllm";
                trigger: boolean;
                possible: boolean;
                summary_og: string;
                nonce: string;
                results: {
                    key: string;
                    query: string;
                    context: any[];
                    bo_callback_lazy_load: string;
                    bo_callback_show_more: string;
                    bo_callback_copy_to_clipboard: string;
                    bo_callback_share_link: string;
                }[];
                cached_conversation: {
                    query: string;
                    response: {
                        type: "token";
                        data: string;
                    }[];
                    followups: string[];
                    enrichments: {
                        references: any[];
                        urls: any[];
                        context_urls: {
                            url: string;
                            hostname: string;
                            title: string;
                            favicon: string;
                        }[];
                        images: {
                            src: string;
                            text: string;
                            page_url: string;
                            query_text: string;
                            click_url?: string;
                        }[];
                        qa: {
                            answer: string;
                            score: number;
                            highlight: {
                                start: number;
                                end: number;
                            };
                            href?: string;
                        }[];
                        entities: {
                            uuid: string;
                            name: string;
                            href: string;
                            instance_of: any[];
                            images: string[];
                            highlight: {
                                start: number;
                                end: number;
                            }[];
                        }[];
                        context_results: {
                            url: string;
                            hostname: string;
                            title: string;
                            favicon: string;
                        }[];
                    };
                    title: {
                        title: string;
                    };
                }[];
            };
        }
    };
}


interface BraveSearchResult {
    type: string;
    data: {
        body: BraveSearchBody;
        status: number;
        page: string;
        searchPage: string;
        title: string;
        paid: boolean;
        noResults: boolean;
        badResults?: boolean;
        disableChatLLM: boolean;
        suggestedGoggles: any[];
        showChatLLMPromo: boolean;
        tf: string;
    };
    uses: {
        search_params: string[];
        route: number;
        url: number;
    };
}

const getQueryResult = async (query: string) => {
    const cache = await redis.get(`brave:${query}`);
    if (cache && commandHandler.prodMode) return JSON.parse(cache);
    const res = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=llmSuggest&summary=1`);
    return res.data as string;
}

export async function searchBrave(query: string) {
    const data = await getQueryResult(query);
    if (typeof data == 'string') {
        const lookFor = 'const data = ';
        const index = data.indexOf(lookFor);
        const endIndex = data.indexOf('];', index);
        const end = data.substring(index + lookFor.length, endIndex + 1);
        const json = new Function(`"use strict";return ${end}`)()[1] as BraveSearchResult;
        await redis.set(`brave:${query}`, JSON.stringify(json), 'EX', 60 * 60);
        return json;
    } else {
        return data as BraveSearchResult;
    }
}