import { ApplicationCommandOptionType } from "discord.js";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getUserByID } from "../../util/database";
import { getUser } from "../../util/statsfm";

export default {
	name: "statsfm set",
	aliases: ["sfm set"],
	type: "all",
	description: "Set your stats.fm username for all /statsfm commands",
	options: [
		{
			name: "username",
			description: "Your stats.fm username",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	execute: async ({ user, args }) => {
		const sFmUser = args.get("username") as string;
		const u = await getUser(sFmUser);
		if (!u.item?.displayName) {
			return {
				content: `\`${sFmUser}\` is an invalid stats.fm username`,
				ephemeral: true,
			};
		}
		const embed = new VOTEmbed();
		if (!u.item.privacySettings.currentlyPlaying) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Currently Playing\`\` from working`,
			);
		}
		if (!u.item.privacySettings.recentlyPlayed) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Recently Played\`\` from working`,
			);
		}
		if (!u.item.privacySettings.topTracks) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Top Tracks\`\` from working`,
			);
		}
		if (!u.item.privacySettings.topArtists) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Top Artists\`\` from working`,
			);
		}
		if (!u.item.privacySettings.topGenres) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Top Genres\`\` from working`,
			);
		}
		if (!u.item.privacySettings.topAlbums) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Top Albums\`\` from working`,
			);
		}
		if (!u.item.privacySettings.profile) {
			embed.addDescription(
				`**WARNING**: Your privacy settings are preventing \`\`Profile\`\` from working`,
			);
		}
		embed.setAuthor({ name: u.item.displayName, iconURL: u.item.image });
		await getUserByID(user.id, { statsfmUser: true });
		await commandHandler.prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				statsfmUser: u.item.id || u.item.customId,
			},
		});
		return {
			embeds: [embed],
			ephemeral: true,
		};
	},
} as ICommand;
