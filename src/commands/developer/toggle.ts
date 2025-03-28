import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Toggle a command",
	category: "developer",
	perms: "dev",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "command",
			description: "The command you want to toggle",
			required: true,
		},
	],
	type: "dmOnly",
	execute: async ({ args, handler }) => {
		const cmdName = args.get("command") as string | undefined;
		if (!cmdName)
			return { ephemeral: true, content: "Please provide a command to toggle" };
		const cmd = handler.commands!.find(
			(c) => c.name?.toLowerCase() == cmdName.toLowerCase(),
		);
		if (!cmd) return { ephemeral: true, content: "Command not found" };
		cmd.disabled = !cmd.disabled;
		return {
			ephemeral: true,
			content: `${cmd.name} has been ${cmd.disabled ? "disabled" : "enabled"}`,
		};
	},
} as ICommand;
