import { ApplicationCommandOptionType, type GuildTextBasedChannel } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Purges messages from a channel',
	options: [
		{
			name: 'amount',
			description: 'The amount of messages to purge',
			type: ApplicationCommandOptionType.Integer,
			required: true,
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
	execute: async ({ channel, args, message }) => {
		const amount = args.get('amount') as number;
		const bots = args.get('bots') as boolean | undefined;
		const user = args.get('user') as string | undefined;
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
			let messages = await (channel as GuildTextBasedChannel).messages.fetch({ limit: amount });

			if (bots) {
				messages = messages.filter(msg => msg.author.bot);
			}

			if (user) {
				messages = messages.filter(msg => msg.author.id === user);
			}

			if (before) {
				messages = messages.filter(msg => msg.createdTimestamp < msg.createdTimestamp);
			}

			if (after) {
				const msg = await (channel as GuildTextBasedChannel).messages.fetch(after);
				messages = messages.filter(msg => msg.createdTimestamp > msg.createdTimestamp);
			}

			if (contains) {
				messages = messages.filter(msg => msg.content.includes(contains));
			}

			const deletedMessages = await (channel as GuildTextBasedChannel).bulkDelete(messages, true);

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
