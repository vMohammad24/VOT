import type ICommand from "../../handler/interfaces/ICommand";

export default {
    name: "coinflip",
    aliases: ["flip", "cf"],
    description: "Flips a coin",
    type: "all",
    execute: async () => {
        const coin = Math.floor(Math.random() * 2);
        return `**${coin === 0 ? "Heads" : "Tails"}**`;
    }
} as ICommand