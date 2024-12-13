import { ApplicationCommandOptionType, EmbedBuilder, TextChannel } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';
import { getCase } from '../../util/cases';

export default {
    name: 'case',
    description: 'View a moderation case',
    options: [
        {
            name: 'id',
            description: 'The ID of the case to view',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
    ],
    perms: ['ManageMessages'],
    execute: async ({ guild, args, interaction, handler: { client } }) => {
        // ...existing code...
        const caseId = args.get('id') as number;
        const moderationCase = await getCase(guild.id, caseId);

        if (!moderationCase) {
            return { content: 'Case not found.', ephemeral: true };
        }

        let targetDisplay = 'Unknown';
        if (moderationCase.type === 'Nuke' || moderationCase.type === 'Purge') {
            const channel = guild.channels.cache.get(moderationCase.targetId) as TextChannel;
            if (channel) {
                targetDisplay = `#${channel.name} (<#${channel.id}>)`;
            } else {
                targetDisplay = `Channel ID: ${moderationCase.targetId}`;
            }
        } else {
            targetDisplay = `<@${moderationCase.targetId}>`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Case #${moderationCase.caseId}`)
            .addFields(
                { name: 'Type', value: moderationCase.type, inline: true },
                { name: 'Target', value: targetDisplay, inline: true },
                { name: 'Moderator', value: `<@${moderationCase.moderatorId}>`, inline: true },
                { name: 'Reason', value: moderationCase.reason || 'No reason provided' },
            )
            .setColor('Blue')
            .setTimestamp(moderationCase.createdAt);

        return { embeds: [embed] };
    },
} as ICommand;
