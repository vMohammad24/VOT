import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Pong!",
    cooldown: 5000,
    execute: async ({ interaction, message, handler }) => {
        const apiLatency = handler.client.ws.ping;
        const messageLatency = Math.round((interaction?.createdTimestamp || message?.createdTimestamp)!) - Date.now();
        return {
            embeds: [new EmbedBuilder().setColor("Random").setTitle("Pong!").addFields({
                name: "API Latency",
                value: "```" + `${apiLatency == -1 ? "N/A" : `${apiLatency}ms`}` + "```"
            },
                {
                    name: "Message Latency",
                    value: "```" + `${messageLatency}ms` + "```"
                }).setTimestamp()]
        };
    },

} as ICommand