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
            type: "chatllm";
            key: string;
            query: string;
            summary_og: string;
            nonce: string;
            trigger: boolean;
            possible: boolean;
            context: any[];
            entity_infobox_url: string | undefined;
            feature_callbacks: {
                bo_callback_lazy_load: string;
                bo_callback_show_more: string;
                bo_callback_copy_to_clipboard: string;
                bo_callback_share_link: string;
            };
            conversation: string;
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


interface BraveSearchImages {
    type: string;
    data: {
        body: {
            key: number;
            mixerTime: number;
            badResults: undefined | null;
            response: {
                type: string;
                query: {
                    original: string;
                    show_strict_warning: boolean;
                    altered: null;
                    potential_alteration: null;
                    search_operators: null;
                    safesearch: null;
                    is_geolocal: null;
                    local_decision: null;
                    spellcheck_off: boolean;
                    country: null;
                    bad_results: boolean;
                    lat: null;
                    long: null;
                    localQueryType: undefined | null;
                    postal_code: null;
                    city: null;
                    header_country: null;
                    more_results_available: null;
                    state: null;
                    location_label: null;
                    user_location_label: null;
                    related_queries: any[];
                    related_queries_autocomplete_like: boolean;
                    bo_summary_key: undefined | null;
                    bo_altered_diff: any[];
                };
                results: {
                    title: string;
                    url: string;
                    is_source_local: boolean;
                    is_source_both: boolean;
                    full_title: string | null;
                    description: string;
                    page_age: number | null;
                    page_fetched: string;
                    profile: string | null;
                    language: string | null;
                    family_friendly: boolean;
                    bo_debug: object;
                    source: string;
                    thumbnail: {
                        src: string;
                        alt: string | null;
                        height: number | null;
                        width: number | null;
                        bg_color: string | null;
                        original: string;
                        logo: string | null;
                        click_url: string | null;
                        duplicated: boolean | null;
                        theme: string | null;
                        is_tripadvisor: boolean;
                    };
                    properties: {
                        url: string;
                        resized: string;
                        placeholder: string;
                        height: number | null;
                        width: number | null;
                        format: string | null;
                        content_size: string | null;
                    };
                    meta_url: {
                        scheme: string;
                        netloc: string;
                        hostname: string;
                        favicon: string;
                        path: string;
                    };
                    from_context: boolean;
                }[];
            };
        };
        status: number;
        page: string;
        searchPage: string;
        title: string;
    };
    uses: {
        search_params: string[];
        route: number;
        url: number;
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


interface BraveEnrichments {
    raw_response: string;
    references: any[];
    urls: string[];
    images: {
        src: string;
        text: string;
        page_url: string;
        query_text: string;
        click_url: string | null;
    }[];
    qa: {
        answer: string;
        score: number;
        highlight: object | null;
        href: string | null;
    }[];
    entities: any[];
    main_entity: string | null;
    main_entity_infobox: any | null;
    predicate: any | null;
    context: any[];
    context_urls: string[];
    context_results: {
        url: string;
        title: string;
        hostname: string;
        favicon: string;
    }[];
    followups?: string[];
}


interface BraveSearchGoggles {
    type: string
    data: {
        body: {
            key: number
            mixerTime: number
            clusterResultsMin: number
            response: {
                query: {
                    original: string
                    show_strict_warning: boolean
                    spellcheck_off: boolean
                    country: string
                    bad_results: boolean
                    postal_code: string
                    city: string
                    header_country: string
                    more_results_available: boolean
                    state: string
                    related_queries: Array<Array<[boolean, string]>>
                    related_queries_autocomplete_like: boolean
                    bo_altered_diff: Array<any>
                }
                mixed: {
                    type: string
                    top: Array<any>
                    main: Array<{
                        all: boolean
                        index?: number
                        type: string
                    }>
                    side: Array<any>
                }
                web: {
                    type: string
                    results: Array<{
                        title: string
                        url: string
                        description: string
                        page_age?: string
                        profile: {
                            name: string
                            url: string
                            long_name: string
                            img: string
                        }
                        language: string
                        type: string
                        subtype: string
                        is_live: boolean
                        meta_url: {
                            scheme: string
                            netloc: string
                            hostname: string
                            favicon: string
                            path: string
                        }
                        thumbnail?: {
                            src: string
                            original: string
                            logo: boolean
                            is_tripadvisor: boolean
                            duplicated?: boolean
                        }
                        age?: string
                        descriptionLength: number
                        full_title?: string
                        video?: {
                            thumbnail: {
                                src: string
                                original: string
                                is_tripadvisor: boolean
                            }
                        }
                        article?: {
                            author: Array<{
                                type: string
                                name: string
                                url?: string
                            }>
                            date: string
                            publisher: {
                                type: string
                                name: string
                                thumbnail: {
                                    src: string
                                    original: string
                                    is_tripadvisor: boolean
                                }
                                url?: string
                            }
                            isAccessibleForFree?: boolean
                        }
                        organization?: {
                            type: string
                            name: string
                            contactPoints: Array<any>
                        }
                    }>
                    bo_left_right_divisive: boolean
                }
                videos: {
                    type: string
                    mutated_by_goggles: boolean
                    results: Array<{
                        title: string
                        url: string
                        meta_url: {
                            scheme: string
                            netloc: string
                            hostname: string
                            favicon: string
                            path: string
                        }
                        page_age?: string
                        description: string
                        thumbnail: {
                            src: string
                            original: string
                            is_tripadvisor: boolean
                        }
                        age?: string
                        video: {
                            thumbnail: {
                                src: string
                                original: string
                                is_tripadvisor: boolean
                            }
                        }
                    }>
                }
            }
            goggles: {
                result: any
            }
        }
        title: string
        page: string
        searchPage: string
        paid: boolean
        noResults: boolean
        tf: string
    }
    uses: {
        search_params: Array<string>
        route: number
        url: number
    }
}


const getQueryResult = async (query: string, type: 'images' | 'query' | 'goggles' = 'query', params?: string) => {
    switch (type) {
        case 'query':
            const cache = await redis.get(`brave:${query}`);
            if (cache && commandHandler.prodMode) return JSON.parse(cache);
            //(`https://search.brave.com/search?q=${encodeURIComponent(query)}?rich=true` + (params ?? ''))
            const res = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}&rich=true` + (params ?? ''));
            return res.data as string;
        case 'images':
            const imageCache = await redis.get(`braveImages:${query}`);
            if (imageCache && commandHandler.prodMode) return JSON.parse(imageCache);
            const imagesRes = await axios.get(`https://search.brave.com/images?q=${encodeURIComponent(query)}`);
            return imagesRes.data as string;
        case 'goggles':
            const gogglesCache = await redis.get(`braveGoggles:${query}`);
            if (gogglesCache && commandHandler.prodMode) return JSON.parse(gogglesCache);
            const gogglesRes = await axios.get(`https://search.brave.com/goggles?q=${encodeURIComponent(query)}`);
            return gogglesRes.data as string;

    }
}

export async function searchBrave(query: string, params?: string) {
    const data = await getQueryResult(query, 'query', params);
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


export async function searchBraveImages(query: string) {
    const data = await getQueryResult(query, 'images');
    if (typeof data == 'string') {
        const lookFor = 'const data = ';
        const index = data.indexOf(lookFor);
        const endIndex = data.indexOf('];', index);
        const end = data.substring(index + lookFor.length, endIndex + 1);
        const json = new Function(`"use strict";return ${end}`)()[1] as BraveSearchImages;
        await redis.set(`braveImages:${query}`, JSON.stringify(json), 'EX', 60 * 60);
        return json;
    } else {
        return data as BraveSearchImages;
    }
}

export async function searchBraveGoggles(query: string) {
    const data = await getQueryResult(query, 'goggles');
    if (typeof data == 'string') {
        const lookFor = 'const data = ';
        const index = data.indexOf(lookFor);
        const endIndex = data.indexOf('];', index);
        const end = data.substring(index + lookFor.length, endIndex + 1);
        const json = new Function(`"use strict";return ${end}`)()[1];
        await redis.set(`braveImages:${query}`, JSON.stringify(json), 'EX', 60 * 60);
        return json as BraveSearchGoggles;
    } else {
        return data as BraveSearchGoggles;
    }
}

export async function chatllm(result: BraveSearchResult['data']['body']['response']['chatllm']) {
    const cache = await redis.get(`braveChatllm:${result.query}`);
    if (cache && commandHandler.prodMode) return JSON.parse(cache) as BraveEnrichments;
    const res = await axios.get(`https://search.brave.com/api/chatllm/?key=${result.key}`);
    const enrichments = await axios.get(`https://search.brave.com/api/chatllm/enrichments?key=${result.key}`);
    const followUps = await axios.get(`https://search.brave.com/api/chatllm/followups?key=${result.key}`);
    enrichments.data.followups = followUps.data;
    await redis.set(`braveChatllm:${result.query}`, JSON.stringify(enrichments.data), 'EX', 60 * 60 * 24 * 7);
    return enrichments.data as BraveEnrichments;
}