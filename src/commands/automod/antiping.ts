import {
	ApplicationCommandOptionType,
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleTriggerType,
	type GuildMember,
} from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	description: "Disallows users from pinging a user",
	options: [
		{
			name: "user",
			description: "The user to disallow pinging",
			type: ApplicationCommandOptionType.User,
			required: true,
		},
	],
	perms: ["ManageGuild"],
	execute: async ({ args, guild }) => {
		const user = args.get("user") as GuildMember;
		if (!user) return "You must provide a user to disallow pinging";
		const rules = await guild.autoModerationRules.fetch();
		const eRule = rules.find(
			(r) => r.name === `${user.user.username}'s ping block`,
		);
		if (eRule) {
			await eRule.delete();
			return {
				content: `${eRule.name} has been deleted`,
			};
		}
		const rule = await guild.autoModerationRules.create({
			actions: [
				{
					type: AutoModerationActionType.BlockMessage,
					metadata: {
						customMessage: `${user.user.tag} has disabled their pings`,
					},
				},
			],
			eventType: AutoModerationRuleEventType.MessageSend,
			name: `${user.user.username}'s ping block`,
			triggerType: AutoModerationRuleTriggerType.Keyword,
			enabled: true,
			reason: `Pinging ${user.user.username} is not allowed`,
			triggerMetadata: {
				keywordFilter: [`<@${user.id}>`, `<@!${user.id}>`],
			},
		});
		return {
			content: `${rule.name} has been created`,
			ephemeral: true,
		};
	},
} as ICommand;
