import type { Spotify } from '@prisma/client';
import axios from 'axios';
import commandHandler from '..';
const spotifyToken = `Basic ${Buffer.from(
	`${import.meta.env.SPOTIFY_CLIENT_ID}:${import.meta.env.SPOTIFY_CLIENT_SECRET}`,
).toString('base64')}`;
export async function getCurrentlyPlaying(userId: string) {
	const { prisma } = commandHandler;
	const spotify = await prisma.spotify.findUnique({
		where: {
			userId,
		},
	});
	if (!spotify || !spotify.expiresAt) return { error: 1 };
	if (spotify.expiresAt < new Date('UTC')) {
		await refreshToken(spotify);
		return await getCurrentlyPlaying(userId);
	}
	const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
		headers: {
			Authorization: `Bearer ${spotify.token}`,
		},
	});
	const { error } = res.data;
	if (res.status == 401 || error) {
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
	if (!spotify || !spotify.expiresAt) return { error: 'Spotify account not linked.' };
	if (spotify.expiresAt < new Date('UTC')) {
		await refreshToken(spotify);
		return await pausePlayer(userId);
	}
	const res = await axios.put(
		'https://api.spotify.com/v1/me/player/pause',
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
	logger.info(`Refreshing spotify token for ${spotify.userId}`);
	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('refresh_token', spotify.refreshToken!);

	const res = await axios.post('https://accounts.spotify.com/api/token', params, {
		headers: {
			Authorization: spotifyToken,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});
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
	commandHandler.logger.info(`Refreshed spotify token for ${spotify.userId}`);
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

export async function getTrackFeatures(trackId: string): Promise<SpotifyFeatures | string> {
	const url = `https://api.spotify.com/v1/audio-features/${trackId}`;
	const spotify = await commandHandler.prisma.spotify.findFirst({
		where: {
			userId: '921098159348924457',
		},
	});
	if (!spotify || !spotify.expiresAt) return 'Spotify account not linked.';
	if (spotify.expiresAt.getTime() < new Date().getTime()) {
		await refreshToken(spotify);
		return await getTrackFeatures(trackId);
	}
	const res = await axios.get(url, {
		headers: {
			Authorization: 'Bearer ' + spotify.token,
		},
	});
	return res.data as SpotifyFeatures;
}
