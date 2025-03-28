import {
	Collection,
	EmbedBuilder,
	type InteractionReplyOptions,
} from "discord.js";
import { getUserByID } from "../../util/database";
import { timeUntil } from "../../util/util";
import type ICommand from "../interfaces/ICommand";
import type { CommandContext } from "../interfaces/ICommand";

const cooldowns = new Collection<string, Collection<string, number>>();
const embed = new EmbedBuilder().setTitle("Cooldown").setColor("DarkRed");

const makeEmbed = (time: number, name: string, avatar?: string) =>
	embed
		.setDescription(
			`You can use this command again in ${timeUntil(time * 1000)} (<t:${time}:R>)`,
		)
		.setAuthor({ name, iconURL: avatar })
		.setColor("Red");

export default async function (
	command: ICommand,
	ctx: CommandContext,
): Promise<true | InteractionReplyOptions> {
	const { cooldown } = command;
	const {
		user,
		handler: { prisma },
	} = ctx;
	if (!cooldown || !command.name) return true;

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Collection());
	}
	const now = Date.now();
	const timestamps = cooldowns.get(command.name)!;

	const pUser = await getUserByID(user.id, {
		tier: true,
	});

	if (pUser.tier !== "Normal") return true;

	const expirationTime = timestamps.get(user.id);

	if (expirationTime) {
		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1000);
			return {
				embeds: [
					makeEmbed(
						expiredTimestamp,
						user.username,
						user.avatarURL() || undefined,
					),
				],
				ephemeral: true,
			};
		} else {
			timestamps.delete(user.id);
		}
	}

	timestamps.set(user.id, now + cooldown);
	return true;
}
