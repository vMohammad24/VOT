import { inspect } from 'bun';
import { ApplicationCommandOptionType, Colors, EmbedBuilder } from 'discord.js';
import commandHandler, { redis } from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
export default {
	name: 'eval',
	description: 'Allows the developer to evaluate code',
	aliases: ['e'],
	perms: 'dev',
	type: commandHandler.prodMode ? 'dmOnly' : 'all',
	options: [
		{
			name: 'type',
			description: 'The type of code to evaluate',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{
					name: 'TypeScript',
					value: 'ts',
				},
				{
					name: 'JavaScript',
					value: 'js',
				},
				{
					name: 'SQL',
					value: 'sql',
				},
				{
					name: 'Redis',
					value: 'redis',
				},
			],
		},
		{
			name: 'code',
			description: 'The code to evaluate',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	],
	execute: async (ctx) => {
		const { handler, args, channel, guild, interaction, member, message, player } = ctx;
		let code = args.get('code') as string | undefined;
		if (!code) return { content: 'No code provided', ephemeral: true };
		const embed = new EmbedBuilder().setTitle('Eval').setColor(Colors.NotQuiteBlack);
		const excludeCodeWith =
			/token|process|env|meta|secret|password|pass|client\.token|client\.secret|client\.password|client\.pass/gi;
		if (excludeCodeWith.test(code)) {
			embed.setDescription('``nuh uh``');
			return { embeds: [embed] };
		}
		const startTime = new Date();
		// return code;
		try {
			if (code.startsWith('```')) {
				code = code.replace(/```/g, '');
			}
			let evaluatedResult = '';
			switch (args.get('type')) {
				case 'sql':
					evaluatedResult = inspect(JSON.stringify(await handler.prisma.$queryRawUnsafe(code)));
					break;
				case 'redis':
					evaluatedResult = (await redis.eval(code, 0)) as string;
					break;
				case 'js':
					evaluatedResult = eval(code);
					break;
				default:
					evaluatedResult = Function(`"use strict";return ${code}`)();
					break;
			}
			embed.setDescription(`\`\`\`js\n${evaluatedResult}\`\`\``);
		} catch (e) {
			embed.setDescription(`\`\`\`js\n${e}\`\`\``);
		}
		embed.setFooter({
			text: `Took ${new Date().getTime() - startTime.getTime()}ms`,
		});
		return { embeds: [embed] };
	},
} as ICommand;
