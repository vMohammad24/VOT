import { Page } from 'puppeteer';
import puppeteer, { VanillaPuppeteer } from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import AnonymizeUA from 'puppeteer-extra-plugin-anonymize-ua';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import commandHandler from '..';

let browser: ReturnType<VanillaPuppeteer['launch']> | undefined = undefined;

export async function launchPuppeteer() {
	if (!browser) {
		if (commandHandler.verbose) commandHandler.logger.info('Launching puppeteer');
		browser = puppeteer
			.use(StealthPlugin())
			.use(
				AdblockerPlugin({
					blockTrackers: true,
					blockTrackersAndAnnoyances: true,
				}),
			)
			.use(
				AnonymizeUA({
					stripHeadless: true,
					makeWindows: true,
				}),
			)
			.launch({
				headless: true,
				defaultViewport: {
					width: 1920,
					height: 1080,
				},
				args: [
					'--window-position=000,000',
					'--no-sandbox',
					'--disable-dev-shm-usage',
					'--disable-web-security',
					'--disable-features=IsolateOrigins',
					' --disable-site-isolation-trials',
					'--enable-features=WebContentsForceDark',
				],
			});
	}
	return browser;
}

export async function newPage() {
	const browser = await launchPuppeteer();
	return browser.newPage();
	// return page;
}


export async function getVideoBuffer(videoUrl: string, page?: Page) {
	page = page ?? (await newPage())

	// Enable request interception
	await page.setRequestInterception(true);

	let videoBuffer = null;

	// Listen for responses
	page.on('response', async response => {
		const url = response.url();
		const contentType = response.headers()['content-type'] || '';

		// Check if the response is video content
		if (contentType.includes('video/') || url.endsWith('.mp4') || url.endsWith('.webm')) {
			try {
				videoBuffer = await response.buffer();
			} catch (error) {
				console.error('Error getting video buffer:', error);
			}
		}
	});

	// Handle requests
	page.on('request', request => {
		// Only allow video-related requests
		if (request.resourceType() === 'media') {
			request.continue();
		} else {
			request.abort();
		}
	});

	try {
		// Navigate to the video URL
		await page.goto(videoUrl, {
			waitUntil: 'networkidle0',
			timeout: 30000
		});

		if (!videoBuffer) {
			throw new Error('Video buffer not found');
		}

		return videoBuffer;
	} finally {
		await page.close();
	}
}