import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { addAPIKey, deleteAPIKey } from "../../api/apiUtils";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	name: "api",
	description: "Generate or delete API keys",
	options: [
		{
			name: "generate",
			description: "Generate a new API key",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "name",
					description: "The name of the key",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
		{
			name: "delete",
			description: "Delete an existing API key",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "key",
					description: "The API key to delete",
					type: ApplicationCommandOptionType.String,
					required: true,
				},
			],
		},
	],
	perms: "dev",
	type: "dmOnly",
	async execute({ interaction, args }) {
		if (!interaction) return;
		const subcommand = interaction.options.getSubcommand();
		const name = interaction.options.getString("name");
		const key = interaction.options.getString("key");
		if (subcommand === "generate") {
			if (!name)
				return {
					ephemeral: true,
					content: "Please provide a name for the key",
				};
			const key = await addAPIKey(name);
			return {
				ephemeral: true,
				embeds: [
					new EmbedBuilder()
						.setTitle("API Key Generated")
						.setAuthor({ name })
						.setColor("Green")
						.setDescription(`\`\`\`${key.id}\`\`\``),
				],
			};
		}
		if (subcommand === "delete") {
			if (!key)
				return {
					ephemeral: true,
					content: "Please provide a key to delete",
				};
			await deleteAPIKey(key);
			return {
				ephemeral: true,
				embeds: [
					new EmbedBuilder()
						.setTitle("API Key Deleted")
						.setColor("Green")
						.setDescription(`\`\`\`${key}\`\`\``),
				],
			};
		}
	},
} as ICommand;
