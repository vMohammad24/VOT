import numeral from "numeral";
import commandHandler from "../..";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";

export default {
	description: "Pong!",
	shouldCache: true,
	execute: async ({ handler, user }) => {
		const wsLatency = handler.client.ws.ping;
		const pStart = performance.now();
		try {
			await handler.prisma.$queryRaw`SELECT 1`;
		} catch (error) {
			commandHandler.logger.error("Database ping failed:", error);
		}
		const pEnd = performance.now();
		handler.prisma.$disconnect();
		const llStats = await (
			await handler.kazagumo.getLeastUsedNode()
		).rest.stats();
		const embed = await new VOTEmbed()
			.setTitle("Pong!")
			.addFields([
				{
					name: "Websocket Latency",
					value: `${wsLatency === -1 ? "N/A" : `${wsLatency}ms`}`,
				},
				{ name: "Database Latency", value: `${(pEnd - pStart).toFixed(1)}ms` },
				...(llStats && llStats.playingPlayers !== 0
					? [
							{
								name: "Playing Players",
								value: llStats.playingPlayers.toString(),
								inline: true,
							},
							{
								name: "Players CPU",
								value: `${numeral(llStats.cpu.lavalinkLoad).format("0,0")}%`,
								inline: true,
							},
						]
					: []),
			])
			.author(user)
			.setTimestamp()
			.dominant();
		return {
			embeds: [embed],
		};
	},
} as ICommand;
