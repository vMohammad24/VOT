import axios from 'axios';
import { redis } from "..";

const redisKey = 'statsfm';
const url = 'https://api.stats.fm/api/v1';

const axiosInstance = axios.create({
    baseURL: url,
    timeout: 10000,
});

async function getCached(key: string) {
    return await redis.get(`${redisKey}:${key}`);
}

async function setCached(key: string, value: string) {
    return await redis.set(`${redisKey}:${key}`, value, 'EX', 60);
}

async function fetchAndCache(endpoint: string, cacheKey: string) {
    const cachedData = await getCached(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const response = await axiosInstance.get(endpoint);
    await setCached(cacheKey, JSON.stringify(response.data));
    return response.data;
}

interface Album {
    id: number;
    image: string;
    name: string;
}

interface Artist {
    id: number;
    name: string;
    image: string;
}

interface ExternalIds {
    spotify: string[];
    appleMusic: string[];
}

interface Track {
    albums: Album[];
    artists: Artist[];
    durationMs: number;
    explicit: boolean;
    externalIds: ExternalIds;
    id: number;
    name: string;
    spotifyPopularity: number;
    spotifyPreview: string;
    appleMusicPreview: string;
}

interface CurrentStreamItem {
    date: string;
    isPlaying: boolean;
    progressMs: number;
    deviceName: string;
    track: Track;
    platform: 'SPOTIFY' | 'APPLE_MUSIC';
}

interface CurrentStreamResponse {
    item: CurrentStreamItem;
}

interface PrivacySettings {
    profile: boolean;
    currentlyPlaying: boolean;
    recentlyPlayed: boolean;
    topTracks: boolean;
    topArtists: boolean;
    topAlbums: boolean;
    topGenres: boolean;
    streams: boolean;
    streamStats: boolean;
    leaderboards: boolean;
    friends: boolean;
    connections: boolean;
    message: boolean;
}

interface UserProfile {
    bio: string | null;
    pronouns: string | null;
    theme: string;
}

interface Platform {
    id: number;
    name: string;
    icon: string;
}

interface SocialMediaConnection {
    id: number;
    verified: boolean;
    platformUserId: string;
    platformUsername: string;
    platformUserImage: string;
    platform: Platform;
}

interface SpotifyAuth {
    displayName: string;
    platformUserId: string;
    product: string;
    image: string;
    sync: boolean;
    imported: boolean;
    disabled: boolean;
}

interface UserResponse {
    item: {
        id: string;
        customId: string;
        createdAt: string;
        displayName: string;
        image: string;
        isPlus: boolean;
        isPro: boolean;
        hasSwipefy: boolean;
        firstSwipe: string | null;
        orderBy: string;
        quarantined: boolean;
        timezone: string | null;
        privacySettings: PrivacySettings;
        profile: UserProfile;
        socialMediaConnections: SocialMediaConnection[];
        userBan: any | null;
        appleMusicAuth: any | null;
        spotifyAuth: SpotifyAuth;
        recentlyActive: boolean;
        hasImported: boolean;
        syncEnabled: boolean;
        disabled: boolean;
    };
}

export async function getUser(userId: string): Promise<UserResponse> {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
}

interface TopTrackItem {
    position: number;
    streams: number | null;
    indicator: 'NONE' | 'UP' | 'DOWN';
    track: Track;
}

interface TopTracksResponse {
    items: TopTrackItem[];
}

export async function getUserTopTracks(userId: string, range: 'weeks' | 'months'): Promise<TopTracksResponse> {
    const response = await axiosInstance.get(`/users/${userId}/top/tracks?range=${range}`);
    return response.data;
}

interface ArtistExternalIds {
    spotify: string[];
    appleMusic: string[];
}

interface Artist {
    externalIds: ArtistExternalIds;
    followers: number;
    genres: string[];
    id: number;
    image: string;
    name: string;
    spotifyPopularity: number;
}

interface TopArtistItem {
    position: number;
    streams: number | null;
    indicator: 'NONE' | 'UP' | 'DOWN';
    artist: Artist;
}

interface TopArtistsResponse {
    items: TopArtistItem[];
}

export async function getUserTopArtists(userId: string): Promise<TopArtistsResponse> {
    const response = await axiosInstance.get(`/users/${userId}/top/artists?range=weeks`);
    return response.data;
}

export async function getUserTopArtistTracks(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/top/artists/${artistId}/tracks`);
}

export async function getUserTopArtistAlbums(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/top/artists/${artistId}/albums`);
}

export async function getUserTopAlbums(userId: string) {
    return await axiosInstance.get(`/users/${userId}/top/albums`);
}

export async function getUserTopAlbumTracks(userId: string, albumId: string) {
    return await axiosInstance.get(`/users/${userId}/top/albums/${albumId}/tracks`);
}

