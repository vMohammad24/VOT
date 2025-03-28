import { UserTier } from "@prisma/client";
import commandHandler from "../..";
import { getUserByID } from "../../util/database";
import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";

export default async function (command: ICommand, ctx: CommandContext) {
	if (!command.userTier) return true;
	const { userTier } = command;
	const { user } = ctx;
	if (userTier != "Normal") {
		const u = await getUserByID(user.id, { tier: true });
		if (u.tier == UserTier.Staff || u.tier == UserTier.Manager) return true;
		const prmeiumCommandId = commandHandler.commands!.find(
			(c) => c.name === "premium",
		)!.id;
		if (u.tier == userTier) return true;
		else
			return {
				content: `This command is only available to ${userTier} users.${userTier === UserTier.Premium ? `\nYou can purchase premium using </premium:${prmeiumCommandId}>` : ""}`,
				ephemeral: true,
			};
	}
	return true;
}
