import { ContextMenuCommandInteraction, ContextMenuCommandType, InteractionEditReplyOptions, InteractionReplyOptions, Message, User } from "discord.js";
import CommandHandler from "..";

export interface IContextCommand {
    name?: string;
    id?: string;
    type: ContextMenuCommandType;
    context?: 'dmOnly' | 'guildOnly' | 'installable' | 'all';
    execute: (ctx: {
        interaction: ContextMenuCommandInteraction;
        user: User,
        message: Message<boolean>
        handler: CommandHandler
    }) => Promise<any | InteractionReplyOptions | string | InteractionEditReplyOptions>;
}