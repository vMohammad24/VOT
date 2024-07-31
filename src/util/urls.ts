import commandHandler from "..";

export function getRedirectURL(platform: 'discord' | 'spotify') {
    const { prodMode } = commandHandler;
    if (platform === 'spotify') return prodMode ? import.meta.env.REDIRECT_SPOTIFY_PROD! : import.meta.env.REDIRECT_SPOTIFY_DEV!
    return (prodMode ? import.meta.env.REDIRECT_PROD! : import.meta.env.REDIRECT_DEV!).replace('{platform}', platform)
}

export function getFrontEndURL() {
    const { prodMode } = commandHandler;
    return prodMode ? import.meta.env.FRONTEND_URL_PROD! : import.meta.env.FRONTEND_URL_DEV!
}