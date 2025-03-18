import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';


const routes = [
    { label: 'Login', url: 'discord://-/login' },
    { label: 'Register', url: 'discord://-/register' },


    { label: 'Library', url: 'discord://-/library/' },
    { label: 'Library Inventory', url: 'discord://-/library/inventory' },
    { label: 'Library Settings', url: 'discord://-/library/settings/' },
    { label: 'Favorites', url: 'discord://-/channels/@favorites' },
    { label: 'User Settings', url: 'discord://-/settings/account' },
    { label: 'Apps', url: 'discord://-/apps' },
    { label: 'Discovery - Guilds', url: 'discord://-/guild-discovery' },
    { label: 'New Server', url: 'discord://-/guilds/create' },
    { label: 'Developer Portal', url: 'discord://-/developer' },
    { label: 'Home', url: 'discord://-/' },
    { label: 'Friends', url: 'discord://-/channels/@me/' },
    { label: 'Nitro', url: 'discord://-/store' },
    { label: 'Shop', url: 'discord://-/shop' },
    { label: 'Message Requests', url: 'discord://-/message-requests' },
    { label: 'Family Centre', url: 'discord://-/family-center' },
]

export default {
    description: 'Shortcut command to navigate to various Discord pages',
    type: 'all',
    options: [
        {
            name: 'where',
            description: 'Where the shortcut should take you',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: routes.map((route) => ({
                name: route.label,
                value: route.label
            }))
        },
    ],
    execute: async ({ interaction, args }) => {
        const route = args.get('where') as string | undefined;
        if (!route) {
            return {
                content: 'Please provide a route',
                ephemeral: true
            }
        }
        const url = routes.find((r) => r.label.toLowerCase() === route.toLowerCase())?.url;
        if (!url) {
            return {
                content: 'Invalid route',
                ephemeral: true
            }
        }
        return {
            content: `Navigating to ${route}`,
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel('Click here')
                        .setURL(url)
                )
            ]
        }
    },
} as ICommand;