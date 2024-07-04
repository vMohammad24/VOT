import commandHandler from ".."

export function getRedirectURL(platform: 'discord' | 'spotify') {
    const { prodMode } = commandHandler;
    if (platform === 'spotify' && !prodMode) return process.env.REDIRECT_SPOTIFY_DEV!
    return (prodMode ? process.env.REDIRECT_PROD! : process.env.REDIRECT_DEV!).replace('{platform}', platform)
}

export function getFrontEndURL() {
    const { prodMode } = commandHandler;
    return prodMode ? process.env.FRONTEND_URL_PROD! : process.env.FRONTEND_URL_DEV!
}