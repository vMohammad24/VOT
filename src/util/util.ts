import { Canvas, createCanvas, Image } from '@napi-rs/canvas';
import axios from 'axios';
import type { Guild, GuildTextBasedChannel } from 'discord.js';
import commandHandler from '..';
import { getGuild } from './database';
export const getLogChannel = async (guild: Guild) => {
	const g = await getGuild(guild, { loggingChannel: true });
	if (!g) return null;
	if (!g.loggingChannel) return null;
	return guild.channels.cache.get(g.loggingChannel) as GuildTextBasedChannel;
};

type RGB = [number, number, number];

function getEuclideanDistance(color1: RGB, color2: RGB): number {
	return Math.sqrt(
		Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) + Math.pow(color1[2] - color2[2], 2),
	);
}

function assignClusters(colors: RGB[], centroids: RGB[]): number[] {
	return colors.map((color) => {
		let minDistance = Infinity;
		let clusterIndex = -1;
		for (let i = 0; i < centroids.length; i++) {
			const distance = getEuclideanDistance(color, centroids[i]);
			if (distance < minDistance) {
				minDistance = distance;
				clusterIndex = i;
			}
		}
		return clusterIndex;
	});
}

function calculateCentroids(colors: RGB[], clusters: number[], k: number): RGB[] {
	const sums: RGB[] = Array.from({ length: k }, () => [0, 0, 0]);
	const counts: number[] = Array(k).fill(0);

	colors.forEach((color, index) => {
		const cluster = clusters[index];
		sums[cluster][0] += color[0];
		sums[cluster][1] += color[1];
		sums[cluster][2] += color[2];
		counts[cluster]++;
	});

	return sums.map((sum, index) => {
		const count = counts[index];
		return count === 0 ? [0, 0, 0] : [sum[0] / count, sum[1] / count, sum[2] / count];
	});
}

function kMeans(colors: RGB[], k: number, maxIterations = 100): RGB[] {
	let centroids = colors.slice(0, k);
	let clusters = new Array(colors.length).fill(-1);

	for (let i = 0; i < maxIterations; i++) {
		const newClusters = assignClusters(colors, centroids);
		const newCentroids = calculateCentroids(colors, newClusters, k);

		if (newCentroids.every((centroid, index) => getEuclideanDistance(centroid, centroids[index]) < 1)) {
			break;
		}

		centroids = newCentroids;
		clusters = newClusters;
	}

	return centroids;
}

export const rgbToHex = ([r, g, b]: RGB) => {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export function getTwoMostUsedColors(img: Image | Canvas): RGB[] {
	const time = Date.now();
	const scale = 0.1;
	const canvas = createCanvas(img.width * scale, img.height * scale);
	const ctx = canvas.getContext('2d');

	ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
	const imageData = ctx.getImageData(0, 0, img.width * scale, img.height * scale);
	const data = imageData.data;

	const colors: RGB[] = [];
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		colors.push([r, g, b]);
	}

	const centroids = kMeans(colors, 2);
	const clusters = assignClusters(colors, centroids);

	const counts = [0, 0];
	clusters.forEach((cluster) => counts[cluster]++);

	const sortedCentroids = centroids
		.map((centroid, index) => ({ centroid, count: counts[index] }))
		.sort((a, b) => b.count - a.count)
		.map((item) => item.centroid);
	const result = sortedCentroids.map((centroid) => centroid.map(Math.round) as RGB);
	if (commandHandler.verbose) commandHandler.logger.info(`Took ${Date.now() - time}ms to get two most used colors`);
	return result;
}
export function parseTime(timestr: string): number {
	timestr = timestr
		.replace(/(\s|,|and)/g, '')
		.replace(/(-?\d+|[a-z]+)/gi, '$1 ')
		.trim();
	const vals: string[] = timestr.split(/\s+/);
	let time: number = 0;
	try {
		for (let j = 0; j < vals.length; j += 2) {
			let num: number = parseInt(vals[j], 10);
			switch (vals[j + 1].toLowerCase()) {
				case 'm':
					num *= 60;
					break;
				case 'h':
					num *= 60 * 60;
					break;
				case 'd':
					num *= 60 * 60 * 24;
					break;
				case 'w':
					num *= 60 * 60 * 24 * 7;
					break;
				default:
					break;
			}
			time += num;
		}
	} catch (ignored) { }
	return time;
}

export function timeUntil(timestamp: Date | number): string {
	if (typeof timestamp === 'number') timestamp = new Date(timestamp);
	const now = new Date();
	const diff = timestamp.getTime() - now.getTime();

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	if (years > 0) {
		return `${years} year${years > 1 ? 's' : ''}`;
	} else if (months > 0) {
		return `${months} month${months > 1 ? 's' : ''}`;
	} else if (days > 0) {
		return `${days} day${days > 1 ? 's' : ''}`;
	} else if (hours > 0) {
		return `${hours} hour${hours > 1 ? 's' : ''}`;
	} else if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	} else {
		return `${seconds} second${seconds > 1 ? 's' : ''}`;
	}
}

export function isURL(url: string): boolean {
	return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(url);
}

export function isNullish(value: any): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0 && value.every(isNullish));
}

export function camelToTitleCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.trim();
}

export function capitalizeString(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
export function randomInt(min?: number, max?: number): number {
	if (min === undefined) min = 0;
	if (max === undefined) max = 100;
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function parseCurl(curlCommand: string) {
	const args = curlCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
	const config: any = {
		method: 'GET',
		headers: {},
		url: ''
	};

	for (let i = 1; i < args.length; i++) {
		const arg = args[i].replace(/^['"]|['"]$/g, '');

		switch (arg) {
			case '-X':
			case '--request':
				config.method = args[++i].toUpperCase();
				break;
			case '-H':
			case '--header':
				const [key, value] = args[++i].split(':').map(s => s.trim());
				config.headers[key] = value;
				break;
			case '-d':
			case '--data':
				const data = args[++i];
				try {
					config.data = JSON.parse(data);
				} catch {
					config.data = data;
				}
				break;
			default:
				if (arg.startsWith('http')) {
					config.url = arg;
				}
		}
	}

	return config;
}

const badWords = await axios.get('https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/refs/heads/master/en').then(res => res.data.split('\n').map((word: string) => word.trim()).filter((word: string) => word.length > 0));
export function isProfane(text: string): {
	containsProfanity: boolean;
	profanityWords: string[];
} {
	const words = text.split(/\s+/);
	const profanityWords = words.filter((word) => badWords.includes(word.toLowerCase()));
	return {
		containsProfanity: profanityWords.length > 0,
		profanityWords: profanityWords
	};
}