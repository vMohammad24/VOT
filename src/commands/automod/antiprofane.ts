import axios from 'axios';
import {
	ApplicationCommandOptionType,
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	Role,
} from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

const profanity: string[] = (
	(await axios.get('https://raw.githubusercontent.com/censor-text/profanity-list/main/list/en.txt')).data as string
)
	.split('\n')
	.slice(0, 1000);

export default {
	description: 'Adds automod rules to disallow profanity',
	options: [
		{
			name: 'role',
			description: 'The role to add for automod bypass',
			type: ApplicationCommandOptionType.Role,
			required: false,
		},
	],
	perms: ['ManageGuild'],
	execute: async ({ args, guild, member }) => {
		const role = (args.get('role') as Role) || undefined;
		const rule = await guild.autoModerationRules.create({
			actions: [
				{
					type: AutoModerationActionType.BlockMessage,
					metadata: {},
				},
			],
			eventType: AutoModerationRuleEventType.MessageSend,
			name: `VOT's profanity`,
			triggerType: AutoModerationRuleTriggerType.Keyword,
			enabled: true,
			reason: `VOT's profanity list enabled by ${member.user.username}`,
			exemptRoles: [role],
			triggerMetadata: {
				keywordFilter: profanity.map((word) => word.toLowerCase()),
			},
		});
		const rule2 = await guild.autoModerationRules.create({
			actions: [
				{
					type: AutoModerationActionType.BlockMessage,
					metadata: {},
				},
			],
			eventType: AutoModerationRuleEventType.MessageSend,
			name: `discord's profanity filter (VOT)`,
			triggerType: AutoModerationRuleTriggerType.KeywordPreset,
			enabled: true,
			reason: `VOT's anti profanity enabled by ${member.user.username}`,
			exemptRoles: [role],
			triggerMetadata: {
				presets: [
					AutoModerationRuleKeywordPresetType.Profanity,
					AutoModerationRuleKeywordPresetType.SexualContent,
					AutoModerationRuleKeywordPresetType.Slurs,
				],
			},
		});
		const rule3 = await guild.autoModerationRules.create({
			actions: [
				{
					type: AutoModerationActionType.BlockMessage,
					metadata: {},
				},
			],
			eventType: AutoModerationRuleEventType.MessageSend,
			name: `discord's anti mention spam (VOT)`,
			triggerType: AutoModerationRuleTriggerType.Spam,
			enabled: true,
			reason: `VOT's anti-mention spam enabled by ${member.user.tag}`,
			exemptRoles: [role],
			triggerMetadata: {
				mentionRaidProtectionEnabled: true,
				mentionTotalLimit: 10,
			},
		});

		return {
			content: `${rule.name}, ${rule2.name}, ${rule3.name} has been created`,
			ephemeral: true,
		};
	},
} as ICommand;
