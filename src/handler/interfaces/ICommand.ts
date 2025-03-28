import type { UserTier } from "@prisma/client";
import type {
	ApplicationCommandOption,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	Interaction,
	InteractionReplyOptions,
	InteractionResponse,
	Message,
	MessageEditOptions,
	MessagePayload,
	OmitPartialGroupDMChannel,
	PermissionResolvable,
	TextBasedChannel,
	User,
} from "discord.js";
import type { KazagumoPlayer } from "kazagumo";
import type CommandHandler from "..";
import type { ArgumentMap } from "../validations/5_args";

export default interface ICommand {
	name?: string;
	id?: string;
	description: string | "No description provided";
	aliases?: string[];
	perms?: PermissionResolvable[] | "dev" | null;
	cooldown?: number;
	category?: string;
	userTier?: UserTier;
	disabled?: boolean;
	slashOnly?: boolean;
	shouldCache?: boolean;
	needsPlayer?: boolean;
	advancedChoices?: boolean;
	type?: "dmOnly" | "guildOnly" | "installable" | "all" | "legacy";
	options?: ApplicationCommandOption[];
	init?: (handler: CommandHandler) => Promise<void> | void | null | undefined;
	interactionHandler?: (
		interaction: Interaction,
	) => Promise<void> | void | null | undefined;
	messageHandler?: (
		message: Message,
	) => Promise<void> | void | null | undefined;
	autocomplete?: (
		interaction: AutocompleteInteraction,
	) => Promise<void> | void | null | undefined;
	execute: (
		ctx: CommandContext,
	) => Promise<
		MessagePayload | string | InteractionReplyOptions | null | undefined
	>;
}

export interface CommandContext {
	message: Message | null;
	args: ArgumentMap<Record<string, any>>;
	guild: Guild;
	member: GuildMember;
	user: User;
	channel: TextBasedChannel;
	interaction: ChatInputCommandInteraction | null;
	handler: CommandHandler;
	player: KazagumoPlayer | undefined;
	editReply: (
		content:
			| string
			| InteractionReplyOptions
			| MessageEditOptions
			| MessagePayload,
		msg?:
			| Message<boolean>
			| OmitPartialGroupDMChannel<Message<boolean>>
			| InteractionResponse<boolean>,
	) => Promise<void>;
	cID?: string;
}
