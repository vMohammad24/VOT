import { nanoid } from 'nanoid/non-secure';
import type ICommand from '../interfaces/ICommand';
import { type CommandContext } from '../interfaces/ICommand';

export default async function (command: ICommand, commandContext: CommandContext) {
    const cId = commandContext.cID || nanoid(10);
    await commandContext.handler.prisma.user.upsert({
        where: {
            id: commandContext.user.id,
        },
        update: {
            name: commandContext.user.username,
            avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
            commands: {
                create: {
                    commandId: command.name!,
                    commandInfo: {
                        args: (commandContext.args as any) || null,
                        guild: (commandContext?.guild && commandContext.guild.id) || null,
                        channel: commandContext?.channel?.id || null,
                        message: commandContext?.message?.id || null,
                        interaction: commandContext?.interaction?.id || null,
                    },
                    id: `cmd_${cId}`
                },
            },
        },
        create: {
            id: commandContext.user.id,
            name: commandContext.user.username,
            avatar: commandContext.user.displayAvatarURL({ extension: 'png' }),
            commands: {
                create: {
                    commandId: command.name!,
                    commandInfo: {
                        args: (commandContext.args as any) || null,
                        guild: commandContext?.guild?.id || null,
                        channel: commandContext?.channel?.id || null,
                        message: commandContext?.message?.id || null,
                        interaction: commandContext?.interaction?.id || null,
                    },
                    id: `cmd_${cId}`
                },
            },
        },
    });
    return true;
}
