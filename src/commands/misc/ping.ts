import type ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Pong!",
    cooldown: 5000,
    execute: async ({ interaction, handler }) => {
        return {
            embeds: [{
                title: "Pong!",
                description: `Latency: ${handler.client.ws.ping}ms`
            }]
        };
    },

} as ICommand