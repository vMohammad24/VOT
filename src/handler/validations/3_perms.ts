import { EmbedBuilder } from "discord.js";
import { camelToTitleCase } from "../../util/util";
import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";

const cooldowns = new Map<string, Map<string, number>>();
export default function (command: ICommand, ctx: CommandContext) {
	if (!command.perms) return true;
	const { perms } = command;
	const { member, user } = ctx;
	if (perms === "dev") {
		return ctx.handler.developers.includes(user.id);
	}
	const missingPerms = perms.filter((a) => !member.permissions.has(a));
	if (missingPerms.length > 0) {
		const now = Date.now();
		const timestamps =
			cooldowns.get(command.name!) || new Map<string, number>();
		const cooldownAmount = 5000;

		if (timestamps.has(user.id)) {
			const expirationTime = timestamps.get(user.id)! + cooldownAmount;

			if (now < expirationTime) {
				return false;
			}
		}

		timestamps.set(user.id, now);
		cooldowns.set(command.name!, timestamps);
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle("Missing Permissions")
					.setColor("DarkRed")
					.setDescription(
						`You're missing the following permissions: ${missingPerms
							.map((a) => "``" + camelToTitleCase(a.toString()) + "``")
							.join(", ")}`,
					),
			],
			ephemeral: true,
		};
	}
	return true;
}
