import { IListener } from "../handler/ListenerHandler";

// verify
export default {
    name: 'Verification Button',
    description: 'Handles the verification button',
    execute: async (handler) => {
        handler.client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton() && interaction.customId == 'verify') {

            }
        })
    }
} as IListener