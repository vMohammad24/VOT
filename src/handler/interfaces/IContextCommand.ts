import {
	ContextMenuCommandType,
	InteractionEditReplyOptions,
	InteractionReplyOptions,
	MessageContextMenuCommandInteraction,
	UserContextMenuCommandInteraction,
} from 'discord.js';

export interface IContextCommand {
	name?: string;
	description: string | 'No description provided';
	id?: string;
	disabled?: boolean;
	type: ContextMenuCommandType;
	context?: 'dmOnly' | 'guildOnly' | 'installable' | 'all';
	execute: (
		interaction: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction,
	) => Promise<any | InteractionReplyOptions | string | InteractionEditReplyOptions>;
}
