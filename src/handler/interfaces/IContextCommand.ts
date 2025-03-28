import type {
	ContextMenuCommandType,
	Interaction,
	InteractionEditReplyOptions,
	InteractionReplyOptions,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
} from "discord.js";

export interface IContextCommand {
	name?: string;
	description: string | "No description provided";
	id?: string;
	disabled?: boolean;
	type: ContextMenuCommandType;
	context?: "dmOnly" | "guildOnly" | "installable" | "all";
	interactionHandler?: (
		interaction: Interaction,
	) => Promise<void> | void | null | undefined;
	execute: (
		interaction:
			| MessageContextMenuCommandInteraction
			| UserContextMenuCommandInteraction,
	) => Promise<
		any | InteractionReplyOptions | string | InteractionEditReplyOptions
	>;
}
