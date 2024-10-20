import { Client, EmbedBuilder, Routes } from 'discord.js';
import type ICommand from '../../handler/interfaces/ICommand';


const restPing = async (client: Client) => {
	const start = Date.now();
	await client.rest.get(Routes.gatewayBot())
	return Date.now() - start;
}

export default {
	description: 'Pong!',
	shouldCache: true,
	execute: async ({ interaction, message, handler }) => {
		await interaction?.deferReply();
		const [restLatency, wsLatency, pStart] = await Promise.all([
			restPing(handler.client),
			handler.client.ws.ping,
			(async () => {
				const pStart = Date.now();
				await handler.prisma.$queryRaw`SELECT 1`;
				return pStart;
			})()
		]);
		const pEnd = Date.now();
		handler.prisma.$disconnect();
		const messageLatency = Date.now() - (interaction?.createdTimestamp || message?.createdTimestamp)!;
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
							name: 'Websocket Latency',
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
