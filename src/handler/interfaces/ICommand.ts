import type { ApplicationCommandOption, ApplicationCommandType, ChatInputCommandInteraction, Client, CommandInteraction, Guild, GuildMember, InteractionReplyOptions, Message, MessagePayload, PermissionFlags, PermissionResolvable, TextBasedChannel, TextChannel, User } from "discord.js";
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
    type?: ApplicationCommandType;
    perms?: PermissionResolvable[] | "dev" | null;
    cooldown?: number;
    category?: string;
    userTier?: number;
    guildTier?: GuildTier;
    disabled?: boolean | false;
    slashOnly?: boolean | false;
    needsPlayer?: boolean | false;
    userInstall?: boolean | false;
    options?: ApplicationCommandOption[];
    init?: (handler: CommandHandler) => Promise<void> | void | null | undefined;
    execute: (ctx: CommandContext) => Promise<MessagePayload | string | InteractionReplyOptions | null | undefined>;
}

export interface CommandContext {
    message: Message | null;
    args: string[];
    guild: Guild;
    member: GuildMember;
    user: User;
    channel: TextBasedChannel;
    interaction: ChatInputCommandInteraction | null;
    handler: CommandHandler;
    player: KazagumoPlayer | undefined;
}