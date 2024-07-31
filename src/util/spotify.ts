import type { Spotify } from "@prisma/client";
import axios from "axios";
import commandHandler from "..";
export async function getCurrentlyPlaying(userId: string) {
    const { prisma } = commandHandler;
    const spotify = await prisma.spotify.findUnique({
        where: {
            userId
        }
    });
    if (!spotify || !spotify.expiresAt) return { error: "Spotify account not linked." };
    if (spotify.expiresAt < new Date("UTC")) {
        await refreshToken(spotify);
        return await getCurrentlyPlaying(userId);
    }
    const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': `Bearer ${spotify.token}`
        }
    }).catch(async e => {
        if (e.response.status == 401) {
            await refreshToken(spotify);
            await setTimeout(() => { }, 500)
            return await getCurrentlyPlaying(userId);
        }
    }).then(res => res.data) as any;
    if (res && res.error && res.error.status && res.error.status == 401) {
        await refreshToken(spotify);
        await setTimeout(() => { }, 500)
        return await getCurrentlyPlaying(userId);
    }
    return res;
}

export async function pausePlayer(userId: string) {
    const { prisma } = commandHandler;

    const spotify = await prisma.spotify.findUnique({
        where: {
            userId
        }
    });
    if (!spotify || !spotify.expiresAt) return;
    if (spotify.expiresAt < new Date("UTC")) {
        await refreshToken(spotify);
        return await pausePlayer(userId);
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


export async function refreshToken(spotify: Spotify) {
    const { prisma } = commandHandler;
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', spotify.refreshToken!);

    const res = await axios.post('https://accounts.spotify.com/api/token', params, {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${import.meta.env.SPOTIFY_CLIENT_ID}:${import.meta.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
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
    commandHandler.logger.info(`Refreshed spotify token for ${spotify.userId}`)
    return resData.access_token;
}
