import axios from "axios";
import {
	ApplicationCommandOptionType,
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	type Role,
} from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

const profanity: string[] = (
	(
		await axios.get(
			"https://raw.githubusercontent.com/censor-text/profanity-list/main/list/en.txt",
		)
	).data as string
)
	.split("\n")
	.slice(0, 1000);

export default {
	description: "Adds automod rules to disallow profanity",
	options: [
		{
			name: "role",
			description: "The role to add for automod bypass",
			type: ApplicationCommandOptionType.Role,
			required: false,
		},
	],
	perms: ["ManageGuild"],
	execute: async ({ args, guild, member }) => {
		const role = (args.get("role") as Role) || undefined;
		// check if it the rule already exists
		const rules = await guild.autoModerationRules.fetch();
		const eRule = rules.find((r) => r.name === `VOT's profanity`);
		const eRule2 = rules.find(
			(r) => r.name === `discord's profanity filter (VOT)`,
		);
		const eRule3 = rules.find(
			(r) => r.name === `discord's anti mention spam (VOT)`,
		);
		if (eRule && eRule2 && eRule3) {
			await Promise.all([
				await eRule.delete(),
				await eRule2.delete(),
				await eRule3.delete(),
			]);
			return {
				content: `${eRule.name}, ${eRule2.name}, ${eRule3.name} have been deleted`,
			};
		}
		const newRules = await Promise.all([
			guild.autoModerationRules.create({
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
			}),
			guild.autoModerationRules.create({
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
			}),
			guild.autoModerationRules.create({
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
			}),
		]);

		return {
			content: `${newRules.map((r) => r.name).join()} were created`,
			ephemeral: true,
		};
	},
} as ICommand;
