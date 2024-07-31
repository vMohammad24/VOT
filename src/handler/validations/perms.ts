import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";

export default function (command: ICommand, ctx: CommandContext) {
    if (!command.perms) return true;
    const { perms } = command;
    const { member, user } = ctx;
    if (perms === "dev") {
        if (!ctx.handler.developers.includes(user.id)) return { content: 'This command is only available to the bot developers', ephemeral: true };
        else return true;
    }
    const missingPerms = []
    for (const perm of perms) {
        if (!member.permissions.has(perm)) missingPerms.push(perm);
    }
    if (missingPerms.length > 0) return { content: `You are missing the following permissions: ${missingPerms.map(a => "``" + a + "``").join(", ")}`, ephemeral: true };
    return true;
}