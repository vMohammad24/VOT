import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";
export default async function (command: ICommand, ctx: CommandContext) {
    const { cooldown } = command;
    const { handler, user } = ctx;
    const { prisma } = handler;
    if (!cooldown) return true;
    const pCommand = await prisma.command.findFirst({
        where: {
            commandId: command.name,
            userId: user.id
        },
        orderBy: {
            createdAt: "desc"
        }
    })
    if (!pCommand) return true;
    const now = Date.now();
    const diff = now - new Date(pCommand.createdAt).getTime();
    if (diff < cooldown) return `${Math.round((cooldown - diff) / 1000)} seconds till you can use this command again`;
    return true;

}