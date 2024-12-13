import {
	ApplicationCommandOptionType,
	FetchMessagesOptions,
	GuildMember,
	type GuildTextBasedChannel,
} from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { createCase } from '../../util/cases';

export default {
	description: 'Purges messages from a channel',
	options: [
		{
			name: 'amount',
			description: 'The amount of messages to purge (default: 100)',
			type: ApplicationCommandOptionType.Integer,
			required: false,
		},
		{
			name: 'bots',
			description: 'Purge messages from bots ONLY',
			type: ApplicationCommandOptionType.Boolean,
			required: false,
		},
		{
			name: 'user',
			description: 'Purge messages from a specific user',
			type: ApplicationCommandOptionType.User,
			required: false,
		},
		{
			name: 'before',
			description: 'Purge messages sent before a specific message ID',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
		{
			name: 'after',
			description: 'Purge messages sent after a specific message ID',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
		{
			name: 'contains',
			description: 'Purge messages containing specific text',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
	perms: ['ManageMessages'],
	execute: async ({ channel, args, message, guild, member: ranBy }) => {
		const amount = (args.get('amount') as number) || 100;
		const bots = args.get('bots') as boolean | undefined;
		const user = args.get('user') as GuildMember | undefined;
		const before = args.get('before') as string | undefined;
		const after = args.get('after') as string | undefined;
		const contains = args.get('contains') as string | undefined;

		if (!amount || isNaN(amount)) {
			return {
				content: 'Invalid amount',
				ephemeral: true,
			};
		}

		try {
			await message?.delete();
			const fetchOptions: FetchMessagesOptions = { limit: Math.min(amount, 100) };
			if (before) fetchOptions.before = before;
			if (after) fetchOptions.after = after;
			let messages = await (channel as GuildTextBasedChannel).messages.fetch(fetchOptions);
			messages = messages.filter(msg => {

				if (Date.now() - msg.createdTimestamp > 1209600000) return false;

				if (bots && !msg.author.bot) return false;
				if (user && msg.author.id !== user.id) return false;
				if (contains && !msg.content.toLowerCase().includes(contains.toLowerCase())) return false;

				return true;
			});

			if (messages.size === 0) {
				throw new Error('No messages found matching the criteria');
			}


			const deletedMessages = await (channel as GuildTextBasedChannel).bulkDelete(messages);


			await createCase(
				guild.id,
				'Purge',
				channel.id,
				ranBy.id,
				`Purged ${deletedMessages.size} messages in #${(channel as GuildTextBasedChannel).name}`
			);

			return {
				content: `Purged ${deletedMessages.size} messages`,
				ephemeral: true,
			};
		} catch (e) {
			return {
				content: `Failed to purge messages (${(e as any).message})`,
				ephemeral: true,
			};
		}
	},
} as ICommand;
