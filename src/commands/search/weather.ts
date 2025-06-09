import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import { DDGWeather } from "../../util/ddg";
import { type PaginationPage, pagination } from "../../util/pagination";
import { camelToTitleCase } from "../../util/util";
function getTemperatureColor(temp: number): number {
	if (temp < 0) return 0x9df9ff;
	if (temp < 10) return 0x0099ff;
	if (temp < 20) return 0x00cc66;
	if (temp < 30) return 0xffcc00;
	return 0xff6600;
}

function getWeatherEmoji(condition: string): string {
	const conditionLower = condition.toLowerCase();
	if (conditionLower.includes("rain") || conditionLower.includes("drizzle"))
		return "🌧️";
	if (conditionLower.includes("snow") || conditionLower.includes("flurries"))
		return "❄️";
	if (conditionLower.includes("cloud")) return "☁️";
	if (conditionLower.includes("clear") || conditionLower.includes("sunny"))
		return "☀️";
	if (conditionLower.includes("storm") || conditionLower.includes("thunder"))
		return "⛈️";
	if (conditionLower.includes("fog") || conditionLower.includes("mist"))
		return "🌫️";
	if (conditionLower.includes("wind")) return "💨";
	if (conditionLower.includes("hail")) return "🌨️";

	return "🌡️";
}

function formatWindDirection(degrees: number): string {
	const directions = [
		"N",
		"NNE",
		"NE",
		"ENE",
		"E",
		"ESE",
		"SE",
		"SSE",
		"S",
		"SSW",
		"SW",
		"WSW",
		"W",
		"WNW",
		"NW",
		"NNW",
	];
	const index = Math.round(degrees / 22.5) % 16;
	return `${directions[index]} (${degrees}°)`;
}

export default {
	name: "weather",
	description: "Get the weather for a location",
	category: "search",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "location",
			description: "The location to get the weather for",
			required: true,
		},
	],
	type: "all",
	execute: async ({ args, interaction, message }) => {
		const location = args.get("location") as string;
		if (!location)
			return {
				content: "Please provide a location.",
				ephemeral: true,
			};
		const weather = await DDGWeather(location);
		if (!weather || weather.error)
			return {
				content: "No results found.",
				ephemeral: true,
			};

		const pages: PaginationPage[] = [];

		const currentTemp = weather.currentWeather.temperature;
		const currentEmoji = getWeatherEmoji(weather.currentWeather.conditionCode);
		const currentWeatherEmbed = new EmbedBuilder()
			.setTitle(`🌦️ Weather in ${weather.location}`)
			.setDescription(
				`**${currentEmoji} ${camelToTitleCase(weather.currentWeather.conditionCode)}**`,
			)
			.setColor(getTemperatureColor(currentTemp))
			.addFields(
				{
					name: "🌡️ Temperature",
					value: `${currentTemp}°C (Feels like: ${weather.currentWeather.temperatureApparent}°C)`,
					inline: false,
				},
				{
					name: "💧 Humidity",
					value: `${weather.currentWeather.humidity}%`,
					inline: true,
				},
				{
					name: "💨 Wind",
					value: `${weather.currentWeather.windSpeed} m/s from ${formatWindDirection(weather.currentWeather.windDirection)}`,
					inline: true,
				},
			)
			.setFooter({ text: "Last updated" })
			.setTimestamp(new Date(weather.currentWeather.asOf));

		pages.push({
			page: { embeds: [currentWeatherEmbed] },
			name: "Today's Weather",
		});

		weather.forecastDaily.days.forEach((day) => {
			const date = new Date(day.forecastStart);
			const formattedDate = date.toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
			});
			const avgTemp = (day.temperatureMax + day.temperatureMin) / 2;
			const dayEmoji = getWeatherEmoji(day.conditionCode);

			const dailyForecastEmbed = new EmbedBuilder()
				.setTitle(`🗓️ Forecast for ${formattedDate}`)
				.setColor(getTemperatureColor(avgTemp))
				.setDescription(`**${dayEmoji} ${day.conditionCode}**`)
				.addFields(
					{
						name: "🌡️ Temperature Range",
						value: `${day.temperatureMin}°C to ${day.temperatureMax}°C`,
						inline: false,
					},
					{
						name: `☀️ Daytime ${getWeatherEmoji(day.daytimeForecast.conditionCode)}`,
						value:
							`**${day.daytimeForecast.conditionCode}**\n` +
							`Temperature: ${day.daytimeForecast.temperatureMin}°C to ${day.daytimeForecast.temperatureMax}°C`,
						inline: true,
					},
					{
						name: `🌙 Overnight ${getWeatherEmoji(day.overnightForecast.conditionCode)}`,
						value:
							`**${day.overnightForecast.conditionCode}**\n` +
							`Temperature: ${day.overnightForecast.temperatureMin}°C to ${day.overnightForecast.temperatureMax}°C`,
						inline: true,
					},
				)
				.setFooter({ text: "Forecast as of" })
				.setTimestamp(new Date(day.forecastStart));

			pages.push({
				page: { embeds: [dailyForecastEmbed] },
				name: `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}/${date.getMonth() + 1}`,
			});
		});

		await pagination({
			interaction,
			message,
			pages,
			type: "select",
		});
	},
} as ICommand;
