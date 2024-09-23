import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

export async function launchPuppeteer() {
    return puppeteer
        .use(StealthPlugin())
        .launch({
            headless: true, defaultViewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isLandscape: true,
            },
            args: ['--no-sandbox', '--enable-features=WebContentsForceDark']
        })
}