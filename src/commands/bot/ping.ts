import numeral from 'numeral';
import type ICommand from '../../handler/interfaces/ICommand';
import VOTEmbed from '../../util/VOTEmbed';

export default {
	description: 'Pong!',
	shouldCache: true,
	execute: async ({ interaction, message, handler }) => {
		const messageLatency = Math.abs(Date.now() - (interaction?.createdTimestamp || message?.createdTimestamp)!)
		await interaction?.deferReply();
		const wsLatency = handler.client.ws.ping;
		const pStart = Date.now();
		await handler.prisma.$queryRaw`SELECT 1`;
		const pEnd = Date.now();
		handler.prisma.$disconnect();
		const llStats = await (await handler.kazagumo.getLeastUsedNode()).rest.stats();
		const embed = new VOTEmbed()
			.setTitle('Pong!')
			.addFields([
				{ name: 'Websocket Latency', value: `${wsLatency == -1 ? 'N/A' : `${wsLatency}ms`}`, inline: true },
				{ name: 'Message Latency', value: `${messageLatency}ms`, inline: true },
				{ name: 'Database Latency', value: `${pEnd - pStart}ms`, inline: true },
				...(llStats && llStats.playingPlayers != 0 ? [
					{ name: 'Playing Players', value: llStats.playingPlayers.toString(), inline: true },
					{ name: 'Players CPU', value: numeral(llStats.cpu.lavalinkLoad).format('0,0') + '%', inline: true }
				] : [])
			])
			.setTimestamp();
		return {
			embeds: [embed],
		};
	},
} as ICommand;
