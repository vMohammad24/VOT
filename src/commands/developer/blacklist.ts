import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { getUserByID } from "../../util/database";

export default {
	name: "blacklist",
	description: "Bans/Unbans a user from using VOT",
	perms: "dev",
	type: "dmOnly",
	options: [
		{
			name: "user_id",
			description: "The user to ban",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	execute: async ({ args, handler }) => {
		const userId = args.get("user_id");
		if (!userId)
			return {
				content: "Please provide a user id",
				ephemeral: true,
			};
		const { prisma } = handler;
		const user = await getUserByID(userId);
		if (!user) {
			return {
				content: "User not found",
				ephemeral: true,
			};
		}
		let content = "";
		if (user.banned) {
			user.banned = false;
			content = `${user.name} has been unbanned`;
		} else {
			user.banned = true;
			content = `${user.name} has been banned`;
		}
		await prisma.user.update({ data: user, where: { id: user.id } });
		return {
			content,
		};
	},
} as ICommand;
