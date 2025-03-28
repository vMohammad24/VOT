import { ApplicationCommandOptionType } from "discord.js";
import { getPrefix } from "../../handler/LegacyHandler";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getEmoji } from "../../util/emojis";
import { pagination } from "../../util/pagination";
import { getFrontEndURL } from "../../util/urls";
import { camelToTitleCase } from "../../util/util";

function getOptionName(value: number): string | undefined {
	return Object.keys(ApplicationCommandOptionType).find(
		(key) => (ApplicationCommandOptionType as any)[key] === value,
	);
}

export default {
	description: "Displays all commands",
	cooldown: 5000,
	options: [
		{
			name: "command",
			description: "the name of the command to search for",
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	type: "all",
	execute: async ({ message, interaction, handler, args, member }) => {
		const categories = handler
			.commands!.filter((a) => a.category)
			.map((cmd) => cmd.category)
			.filter((value, index, self) => self.indexOf(value) === index)
			.filter((cat) => cat != "Developer")
			.sort() as string[];
		const command = args.get("command") as string | undefined;
		if (!command) {
			const embeds = categories.map((category) => {
				const commands = handler
					.commands!.filter((cmd) => cmd.category === category)
					.sort();
				return {
					name: category,
					emoji: (getEmoji(`c_${category.toLowerCase()}`) || "❔").toString(),
					page: {
						embeds: [
							new VOTEmbed()
								.setTitle(category)
								.setDescription(
									commands
										.filter((cmd) => cmd.category === category)
										.sort()
										.map((cmd) => `**${cmd.name}** - ${cmd.description}`)
										.join("\n"),
								)
								.setColor("Green")
								.setTimestamp(),
						],
						content: `Go to ${getFrontEndURL()}/commands for all commands.`,
					},
				};
			});
			const msg = await pagination({
				interaction: interaction || undefined,
				message: message || undefined,
				type: "select",
				pages: embeds,
				name: "Select a category",
			});
		} else {
			const cmd =
				handler.commands!.find((cmd) => cmd.name === command) ??
				handler.commands!.find((cmd) => cmd.aliases?.includes(command!));
			if (!cmd)
				return { content: `Command \`${command}\` not found`, ephemeral: true };
			const embed = new VOTEmbed();
			embed
				.setTitle(cmd.name!)
				.setDescription(cmd.description)
				.setColor("Random")
				.setTimestamp();
			for (const option of cmd.options || []) {
				embed.addFields({
					name: option.name,
					value: `**Type**: ${getOptionName(option.type)}\n**Required**: ${"required" in option ? (option.required ? "Yes" : "No") : "Yes"}`,
					inline: true,
				});
			}
			const prefix = message ? await getPrefix(message) : "/";
			cmd.perms &&
				cmd.perms != "dev" &&
				embed.addFields({
					name: "Permissions",
					value:
						cmd.perms.map((a) => camelToTitleCase(a.toString())).join(", ") ||
						"None",
				});
			embed.addFields({
				name: "Syntax",
				value: `\`\`\`${prefix}${cmd.name} ${cmd.options?.map((opt) => (("required" in opt ? opt.required : true) ? `<${opt.name}>` : `[${opt.name}]`)).join(" ")}\`\`\``,
			});

			cmd.aliases &&
				cmd.aliases.length > 0 &&
				embed.addFields({
					name: "Aliases",
					value: cmd.aliases.join(", "),
				});
			return {
				embeds: [embed],
				content: `Go to ${getFrontEndURL()}/commands for all commands.`,
				ephemeral: true,
			};
		}
	},
} as ICommand;
