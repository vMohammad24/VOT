import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { DDGTime } from "../../util/ddg";

export default {
	name: "time",
	description: "Show the current time for a specific timezone",
	type: "all",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "zone",
			description: "Timezone or location",
			required: true,
		},
	],
	execute: async ({ args }) => {
		const zone = (args.get("zone") as string)?.trim();
		if (!zone)
			return { ephemeral: true, content: "Please provide a timezone." };

		const time = await DDGTime(zone);
		if (!time || time.error || !time.locations || time.locations.length === 0) {
			return { ephemeral: true, content: "No results found." };
		}

		const location = time.locations[0];
		const datetime = location.time.datetime;
		const formattedTime = `${datetime.hour.toString().padStart(2, "0")}:${datetime.minute.toString().padStart(2, "0")}:${datetime.second.toString().padStart(2, "0")}`;
		const formattedDate = `${datetime.year}-${datetime.month.toString().padStart(2, "0")}-${datetime.day.toString().padStart(2, "0")}`;

		const sunriseEvent = location.astronomy.objects[0].events.find(
			(e) => e.type === "rise",
		);
		const sunsetEvent = location.astronomy.objects[0].events.find(
			(e) => e.type === "set",
		);
		const sunrise = sunriseEvent
			? `${sunriseEvent.hour.toString().padStart(2, "0")}:${sunriseEvent.minute.toString().padStart(2, "0")}`
			: "N/A";
		const sunset = sunsetEvent
			? `${sunsetEvent.hour.toString().padStart(2, "0")}:${sunsetEvent.minute.toString().padStart(2, "0")}`
			: "N/A";

		const locationName = location.geo.name;
		const country = location.geo.country.name;
		const state = location.geo.state ? `, ${location.geo.state}` : "";
		const coords = `${location.geo.latitude.toFixed(2)}° ${location.geo.latitude >= 0 ? "N" : "S"}, ${location.geo.longitude.toFixed(2)}° ${location.geo.longitude >= 0 ? "E" : "W"}`;

		const embed = new EmbedBuilder()
			.setTitle(`🕒 Time in ${locationName}${state}, ${country}`)
			.setDescription(
				`Current local time in ${locationName} is **${formattedTime}** on **${formattedDate}**`,
			)
			.addFields(
				{
					name: "🗓️ Date & Time",
					value: `${formattedDate} ${formattedTime} (${location.time.timezone.offset})`,
					inline: false,
				},
				{
					name: "🌐 Timezone",
					value: `${location.time.timezone.zonename} (${location.time.timezone.zoneabb})`,
					inline: false,
				},
				{
					name: "📍 Coordinates",
					value: coords,
					inline: false,
				},
				{
					name: "🌅 Sunrise",
					value: sunrise,
					inline: true,
				},
				{
					name: "🌇 Sunset",
					value: sunset,
					inline: true,
				},
			)
			.setColor("#FFA500")
			.setTimestamp()
			.setFooter({
				text: `Timezone: ${location.geo.zonename} • Requested for: ${zone}`,
			});

		return { embeds: [embed] };
	},
} as ICommand;
