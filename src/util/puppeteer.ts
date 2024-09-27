import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';


let browser: ReturnType<VanillaPuppeteer["launch"]> | undefined = undefined;

export async function launchPuppeteer() {
	if (!browser) browser = puppeteer.use(StealthPlugin()).launch({
		headless: true,
		defaultViewport: {
			width: 1920,
			height: 1080,
		},
		args: ['--no-sandbox', '--enable-features=WebContentsForceDark'],
	});
	return browser;
}
