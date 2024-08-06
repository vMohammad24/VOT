import type ICommand from '../interfaces/ICommand';
import { type CommandContext } from '../interfaces/ICommand';

export default async function (command: ICommand, ctx: CommandContext) {
	// TODO: make a way for ppl to parchase tiers
	return true;
	/*
    if (!command.userTier) return true;
    const { userTier: uTierRequired, guildTier: gTierRequired } = command;
    const { member, handler } = ctx;
    const { prisma } = handler;
    if (uTierRequired != 0) {
        const user = await prisma.user.findFirst({
            where: {
                id: member.id
            }
        });
        if (!user) return "You are not in the database";
        if (user.tier < uTierRequired) return {
            content: "You do not have the required tier to use this command",
            ephemeral: true
        };
    }
    return true;*/
}
