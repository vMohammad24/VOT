import type { CommandContext } from "../interfaces/ICommand";
export default async function (ctx: CommandContext) {
    const { handler, user } = ctx;
    if (handler.prodMode || handler.developers.includes(user.id)) return true;
    return false;

}