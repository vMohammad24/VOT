import { Client, EmbedBuilder, Routes } from 'discord.js';
import numeral from 'numeral';
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
		const messageLatency = Date.now() - (interaction?.createdTimestamp || message?.createdTimestamp)!;
		await interaction?.deferReply();
		const wsLatency = handler.client.ws.ping;
		const restLatency = await restPing(handler.client);
		const pStart = Date.now();
		await handler.prisma.$queryRaw`SELECT 1`;
		const pEnd = Date.now();
		handler.prisma.$disconnect();
		const llStats = await (await handler.kazagumo.getLeastUsedNode()).rest.stats();
		const embed = new EmbedBuilder()
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
			.setTimestamp();
		if (llStats) {
			embed.addFields({
				name: 'Playing players',
				value: '```' + llStats.playingPlayers + '```',
				inline: true
			},
				{
					name: 'Players CPU',
					value: '```' + numeral(llStats.cpu.lavalinkLoad).format('0,0') + '%' + '```',
				})
		}
		return {
			embeds: [
				embed
			],
		};
	},
} as ICommand;
