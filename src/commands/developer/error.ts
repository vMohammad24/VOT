import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Gives info about an error for a developer',
	perms: 'dev',
	type: 'dmOnly',
	options: [
		{
			name: 'error_id',
			description: 'the id of the error',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	shouldCache: true,
	execute: async ({ handler, args }) => {
		const { prisma } = handler;
		const id = args.get('error_id') as string | undefined;
		if (!id)
			return {
				content: 'Please provide an error id',
				ephemeral: true,
			};
		const error = await prisma.error.findUnique({ where: { id: `error_${id}` }, include: { command: true } });
		if (!error)
			return {
				ephemeral: true,
				content: 'Error not found',
			};
		return {
			files: [
				error.fullJson
					? new AttachmentBuilder(Buffer.from(error.fullJson.toString()), {
							name: 'error.json',
						})
					: null,
			].filter((a) => a != null),
			embeds: [
				new EmbedBuilder()
					.setTitle('Error info')
					.addFields([
						{
							name: 'Channel',
							value: `<#${error.channelId}> (${error.channelId})` || 'None',
						},
						{
							name: 'Guild ID',
							value: error.guildId || 'None',
						},
					])
					.setDescription(
						error.command ? `\`\`\`json\n${JSON.stringify(error.command?.commandInfo, null, 2)}\`\`\`` : null,
					),
			],
		};
	},
} as ICommand;
