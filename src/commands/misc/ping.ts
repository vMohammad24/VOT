import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Pong!",
    cooldown: 5000,
    execute: async ({ interaction, handler }) => {
        return {
            embeds: [new EmbedBuilder().setDescription(`${"```"}${handler.client.ws.ping}ms${"```"}`).setColor("Random").setTitle("Pong!").setTimestamp()]
        };
    },

} as ICommand