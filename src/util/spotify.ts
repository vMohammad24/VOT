import type { Spotify } from "@prisma/client";
import axios from "axios";
import commandHandler, { redis } from "..";
const spotifyToken = `Basic ${Buffer.from(
	`${import.meta.env.SPOTIFY_CLIENT_ID}:${import.meta.env.SPOTIFY_CLIENT_SECRET}`,
).toString("base64")}`;
export async function getCurrentlyPlaying(userId: string) {
	const { prisma } = commandHandler;
	const spotify = await prisma.spotify.findUnique({
		where: {
			userId,
		},
	});
	if (!spotify || !spotify.expiresAt) return { error: 1 };
	if (spotify.expiresAt < new Date("UTC")) {
		await refreshToken(spotify);
		return await getCurrentlyPlaying(userId);
	}
	const res = await axios.get(
		"https://api.spotify.com/v1/me/player/currently-playing",
		{
			headers: {
				Authorization: `Bearer ${spotify.token}`,
			},
		},
	);
	const { error } = res.data;
	if (res.status === 401 || error) {
		await refreshToken(spotify);
		await setTimeout(() => {}, 500);
		return await getCurrentlyPlaying(userId);
	}
	return res.data;
}

export async function pausePlayer(userId: string) {
	const { prisma } = commandHandler;
	const spotify = await prisma.spotify.findUnique({
		where: {
			userId,
		},
	});
	if (!spotify || !spotify.expiresAt)
		return { error: "Spotify account not linked." };
	if (spotify.expiresAt < new Date("UTC")) {
		await refreshToken(spotify);
		return await pausePlayer(userId);
	}
	const res = await axios.put(
		"https://api.spotify.com/v1/me/player/pause",
		{},
		{
			headers: {
				Authorization: `Bearer ${spotify.token}`,
			},
		},
	);
	const { error } = res.data;
	if (error) return { error };
}

export async function refreshToken(spotify: Spotify) {
	const { prisma, logger } = commandHandler;
	logger.debug(`Refreshing spotify token for ${spotify.userId}`);
	const params = new URLSearchParams();
	params.append("grant_type", "refresh_token");
	params.append("refresh_token", spotify.refreshToken!);

	const res = await axios.post(
		"https://accounts.spotify.com/api/token",
		params,
		{
			headers: {
				Authorization: spotifyToken,
				"Content-Type": "application/x-www-form-urlencoded",
			},
		},
	);
	const resData = res.data;
	await prisma.spotify.update({
		where: {
			id: spotify.id,
		},
		data: {
			token: resData.access_token,
			expiresAt: new Date(Date.now() + resData.expires_in),
		},
	});
	commandHandler.logger.debug(`Refreshed spotify token for ${spotify.userId}`);
	return resData.access_token;
}

export interface SpotifyFeatures {
	acousticness: number;
	analysis_url: string;
	danceability: number;
	duration_ms: number;
	energy: number;
	id: string;
	instrumentalness: number;
	key: number;
	liveness: number;
	loudness: number;
	mode: number;
	speechiness: number;
	tempo: number;
	time_signature: number;
	track_href: string;
	type: string;
	uri: string;
	valence: number;
}

export async function getTrackFeatures(
	trackId: string,
	userId: string,
): Promise<SpotifyFeatures | string> {
	const key = `spotify:features:${trackId}`;
	return redis.get(key).then(async (cache) => {
		if (cache) return JSON.parse(cache) as SpotifyFeatures;
		const url = `https://api.spotify.com/v1/audio-features/${trackId}`;
		if (!userId) return "No user id provided";
		const spotify = await commandHandler.prisma.spotify.findFirst({
			where: {
				userId,
			},
		});
		if (!spotify || !spotify.expiresAt) return "Spotify account not linked.";
		if (spotify.expiresAt.getTime() < new Date().getTime()) {
			await refreshToken(spotify);
			return await getTrackFeatures(trackId, userId);
		}
		const res = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${spotify.token}`,
			},
		});
		await redis.set(key, JSON.stringify(res.data), "EX", 60 * 60 * 24 * 30);
		return res.data as SpotifyFeatures;
	});
}

interface Activity {
	type: number;
	state: string;
	name: string;
	flags?: number;
	assets?: Assets;
	party?: Party;
	sync_id?: string;
	session_id?: string;
	timestamps?: Timestamps;
	details?: string;
	application_id?: number;
	buttons?: string[];
}

interface Assets {
	large_text: string;
	large_image: string;
	small_text?: string;
	small_image?: string;
}

interface Party {
	id: string;
}

interface Timestamps {
	start: number;
	end?: number;
}

interface UserStatus {
	online: string[];
	idle: string[];
	dnd: string[];
	status: string;
	activities: Activity[];
	messages: Record<string, unknown>;
	voice: unknown[];
}
export async function getSpotifyRPC(userId: string) {
	const res = await axios.get<UserStatus>(
		`https://us-atlanta2.evade.rest/users/${userId}/status`,
		{
			headers: {
				Authorization: import.meta.env.OTHER_EVADE_API_KEY,
			},
		},
	);
	if (!res.data.activities) {
		return { error: "No activity found" };
	}
	const activities = res.data.activities || [];
	const spotify = activities.find(
		(activity) =>
			activity.assets?.large_image?.startsWith("spotify:") ||
			activity.name === "Spotify",
	);
	if (!spotify) {
		return { error: "No spotify activity found" };
	}
	const trackURI = `https://open.spotify.com/track/${spotify.sync_id}`;
	if (!trackURI) {
		return { error: "No track playing" };
	}
	return {
		trackURI,
		raw: spotify,
	};
}
