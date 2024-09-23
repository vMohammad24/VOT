import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
    description: 'test command for devs',
    perms: 'dev',
    type: 'dmOnly',
    options: [{
        name: 'user',
        description: 'the id of the user to give beta to',
        type: ApplicationCommandOptionType.String,
        required: true,
    }],
    execute: async ({ handler, args }) => {
        const { prisma } = handler;
        const userId = args.get('user') as string | undefined;
        if (!userId) return 'no user id provided';
        const user = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                tier: 'Beta'
            }
        })
        return `Gave beta to ${user.name}`;
    },
} as ICommand;
