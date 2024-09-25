export function getRedirectURL(platform: 'discord' | 'spotify') {
	if (platform === 'spotify') return import.meta.env.REDIRECT_SPOTIFY!;
	return import.meta.env.REDIRECT_URL!.replace('{platform}', platform);
}

export function getFrontEndURL() {
	return import.meta.env.FRONTEND_URL!;
}
