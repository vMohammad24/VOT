import axios from "axios";

interface BeatmapUploader {
    id: number;
    name: string;
    hash: string;
    admin: boolean;
    avatar: string;
    curator: boolean;
    playlistUrl: string;
    seniorCurator: boolean;
    type: string;
}

interface BeatmapVersion {
    hash: string;
    key: string;
    state: string;
    coverURL: string;
    createdAt: string;
    diffs: Array<{
        njs: number;
        offset: number;
        notes: number;
        bombs: number;
        obstacles: number;
        nps: number;
        length: number;
    }>;
    downloadURL: string;
    previewURL: string;
    sageScore: number;
}

interface BeatmapStats {
    plays: number;
    downloads: number;
    upvotes: number;
    downvotes: number;
    score: number;
    reviews: number;
    sentiment: string;
}

interface BeatmapMetadata {
    bpm: number;
    duration: number;
    songName: string;
    songSubName: string;
    songAuthorName: string;
    levelAuthorName: string;
}

interface Beatmap {
    id: string;
    name: string;
    automapper: boolean;
    blQualified: boolean;
    blRanked: boolean;
    bookmarked: boolean;
    createdAt: string;
    declaredAi: string;
    description: string;
    lastPublishedAt: string;
    metadata: BeatmapMetadata;
    qualified: boolean;
    ranked: boolean;
    stats: BeatmapStats;
    updatedAt: string;
    uploaded: string;
    uploader: BeatmapUploader;
    versions: BeatmapVersion[];
}


export async function searchSaver(query: string, sorting: "Rating" | "Latest" | "Relevance" | "Curated") {
    const res = await axios.get(`https://beatsaver.com/api/search/text/0?sortOrder=${sorting}&q=${encodeURIComponent(query)}`)
    if (res.status !== 200) return `Error fetching data from beatsaver: ${res.statusText}`
    return res.data.docs as Beatmap[]
}