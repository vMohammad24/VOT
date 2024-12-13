import { ApplicationCommandOptionType, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { pagination, PaginationPage } from "../../util/pagination";

export default {
    name: 'cases',
    description: 'View a list of moderation cases',
    options: [
        {
            name: 'user',
            description: 'The user to view cases for',
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    perms: ['ManageMessages'],
    execute: async ({ guild, args, handler: { client, prisma }, message, interaction }) => {
        const user = args.get('user') as GuildMember;
        const cases = await prisma.case.findMany({
            where: {
                guildId: guild.id,
                targetId: user?.id,
            },
        });
        if (!cases.length) {
            return { content: 'No cases found.', ephemeral: true };
        }
        const embed = new EmbedBuilder()
            .setTitle('Moderation Cases')
            .setDescription(user ? `Cases for ${user.user.tag}` : 'All cases')
            .setColor('Blue')
            .setTimestamp();

        const pages: PaginationPage[] = [];
        const itemsPerPage = 5;

        for (let i = 0; i < cases.length; i += itemsPerPage) {
            const pageItems = cases.slice(i, i + itemsPerPage);
            const pageEmbed = new EmbedBuilder()
                .setTitle('Moderation Cases')
                .setDescription(user ? `Cases for ${user.user.tag}` : 'All cases')
                .setColor('Blue')
                .setTimestamp();

            const caseList = pageItems.map((c) => {
                let targetDisplay = 'Unknown';
                if (c.type === 'Nuke' || c.type === 'Purge') {
                    const channel = guild.channels.cache.get(c.targetId) as TextChannel;
                    if (channel) {
                        targetDisplay = `#${channel.name} (<#${channel.id}>)`;
                    } else {
                        targetDisplay = `Channel ID: ${c.targetId}`;
                    }
                } else {
                    targetDisplay = `<@${c.targetId}>`;
                }
                return `**Case #${c.caseId}** | ${c.type}\n` +
                    `├ Target: ${targetDisplay}\n` +
                    `├ Moderator: <@${c.moderatorId}>\n` +
                    `└ Reason: ${c.reason || 'No reason provided'}`
            }
            );

            pageEmbed.setDescription(caseList.join('\n\n'));
            pages.push({ page: pageEmbed, pageNumber: Math.floor(i / itemsPerPage), name: `Cases ${pageItems[0].caseId}-${pageItems[pageItems.length - 1].caseId}` });
        }

        return pagination({
            interaction,
            message,
            pages,
            type: 'select'
        });
    },
} as ICommand