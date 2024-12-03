import axios from 'axios';
import { ApplicationCommandOptionType } from 'discord.js';
import numeral from 'numeral';
import type ICommand from '../../handler/interfaces/ICommand';

const exchangeRates: {
	key: string;
	name: string;
	value: number;
	unit: string;
}[] = [];
let lastUpdate: Date = new Date(0);
const updateInterval = 15 * 60 * 1000; // 15 minutes
const loadExchangeRates = async () => {
	if (new Date().getTime() - lastUpdate.getTime() < updateInterval) {
		return exchangeRates;
	}
	const res = await axios.get(`https://api.coingecko.com/api/v3/exchange_rates`);
	const rates = res.data.rates;
	exchangeRates.length = 0;
	for (const [key, value] of Object.entries(rates)) {
		const v = value as any;
		exchangeRates.push({
			key,
			...v,
		});
	}
	return exchangeRates;
};

const parseAbbreviatedNumber = (input: string): number => {
	const match = input.toLowerCase().match(/^([\d.]+)\s*([tkbm])?$/);
	if (!match) return parseFloat(input);

	const [_, num, modifier] = match;
	const value = parseFloat(num);
	if (isNaN(value)) return NaN;

	const multipliers: Record<string, number> = {
		't': 1e12,
		'b': 1e9,
		'm': 1e6,
		'k': 1e3
	};

	return value * (multipliers[modifier] || 1);
};

const findCurrency = (query: string, rates: typeof exchangeRates) => {
	query = query.toLowerCase();
	return rates.find(x =>
		x.key.toLowerCase() === query ||
		x.name.toLowerCase() === query ||
		x.key.toLowerCase().includes(query) ||
		x.name.toLowerCase().includes(query)
	);
};

const isValidCurrency = (query: string, rates: typeof exchangeRates) => {
	if (!query || query.length < 2) return false;
	query = query.toLowerCase();
	return rates.some(x =>
		x.key.toLowerCase() === query ||
		x.name.toLowerCase() === query
	);
};

export default {
	description: 'Convert currencies',
	type: 'all',
	options: [
		{
			name: 'amount',
			description: 'amount of currency',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: 'from',
			description: 'the currency to convert from',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
		},
		{
			name: 'to',
			description: 'the currency to convert to',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true,
		},
	],
	autocomplete: async (interaction) => {
		if (exchangeRates.length == 0) await loadExchangeRates();
		const from = interaction.options.getFocused();
		interaction.respond(
			exchangeRates
				.map((x) => ({ name: x.name, value: x.key }))
				.filter((x) => x.name.toLowerCase().includes(from.toLowerCase()))
				.slice(0, 25),
		);
	},
	aliases: ['con', 'conv', 'currency', 'exch'],
	execute: async ({ args }) => {
		const a = args.get('amount');
		let fromQuery = args.get('from') as string;
		let toQuery = args.get('to') as string;

		if (!a || !fromQuery || !toQuery)
			return {
				content: 'Please provide amount, from currency, and to currency',
				ephemeral: true,
			};

		const eR = await loadExchangeRates();

		// Validate currencies first
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
		if (isNaN(amount))
			return {
				content: 'Invalid amount format. Examples: 100, 1k, 1m, 1b, 1t',
				ephemeral: true,
			};

		const fromCurrency = findCurrency(fromQuery, eR)!; // Safe because we validated
		const toCurrency = findCurrency(toQuery, eR)!;   // Safe because we validated

		const res = amount * (toCurrency.value / fromCurrency.value);
		return {
			content: `${numeral(amount).format('0,0')}${fromCurrency.unit} is ${numeral(res).format('0,0.0000')}${toCurrency.unit}`,
		};
	},
} as ICommand;
