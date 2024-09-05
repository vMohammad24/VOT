import { UserTier } from '@prisma/client';
import { ApplicationCommandOptionType } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';
import { shortenUrl } from '../../util/nest';

export default {
	name: 'shorten',
	description: 'Shorten a URL',
	type: 'all',
	options: [
		{
			name: 'url',
			type: ApplicationCommandOptionType.String,
			description: 'The URL to shorten',
			required: true,
		},
		{
			name: 'password',
			type: ApplicationCommandOptionType.String,
			description: 'The password to protect the URL',
			required: false,
		},
	],
	userTier: UserTier.Premium,
	execute: async ({ interaction, args }) => {
		const url = args.get('url');
		const password = (args.get('password') as string) || undefined;
		if (!url)
			return {
				content: 'Please provide a URL to shorten',
				ephemeral: true,
			};
		const res = await shortenUrl(url, password);
		return { content: res, ephemeral: true };
	},
} as ICommand;
