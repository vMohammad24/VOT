import axios from "axios";
import queryString from "query-string";
import server from ".";
import commandHandler from "..";
import { getRedirectURL } from "../util/urls";
import { spotifyClientId, spotifyClientSecret } from "./apiUtils";

server.get('/spotify/callback', async (req, res) => {
    const { code } = req.query as any;
    const token = req.headers.authorization;
    const scopes = 'user-read-playback-state user-read-currently-playing'
    const state = crypto.randomUUID();
    if (!code)
        return res.redirect('https://accounts.spotify.com/authorize?' +
            queryString.stringify({
                response_type: 'code',
                client_id: spotifyClientId,
                scope: scopes,
                redirect_uri: getRedirectURL('spotify'),
                state
            }));
    if (!token) return res.redirect('/discord/callback')
    const user = await commandHandler.prisma.user.findUnique({
        where: { token }, select: {
            id: true,
            spotify: true
        }
    })
    if (!user) return res.redirect('/discord/callback')
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectURL('spotify'),
    }, {
        method: "POST",
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'))
        },
    }).then(res => res.data) as any;
    if (tokenRes.error) {
        return res.status(401).send(tokenRes);
    }
    // if (user.spotify) {
    //     await commandHandler.prisma.spotify.update({
    //         where: {
    //             userId: user.id
    //         },
    //         data: {
    //             token: tokenRes.access_token,
    //             refreshToken: tokenRes.refresh_token,
    //             expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
    //         }
    //     })
    // } else {
    //     await commandHandler.prisma.spotify.create({
    //         data: {
    //             token: tokenRes.access_token,
    //             refreshToken: tokenRes.refresh_token,
    //             expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
    //             user: {
    //                 connect: {
    //                     id: user.id
    //                 }
    //             }
    //         }
    //     })
    // }

    await commandHandler.prisma.spotify.upsert({
        where: {
            userId: user.id
        },
        update: {
            token: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
        },
        create: {
            token: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
            userId: user.id
        }
    })

    return res.send({
        success: true,
        message: "Successfully regisetred user"
    });
})