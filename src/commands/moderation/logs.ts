import { ApplicationCommandOptionType, AuditLogEvent } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";
import { pagination, PaginationPage } from "../../util/pagination";
import { camelToTitleCase, capitalizeString, isNullish } from "../../util/util";
import VOTEmbed from "../../util/VOTEmbed";

export default {
    description: 'Find Information about an action in the audit logs',
    name: 'logs',
    options: [
        {
            name: 'action',
            description: 'The action to search for',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        }
    ],
    autocomplete: async (int) => {
        const action = int.options.getFocused();
        if (!action || isNullish(action)) int.respond([{ name: 'Search to find an action', value: '' }]);
        const actions = Object.keys(AuditLogEvent)
        const filtered = actions.filter((a) => a.toLowerCase().includes(action.toLowerCase()) ?? camelToTitleCase(a).toLowerCase().includes(action.toLowerCase()));
        const options = filtered.map((a) => ({ name: camelToTitleCase(a), value: (AuditLogEvent as Record<string, any>)[a].toString() }));
        if (!int.responded) int.respond(options.slice(0, 25));
    },
    perms: ['ViewAuditLog'],
    aliases: ['auditlog', 'log', 'audit'],
    execute: async ({ guild, args, interaction, message }) => {
        const action = args.get('action');
        if (!guild) return;
        const logs = await guild.fetchAuditLogs({ type: parseInt(action) });
        const pages: PaginationPage[] = logs.entries.map((entry) => {
            const r = entry.action ? camelToTitleCase(AuditLogEvent[entry.action]) : undefined;
            const changes = entry.changes
                ? entry.changes.map(change => {
                    const oldValue = typeof change.old === 'object' && change.old?.toString() === '[object Object]' ? 'unknown' : change.old;
                    const newValue = typeof change.new === 'object' && change.new?.toString() === '[object Object]' ? 'unknown' : change.new;
                    return `**${capitalizeString(change.key)}**: ${oldValue || 'none'} ➜ ${newValue || 'none'}`;
                }).join('\n')
                : '';
            const target = `${typeof entry.target === 'object' && entry.target?.toString() === '[object Object]' ? 'unknown' : entry.target?.toString()} (${entry.targetType ? camelToTitleCase(entry.targetType as string) : 'unknown'})`;
            const extra = `${typeof entry.extra === 'object' && entry.extra?.toString() === '[object Object]' ? 'unknown' : entry.extra}`;
            // const extra = entry.extra ? entry.extra.map((e) => `**${e.key}**: ${e.old || 'none'} ➜ ${e.new || 'none'}`).join('\n') : '';
            const description = [
                entry.reason ? `**Reason**: ${entry.reason}` : '',
                entry.target ? `**Target**: ${target}` : '',
                entry.extra ? `**Extra**: ${extra}` : '',
                changes ? `**Changes**:\n${changes}` : ''
            ].filter(Boolean).join('\n');
            return {
                page: {
                    embeds: [
                        new VOTEmbed()
                            .setTitle(r ?? null)
                            .setAuthor(
                                entry.executor
                                    ? {
                                        name: entry.executor.tag,
                                        iconURL: entry.executor.displayAvatarURL()
                                    }
                                    : null
                            )
                            .setDescription(description)
                            .setFooter({ text: `ID: ${entry.id}` })
                            .setTimestamp(entry.createdAt)
                    ]
                },
                name: r,
                description: entry.reason?.toString()
            }
        });
        if (pages.length === 0) return { content: 'No logs found', ephemeral: true };
        await pagination({ interaction, message, pages, type: 'select' });
    }
} as ICommand
