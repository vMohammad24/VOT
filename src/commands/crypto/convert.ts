import axios from 'axios';
import { ApplicationCommandOptionType, Events } from 'discord.js';
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

export default {
	description: 'Convert currencies',
	type: 'all',
	options: [
		{
			name: 'amount',
			description: 'amount of currency',
			type: ApplicationCommandOptionType.Integer,
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
	init: async (handler) => {
		handler.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isAutocomplete()) return;
			if (interaction.commandName != 'convert') return;
			if (exchangeRates.length == 0) await loadExchangeRates();
			const from = interaction.options.getFocused();
			interaction.respond(
				exchangeRates
					.map((x) => ({ name: x.name, value: x.key }))
					.filter((x) => x.name.toLowerCase().includes(from.toLowerCase()))
					.slice(0, 25),
			);
		});
	},
	aliases: ['con', 'conv', 'currency'],
	execute: async ({ args }) => {
		const a = args.get('amount');
		let from = args.get('from');
		let to = args.get('to');

		if (!a || !from || !to)
			return {
				content: 'Invalid input',
				ephemeral: true,
			};
		const eR = await loadExchangeRates();
		const amount = parseFloat(a);
		if (isNaN(amount))
			return {
				content: 'Invalid amount',
				ephemeral: true,
			};
		for (const x of eR) {
			if (x.name.toLowerCase() == from.toLowerCase()) from = x.key;
			if (x.name.toLowerCase() == to.toLowerCase()) to = x.key;
		}
		if (!eR.find((x) => x.key == from))
			return {
				content: 'Invalid from currency',
				ephemeral: true,
			};
		if (!eR.find((x) => x.key == to))
			return {
				content: 'Invalid to currency',
				ephemeral: true,
			};
		const fromValue = eR.find((x) => x.key == from)!;
		const toValue = eR.find((x) => x.key == to)!;
		const res = amount * (toValue.value / fromValue.value);
		return {
			content: `${numeral(amount).format('0,0')}${fromValue.unit} is ${numeral(res).format('0,0')}${toValue.unit}`,
		};
	},
} as ICommand;
