import { Canvas, createCanvas, Image } from '@napi-rs/canvas';
import type { PrismaClient } from '@prisma/client';
import type { Guild, GuildTextBasedChannel } from 'discord.js';
export const getLogChannel = async (prisma: PrismaClient, guild: Guild) => {
	const g = await prisma.guild.findUnique({
		where: {
			id: guild.id,
		},
	});
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

export async function getTwoMostUsedColors(img: Image | Canvas): Promise<RGB[]> {
	const canvas = createCanvas(img.width, img.height);
	const ctx = canvas.getContext('2d');

	ctx.drawImage(img, 0, 0, img.width, img.height);
	const imageData = ctx.getImageData(0, 0, img.width, img.height);
	const data = imageData.data;

	const colors: RGB[] = [];
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		colors.push([r, g, b]);
	}

	const centroids = kMeans(colors, 2);

	return centroids.map((centroid) => centroid.map(Math.round) as RGB);
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
