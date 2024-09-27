import { UserTier } from '@prisma/client';
import type {
	ApplicationCommandOption,
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	Message,
	MessagePayload,
	PermissionResolvable,
	TextBasedChannel,
	User,
} from 'discord.js';
import type { KazagumoPlayer } from 'kazagumo';
import type CommandHandler from '..';
import type { ArgumentMap } from '../validations/args';

export default interface ICommand {
	name?: string;
	id?: string;
	description: string | 'No description provided';
	aliases?: string[];
	perms?: PermissionResolvable[] | 'dev' | null;
	cooldown?: number;
	category?: string;
	userTier?: UserTier;
	disabled?: boolean;
	slashOnly?: boolean;
	needsPlayer?: boolean;
	type?: 'dmOnly' | 'guildOnly' | 'installable' | 'all';
	options?: ApplicationCommandOption[];
	init?: (handler: CommandHandler) => Promise<void> | void | null | undefined;
	execute: (ctx: CommandContext) => Promise<MessagePayload | string | InteractionReplyOptions | null | undefined>;
}

export interface CommandContext {
	message: Message | null;
	args: ArgumentMap<any>;
	guild: Guild;
	member: GuildMember;
	user: User;
	channel: TextBasedChannel;
	interaction: ChatInputCommandInteraction | null;
	handler: CommandHandler;
	player: KazagumoPlayer | undefined;
}
