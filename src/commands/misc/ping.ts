import { Client, EmbedBuilder } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';


const restPing = async (client: Client) => {
	const start = Date.now();
	await client.rest.get('/gateway/bot')
	return Date.now() - start;
}

export default {
	description: 'Pong!',
	execute: async ({ interaction, message, handler }) => {
		const messageLatency = Date.now() - (interaction?.createdTimestamp || message?.createdTimestamp)!;
		const wsLatency = handler.client.ws.ping;
		const restLatency = await restPing(handler.client);
		const pStart = Date.now();
		await handler.prisma.$queryRaw`SELECT 1`;
		const pEnd = Date.now();
		handler.prisma.$disconnect();
		return {
			embeds: [
				new EmbedBuilder()
					.setColor('Random')
					.setTitle('Pong!')
					.addFields(
						{
							name: 'API Latency',
							value: '```' + `${restLatency}ms` + '```',
						},
						{
							name: 'Webscoket Latency',
							value: '```' + `${wsLatency == -1 ? 'N/A' : `${wsLatency}ms`}` + '```',
						},
						{
							name: 'Message Latency',
							value: '```' + `${messageLatency}ms` + '```',
						},
						{
							name: 'Database Latency',
							value: '```' + `${pEnd - pStart}ms` + '```',
						},
					)
					.setTimestamp(),
			],
		};
	},
} as ICommand;
