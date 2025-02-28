import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { getMember } from "../../util/database";

export default {
    name: 'ticket remove',
    description: 'Remove a member from the ticket',
    options: [
        {
            name: 'member',
            description: 'The user to remove',
            type: ApplicationCommandOptionType.User,
            required: true,
        }
    ],
    execute: async ({ member: executer, channel, guild, args, handler }) => {
        const { prisma } = handler;
        const member = args.get('member') as GuildMember | null;
        if (!member)
            return {
                content: 'Invalid user',
                ephemeral: true,
            };
        const ticket = await prisma.ticket.findFirst({
            where: {
                guildId: guild?.id!,
                channelId: channel!.id!,
            },
            include: {
                members: true,
            },
        });
        if (!ticket) {
            return {
                content: 'Invalid channel',
                ephemeral: true,
            };
        }
        const ticketSettings = await prisma.ticketSettings.findUnique({ where: { guildId: guild!.id } });
        if (!ticketSettings)
            return {
                content: 'Please setup ticket settings first',
                ephemeral: true,
            };
        const ticketsRole = ticketSettings.roleId ? await guild!.roles.fetch(ticketSettings.roleId) : null;

        if (ticket.ownerId !== executer.id && !executer.roles.cache.has(ticketsRole!.id)) {
            return {
                content: 'You are not the owner of this ticket',
                ephemeral: true,
            };
        }

        const pMember = await getMember(member, {
            id: true,
        });
        if (!pMember) {
            return {
                content: `Member ${member.user.tag} not found.`,
                ephemeral: true,
            };
        }
        if (!ticket.members.map((a) => a.id).includes(pMember?.id!)) {
            return {
                content: `${member.user.tag} is not in this ticket`,
                ephemeral: true,
            };
        }
        await prisma.ticket.update({
            where: {
                id: ticket.id,
            },
            data: {
                members: {
                    disconnect: {
                        id: pMember?.id!,
                    },
                },
            },
        });
        if (channel.isTextBased() && 'permissionOverwrites' in channel) {
            await channel.permissionOverwrites.delete(member.id);
        }
        return {
            content: `${member.user.tag} has been removed from the ticket`,
        };

    }
} as ICommand