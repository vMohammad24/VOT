import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import commandHandler from '..';


let browser: ReturnType<VanillaPuppeteer["launch"]> | undefined = undefined;

export async function launchPuppeteer() {
	if (!browser) {
		if (commandHandler.verbose) commandHandler.logger.info('Launching puppeteer');
		browser = puppeteer.use(StealthPlugin()).launch({
			headless: true,
			defaultViewport: {
				width: 1920,
				height: 1080,
			},
			args: ['--window-position=000,000', '--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security', '--disable-features=IsolateOrigins', ' --disable-site-isolation-trials', '--enable-features=WebContentsForceDark'],
		});

	}
	return browser;
}
