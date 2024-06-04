import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { createCanvas } from "@napi-rs/canvas";

export default {
    description: "Displays your current level or the level of a selected user",
    options: [
        {
            name: "user",
            description: "The user whose level you want to get",
            type: ApplicationCommandOptionType.User
        }
    ],
    execute: async ({ message, member, handler, guild }) => {
        const user = message?.mentions?.members?.first() || member;

        const prismaUser = handler.prisma.member.findFirst({
            where: {
                guildId: guild.id,
                userId: user.id
            }
        })
        const ctx = createCanvas(300, 200).getContext('2d');

    }
} as ICommand