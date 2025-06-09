import axios from "axios";
import Fuse from "fuse.js";

export const exchangeRates: {
	key: string;
	name: string;
	value: number;
	unit: string;
}[] = [];

const lastUpdate: Date = new Date(0);
const updateInterval = 15 * 60 * 1000; // 15 minutes

export const loadExchangeRates = async () => {
	if (new Date().getTime() - lastUpdate.getTime() < updateInterval) {
		return exchangeRates;
	}
	const res = await axios.get(
		"https://api.coingecko.com/api/v3/exchange_rates",
	);
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

export const parseAbbreviatedNumber = (input: string): number => {
	const match = input.toLowerCase().match(/^([\d.]+)\s*([tkbm])?$/);
	if (!match) return Number.parseFloat(input);

	const [_, num, modifier] = match;
	const value = Number.parseFloat(num);
	if (Number.isNaN(value)) return Number.NaN;

	const multipliers: Record<string, number> = {
		t: 1e12,
		b: 1e9,
		m: 1e6,
		k: 1e3,
	};

	return value * (multipliers[modifier] || 1);
};

export const findCurrency = (query: string, rates: typeof exchangeRates) => {
	const fuse = new Fuse(exchangeRates, {
		keys: ["key", "name"],
		threshold: 0.3,
		includeScore: true,
	});

	query = query.toLowerCase();
	const result = fuse.search(query);
	return result.length ? result[0].item : undefined;
};

export const isValidCurrency = (query: string, rates: typeof exchangeRates) => {
	if (!query || query.length < 2) return false;
	query = query.toLowerCase();
	return rates.some(
		(x) => x.key.toLowerCase() === query || x.name.toLowerCase() === query,
	);
};
