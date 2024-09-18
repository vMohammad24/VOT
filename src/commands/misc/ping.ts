import { EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';

export default {
	description: 'Pong!',
	execute: async ({ interaction, message, handler }) => {
		const apiLatency = handler.client.ws.ping;
		const messageLatency = Date.now() - (interaction?.createdTimestamp || message?.createdTimestamp)!;
		const pStart = Date.now();
		await handler.prisma.$queryRaw`SELECT 1`;
		const pEnd = Date.now();
		await handler.prisma.$disconnect();
		return {
			embeds: [
				new EmbedBuilder()
					.setColor('Random')
					.setTitle('Pong!')
					.addFields(
						{
							name: 'API Latency',
							value: '```' + `${apiLatency == -1 ? 'N/A' : `${apiLatency}ms`}` + '```',
						},
						{
							name: 'Message Latency',
							value: '```' + `${messageLatency}ms` + '```',
						},
						{
							name: "Database Latency",
							value: '```' + `${pEnd - pStart}ms` + '```'
						}
					)
					.setTimestamp(),
			],
		};
	},
} as ICommand;
