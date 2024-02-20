import type { PrismaClient, Spotify } from "@prisma/client";
import axios from "axios";
export async function getCurrentlyPlaying(userId: string, prisma: PrismaClient) {
    const spotify = await prisma.spotify.findUnique({
        where: {
            userId
        }
    });
    if (!spotify || !spotify.expiresAt) return;
    if (spotify.expiresAt < new Date("UTC")) {
        await refreshToken(spotify, prisma);
        return await getCurrentlyPlaying(userId, prisma);
    }
    const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': `Bearer ${spotify.token}`
        }
    }).catch(async e => {
        if (e.response.status == 401) {
            await refreshToken(spotify, prisma);
            return await getCurrentlyPlaying(userId, prisma);
        }
    }).then(res => res.data) as any;

    return res;
}

export async function pausePlayer(userId: string, prisma: PrismaClient) {

    const spotify = await prisma.spotify.findUnique({
        where: {
            userId
        }
    });
    if (!spotify || !spotify.expiresAt) return;
    if (spotify.expiresAt < new Date("UTC")) {
        await refreshToken(spotify, prisma);
        return await pausePlayer(userId, prisma);
    }
    try {
        const res = await axios.put('https://api.spotify.com/v1/me/player/pause', {
            headers: {
                'Authorization': `Bearer ${spotify.token}`
            }
        });
        return res.data;
    } catch (e) {
        return { error: "Spotify Premium required to pause your player" }
    }
}


export async function refreshToken(spotify: Spotify, prisma: PrismaClient) {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', spotify.refreshToken!);

    const res = await axios.post('https://accounts.spotify.com/api/token', params, {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
    })
    const resData = res.data;
    await prisma.spotify.update({
        where: {
            id: spotify.id
        },
        data: {
            token: resData.access_token,
            expiresAt: new Date(Date.now() + resData.expires_in)
        }
    })
    return resData.access_token;
}