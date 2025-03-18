import axios from "axios";
import UserAgent from "user-agents";
import { redis } from "..";

// Types



interface Usernames {
    id: string;
    username: string;
    available: boolean;
    pivot_id: string;
    changed_at: string;
    hidden: boolean;
}

interface Skins {
    id: string;
    hash: string;
    texture: string;
    slim: boolean;
    upvotes_monthly: number;
    upvotes_lifetime: number;
    views_lifetime: number;
    views_monthly: number;
    first_player_id: string;
    created_at: string;
    players_count: number;
    pivot_id: string;
    changed_at: string;
    hidden: boolean;
}

interface User {
    id: string;
    name: string;
    subscription: string;
}

interface Type {
    id: string;
    name: string;
    slug: string;
    url: string;
}

interface Capes {
    id: string;
    name: string;
    slug: string;
    hash: string;
    texture: string;
    upvotes_monthly: number;
    upvotes_lifetime: number;
    views_lifetime: number;
    views_monthly: number;
    cape_type_id: string;
    first_player_id: string;
    created_at: string;
    players_count: number;
    description: string;
    type: Type;
    pivot_id: string;
    changed_at: string;
    hidden: boolean;
}

interface Data {
    id: string;
    uuid: string;
    username: string;
    type: string;
    version: number;
    deleted: boolean;
    upvotes_lifetime: number;
    views_lifetime: number;
    user_id: string;
    location_id: string;
    claimed_at: string;
    created_at: string;
    skins_count: number;
    capes_count: number;
    bio: string;
    color: string;
    upvotes_monthly: number;
    views_monthly: number;
    usernames: Usernames[];
    skins: Skins[];
    user: User;
    socials: string[];
    location: string;
    capes: Capes[];
}

interface CraftyProfileResponse {
    success: boolean;
    data: Data;
}

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

    const uuidRegex = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function resolveToUUID(input: string): Promise<string | null> {
    if (isValidUUID(input)) {
        return input.replace(/-/g, '');
    }
    const response = await getUuidFromUsername(input);
    if (!response) return null;
    return response.uniqueId.replace(/-/g, '') || null;
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
        if (res.data.message) return null;
        return res.data;
    });
}

export async function getProfile(input: string): Promise<ProfileResponse | string> {
    const uuid = await resolveToUUID(input);
    if (!uuid) return 'Invalid username or UUID';
    return getCachedData(`profile:${uuid}`, 3600, async () => {
        const res = await axios.get(`https://laby.net/api/v3/user/${uuid}/profile`);
        if (res.data.error) return res.data.error as string;
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

const ua = new UserAgent();
export async function getCraftyProfile(input: string): Promise<CraftyProfileResponse | string> {
    const url = `https://api.crafty.gg/api/v2/players/${input}`;
    return getCachedData(`crafty:${input}`, 300, async () => {
        const res = await axios.get(url, {
            headers: {
                "User-Agent": ua.random().toString()
            }
        });
        if (!res.data.success) return res.data.message || 'An error occurred';
        return res.data;
    });
}