import { ApplicationCommandOptionType } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { launchPuppeteer } from "../../util/puppeteer";


const browser = await launchPuppeteer();


export default {
    description: "Takes a screenshot of a website",
    aliases: ["ss"],
    options: [
        {
            name: "url",
            description: "The URL of the website to screenshot",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    type: "all",
    execute: async ({ interaction, args }) => {
        const url = args.get('url') as string;
        if (!url) return {
            content: 'Please provide a URL',
            ephemeral: true
        }
        const urlRegex = /^(https?:\/\/)?([\w\d]+\.)?[\w\d]+\.\w+\/?/;
        if (!urlRegex.test(url)) return {
            content: 'Please provide a valid URL',
            ephemeral: true
        }
        const page = await browser.newPage();
        await page.goto(url);
        const b = await page.$('body');
        await b?.evaluate((body) => {
            const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
            body.innerHTML = body.innerHTML.replace(ipRegex, 'nuh uh');
        })
        const screenshot = await page.screenshot();
        await page.close();
        return {
            files: [{
                attachment: Buffer.from(screenshot),
                name: 'screenshot.png'
            }]
        }
    }
} as ICommand