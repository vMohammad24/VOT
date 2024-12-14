import axios from "axios";
import { redis } from "..";

// Types
interface UsernameResponse {
    uniqueId: string;
    username: string;
}

interface ProfileResponse {
    uuid: string;
    name: string;
    name_history: NameHistoryEntry[];
    textures: {
        SKIN?: TextureEntry[];
        CLOAK?: TextureEntry[];
    };
}

interface NameHistoryEntry {
    name: string;
    changed_at: string | null;
    accurate: boolean;
    last_seen_at?: string;
}

interface TextureEntry {
    type: string;
    image_hash: string;
    file_hash: string;
    first_seen_at: string;
    last_seen_at: string;
    slim_skin?: boolean;
    active?: boolean;
}

async function getCachedData<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
    key = `minecraft:${key}`;
    const cached = await redis.get(key);
    if (cached) {
        return JSON.parse(cached);
    }

    const data = await fetchFn();
    if (data) {
        await redis.setex(key, ttl, JSON.stringify(data));
    }
    return data;
}

function isValidUUID(uuid: string): boolean {
    // Check both formats: with and without hyphens
    const uuidRegex = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function resolveToUUID(input: string): Promise<string | null> {
    if (isValidUUID(input)) {
        return input.replace(/-/g, '');
    }
    const response = await getUuidFromUsername(input);
    return response?.uniqueId.replace(/-/g, '') || null;
}

export async function renderSkin3D(input: string, shadow: boolean = true) {
    try {
        return Buffer.from(await getCachedData(`skin3d:${input}:${shadow}`, 3600, async () => {
            const res = await axios.get(`https://skin.laby.net/api/render/skin/${input}.png?shadow=${shadow}`, {
                responseType: 'arraybuffer'
            });
            return res.status === 200 ? res.data : null;
        }));
    } catch (e) { return null }
}

export async function searchNames(name: string) {
    return getCachedData(`search:${name}`, 300, async () => {
        const res = await axios.get<{ results: { name: string, uuid: string, user_name: string }[] }>(
            `https://laby.net/api/search/names/${name}`
        );
        return res.data.results ?? [];
    });
}

export async function getHead(input: string) {
    const uuid = await resolveToUUID(input);
    if (!uuid) return null;
    return Buffer.from(await getCachedData(`head:${uuid}`, 3600, async () => {
        const res = await axios.get(`https://laby.net/texture/profile/head/${uuid}.png?size=8`, {
            responseType: 'arraybuffer'
        });
        return res.status === 200 ? res.data : null;
    }));
}

export async function getUuidFromUsername(username: string): Promise<UsernameResponse | null> {
    return getCachedData(`uuid:${username}`, 21600, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${username}/uniqueId`);
        return res.data;
    });
}

export async function getProfile(input: string): Promise<ProfileResponse | null> {
    const uuid = await resolveToUUID(input);
    if (!uuid) return null;
    return getCachedData(`profile:${uuid}`, 3600, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/profile`);
        return res.data;
    });
}

export async function getNameHistory(input: string): Promise<NameHistoryEntry[]> {
    const uuid = await resolveToUUID(input);
    if (!uuid) return [];
    return getCachedData(`names:${uuid}`, 21600, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/names`);
        return res.data;
    });
}

export async function getOnlineStatus(input: string) {
    const uuid = await resolveToUUID(input);
    if (!uuid) return null;
    return getCachedData(`online:${uuid}`, 60, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/online-status`);
        return res.data;
    });
}

export async function getGameStats(input: string) {
    const uuid = await resolveToUUID(input);
    if (!uuid) return null;
    return getCachedData(`stats:${uuid}`, 1800, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/game-stats`);
        return res.data;
    });
}

export async function getBadges(input: string) {
    const uuid = await resolveToUUID(input);
    if (!uuid) return null;
    return getCachedData(`badges:${uuid}`, 1800, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/badges`);
        return res.data;
    });
}

export async function searchSkins(params: {
    order?: 'trending_30d' | 'trending_7d' | 'trending_24h' | 'most_used' | 'latest';
    size?: number;
    offset?: number;
    page?: number;
}) {
    const key = `skins:${JSON.stringify(params)}`;
    return getCachedData(key, 300, async () => {
        const res = await axios.get('https://laby.net/api/v3/search/textures/skin', { params });
        return res.data.results;
    });
}

export async function getStatistics() {
    return getCachedData('statistics', 900, async () => {
        const res = await axios.get('https://laby.net/api/v3/statistics');
        return res.data;
    });
}