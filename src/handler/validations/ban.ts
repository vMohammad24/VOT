import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";
export default async function (command: ICommand, ctx: CommandContext) {
    const { handler, user } = ctx;
    const { prisma } = handler;
    const pUser = await prisma.user.findFirst({
        where: {
            id: user.id
        }
    })
    if (pUser?.banned) return "You have been banned from using VOT.";
    return true;
}