import axios from "axios";
import { ApplicationCommandOptionType, type Attachment } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { uploadFile } from "../../util/nest";
export default {
	name: "upload",
	description: "Upload a file to nest.rip",
	options: [
		{
			name: "file",
			type: ApplicationCommandOptionType.Attachment,
			description: "The file to upload",
			required: true,
		},
	],
	// userTier: UserTier.Beta,
	type: "all",
	execute: async ({ interaction, args }) => {
		await interaction?.deferReply({ ephemeral: true });
		const file = (args.get("file") as Attachment) || null;
		if (!file)
			return { ephemeral: true, content: "Please provide a file to upload" };
		const content = (await axios.get(file.url, { responseType: "arraybuffer" }))
			.data;
		const f = new File([content], file.name);
		const res = await uploadFile(f);
		return {
			content: res.accessibleURL,
		};
	},
} as ICommand;
