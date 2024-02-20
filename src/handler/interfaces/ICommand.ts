import type { ApplicationCommandOption, ChatInputCommandInteraction, Client, CommandInteraction, Guild, GuildMember, InteractionReplyOptions, Message, MessagePayload, PermissionFlags, PermissionResolvable, TextBasedChannel, TextChannel } from "discord.js";
import type CommandHandler from "..";
import type { KazagumoPlayer } from "kazagumo";


export enum UserTier {
    Free = 0,
    Premium = 1,
    Beta = 2,
}

export enum GuildTier {
    Free = 0,
    Premium = 1,
}
export default interface ICommand {
    name?: string;
    description: string | "No description provided";
    aliases?: string[];
    perms?: PermissionResolvable[] | "dev" | null;
    cooldown?: number;
    category?: string;
    userTier?: number;
    guildTier?: GuildTier;
    slashOnly?: boolean | false;
    needsPlayer?: boolean | false;
    options?: ApplicationCommandOption[];
    init?: (handler: CommandHandler) => Promise<void> | void | null | undefined;
    execute: (ctx: CommandContext) => Promise<MessagePayload | string | InteractionReplyOptions | null | undefined>;
}

export interface CommandContext {
    message: Message | null;
    args: string[];
    guild: Guild;
    member: GuildMember;
    channel: TextBasedChannel;
    interaction: ChatInputCommandInteraction | null;
    handler: CommandHandler;
    player: KazagumoPlayer | null;
}