export async function getUserTopGenres(userId: string): Promise<TopGenresResponse> {
    const response = await axiosInstance.get(`/users/${userId}/top/genres?range=weeks`);
    return response.data;
}

interface StreamItem {
    id: string;
    userId: string;
    endTime: string;
    playedMs: number;
    trackId: number;
    trackName: string;
    albumId: number;
    artistIds: number[];
    trackReleaseId: number;
    albumReleaseId: number;
    contextId?: string;
    importId: number;
}

interface StreamsResponse {
    items: StreamItem[];
}

export async function getUserStreams(userId: string): Promise<StreamsResponse> {
    const response = await axiosInstance.get(`/users/${userId}/streams`);
    return response.data;
}

export async function getUserCurrentStream(userId: string): Promise<CurrentStreamResponse> {
    const response = await axiosInstance.get(`/users/${userId}/streams/current`);
    return response.data;
}

interface RecentStreamItem {
    endTime: string;
    platform: 'SPOTIFY' | 'APPLE_MUSIC';
    track: Track;
    albumId: number;
    albumReleaseId: number;
    trackReleaseId: number;
    contextId?: string;
    durationMs: number;
}

interface RecentStreamsResponse {
    items: RecentStreamItem[];
}

export async function getUserRecentStreams(userId: string): Promise<RecentStreamsResponse> {
    const response = await axiosInstance.get(`/users/${userId}/streams/recent`);
    return response.data;
}

export async function getUserStreamStats(userId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/stats`);
}

export async function getUserStreamStatsPerDay(userId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/stats/per-day`);
}

export async function getUserStreamStatsDates(userId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/stats/dates`);
}

export async function getUserStreamTracksList(userId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/list`);
}

export async function getUserStreamTracksListStats(userId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/list/stats`);
}

export async function getUserStreamTrack(userId: string, trackId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/${trackId}`);
}

export async function getUserStreamTrackStats(userId: string, trackId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/${trackId}/stats`);
}

export async function getUserStreamTrackStatsPerDay(userId: string, trackId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/${trackId}/stats/per-day`);
}

export async function getUserStreamTrackStatsDates(userId: string, trackId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/tracks/${trackId}/stats/dates`);
}

export async function getUserStreamArtist(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/artists/${artistId}`);
}

export async function getUserStreamArtistStats(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/artists/${artistId}/stats`);
}

export async function getUserStreamArtistStatsPerDay(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/artists/${artistId}/stats/per-day`);
}

export async function getUserStreamArtistStatsDates(userId: string, artistId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/artists/${artistId}/stats/dates`);
}

export async function getUserStreamAlbum(userId: string, albumId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/albums/${albumId}`);
}

export async function getUserStreamAlbumStats(userId: string, albumId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/albums/${albumId}/stats`);
}

export async function getUserStreamAlbumStatsPerDay(userId: string, albumId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/albums/${albumId}/stats/per-day`);
}

export async function getUserStreamAlbumStatsDates(userId: string, albumId: string) {
    return await axiosInstance.get(`/users/${userId}/streams/albums/${albumId}/stats/dates`);
}

export async function getUserFriends(userId: string) {
    return await axiosInstance.get(`/users/${userId}/friends`);
}

export async function getUserFriendsCount(userId: string) {
    return await axiosInstance.get(`/users/${userId}/friends/count`);
}

export async function getUserRecordsArtists(userId: string) {
    return await axiosInstance.get(`/users/${userId}/records/artists`);
}

export async function getUserCompletedAchievements(userId: string) {
    return await axiosInstance.get(`/users/${userId}/achievements/completed`);
}

export async function getUserUncompletedAchievements(userId: string) {
    return await axiosInstance.get(`/users/${userId}/achievements/uncompleted`);
}

export async function getUserAchievement(userId: string, achievementId: string) {
    return await axiosInstance.get(`/users/${userId}/achievements/${achievementId}`);
}


export async function getSpotifyFeatures(trackId: string): Promise<SpotifyFeatures> {
    const res = await axiosInstance.get(`/spotify/audio-features/${trackId}`);
    return res.data.item;
}



interface SpotifyFeatures {
    acousticness: number;
    createdAt: number;
    danceability: number;
    duration_ms: number;
    energy: number;
    instrumentalness: number;
    key: number;
    liveness: number;
    loudness: number;
    mode: number;
    speechiness: number;
    tempo: number;
    time_signature: number;
    valence: number;
}


interface PreviewArtist {
    position: number;
    streams: number | null;
    indicator: 'NONE' | 'UP' | 'DOWN' | null;
    artist: Artist;
}

interface GenreDetails {
    tag: string;
}

interface TopGenreItem {
    artistCount: number | null;
    position: number;
    streams: number | null;
    playedMs: number;
    indicator: 'NONE' | 'UP' | 'DOWN' | null;
    previewArtists: PreviewArtist[];
    genre: GenreDetails;
}

interface TopGenresResponse {
    items: TopGenreItem[];
}

