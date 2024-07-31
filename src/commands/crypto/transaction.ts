import { ApplicationCommandOptionType } from "discord.js";
import puppeteer from "puppeteer";
import type ICommand from "../../handler/interfaces/ICommand";
export default {
    description: "Dispalys information about a specefic crypto transaction",
    aliases: ["txid"],
    options: [{
        name: "txid",
        description: "your transaction id",
        type: ApplicationCommandOptionType.String,
        required: true,
    }],
    type: "all",
    cooldown: 60 * 1000,
    execute: async ({ args, interaction }) => {
        const txid = args.get("txid") as string;
        if (!txid) return {
            content: "Invalid txid",
            ephemeral: true
        }
        interaction?.deferReply();
        const url = `https://blockchair.com/litecoin/transaction/${txid}`;
        const browser = await puppeteer.launch({ headless: true });
        // Create a new page
        const page = await browser.newPage();
        // Navigate to the URL
        await page.goto(url);
        await page.setViewport({ width: 2560, height: 1440 });
        await page.locator('span').scroll();
        // Capture a screenshot
        const screenshot = await page.screenshot({ optimizeForSpeed: true });
        await page.close();
        return {
            files: [
                screenshot
            ]
        }

    }
} as ICommand