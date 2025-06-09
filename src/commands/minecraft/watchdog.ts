import axios from "axios";
import { EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	name: "watchdog",
	description: "Check the staff and watchdog bans in the last minute",
	type: "installable",
	execute: async () => {
		const res = await axios.get(
			"https://api.plancke.io/hypixel/v1/punishmentStats",
		);
		if (res.data.success === true) {
			const {
				watchdog_lastMinute,
				watchdog_total,
				watchdog_rollingDaily,
				staff_rollingDaily,
				staff_total,
			} = res.data.record;
			const embed = new EmbedBuilder()
				.setColor("Random")
				.setTitle("Hypixel Ban Status")
				.setDescription(
					`WatchDog last minute: ${watchdog_lastMinute}\nWatchDog Total: ${watchdog_total}\nWatchDog Daily: ${watchdog_rollingDaily}\n
           Staff Daily: ${staff_rollingDaily}\nStaff Total: ${staff_total}
                `,
				)
				.setTimestamp(Date.now())
				.setThumbnail(
					"https://cdn.nest.rip/uploads/99c9a424-071a-4199-b01d-af62b55dfa6b.png",
				);
			return { embeds: [embed] };
		}
		return "No results found";
	},
} as ICommand;
