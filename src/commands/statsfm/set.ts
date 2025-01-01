import { ApplicationCommandOptionType } from "discord.js";
import commandHandler from "../..";
import ICommand from "../../handler/interfaces/ICommand";
import { getUserByID } from "../../util/database";
import { getUser } from "../../util/statsfm";

export default {
    name: 'statsfm set',
    aliases: ['sfm set'],
    type: 'all',
    description: 'Set your stats.fm username for all /statsfm commands',
    options: [
        {
            name: 'username',
            description: 'Your stats.fm username',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    execute: async ({ user, args }) => {
        console.log(args)
        const sFmUser = args.get('username') as string;
        const u = await getUser(sFmUser);
        if (!u || !u.item.displayName) {
            return {
                content: 'Invalid stats.fm username',
                ephemeral: true
            }
        }
        await getUserByID(user.id, { statsfmUser: true });
        await commandHandler.prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                statsfmUser: u.item.customId || u.item.id
            }
        })
        return {
            content: `Stats.fm username set to ${u.item.displayName}`,
            ephemeral: true
        }
    }
} as ICommand