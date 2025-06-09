import { ApplicationCommandOptionType } from "discord.js";
import numeral from "numeral";
import type ICommand from "../../handler/interfaces/ICommand";
import {
	exchangeRates,
	findCurrency,
	isValidCurrency,
	loadExchangeRates,
	parseAbbreviatedNumber,
} from "../../util/currency";

export default {
	description: "Convert currencies",
	type: "all",
	options: [
		{
			name: "amount",
			description: "amount of currency",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "from",
			description: "the currency to convert from",
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
		},
		{
			name: "to",
			description: "the currency to convert to",
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
		},
	],
	autocomplete: async (interaction) => {
		if (exchangeRates.length === 0) await loadExchangeRates();
		const from = interaction.options.getFocused();
		interaction.respond(
			exchangeRates
				.map((x) => ({ name: x.name, value: x.key }))
				.filter((x) => x.name.toLowerCase().includes(from.toLowerCase()))
				.slice(0, 25),
		);
	},
	aliases: ["con", "conv", "currency", "exch"],
	execute: async ({ args }) => {
		const a = args.get("amount");
		const fromQuery = args.get("from") as string;
		const toQuery = args.get("to") as string;

		if (!a || !fromQuery || !toQuery)
			return {
				content: "Please provide amount, from currency, and to currency",
				ephemeral: true,
			};

		const eR = await loadExchangeRates();

		if (!isValidCurrency(fromQuery, eR))
			return {
				content: `Invalid source currency "${fromQuery}". Use the autocomplete to select a valid currency.`,
				ephemeral: true,
			};

		if (!isValidCurrency(toQuery, eR))
			return {
				content: `Invalid target currency "${toQuery}". Use the autocomplete to select a valid currency.`,
				ephemeral: true,
			};

		const amount = parseAbbreviatedNumber(a as string);
		if (Number.isNaN(amount))
			return {
				content: "Invalid amount format. Examples: 100, 1k, 1m, 1b, 1t",
				ephemeral: true,
			};

		const fromCurrency = findCurrency(fromQuery, eR)!;
		const toCurrency = findCurrency(toQuery, eR)!;

		const res = amount * (toCurrency.value / fromCurrency.value);
		return {
			content: `${numeral(amount).format("0,0")}${fromCurrency.unit} is ${numeral(res).format("0,0.0000")}${toCurrency.unit}`,
		};
	},
} as ICommand;
