
import { ApplicationCommandOptionType, Colors, EmbedBuilder, ModalBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'blacklist',
    description: "Bans/Unbans a user from using VOT",
    perms: "dev",
    type: "dmOnly",
    options: [
        {
            name: "userId",
            description: "The user to ban",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    execute: async ({ args, handler }) => {
        const userId = args.get("userId");
        if (!userId) return {
            content: "Please provide a user id",
            ephemeral: true
        }
        const { prisma } = handler;
        const user = await prisma.user.findFirst({ where: { id: userId } })
        if (!user) {
            return {
                content: "User not found",
                ephemeral: true
            }
        }
        let content = "";
        if (user.banned) {
            user.banned = false;
            content = `${user.name} has been unbanned`
        } else {
            user.banned = true;
            content = `${user.name} has been banned`
        }
        return {
            content
        }
    }
} as ICommand