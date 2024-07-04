import type { PrismaClient } from "@prisma/client";
import type { Guild, GuildTextBasedChannel } from "discord.js";
import { loadImage, createCanvas, Image } from "@napi-rs/canvas";
import kmeans from '@stdlib/ml-incr-kmeans';
import ndarray from '@stdlib/ndarray-ctor';
export const getLogChannel = async (prisma: PrismaClient, guild: Guild) => {
    const g = await prisma.guild.findUnique({
        where: {
            id: guild.id
        }
    });
    if (!g) return null;
    if (!g.loggingChannel) return null;
    return guild.channels.cache.get(g.loggingChannel) as GuildTextBasedChannel;
}



type RGB = [number, number, number];



function getEuclideanDistance(color1: RGB, color2: RGB): number {
    return Math.sqrt(
        Math.pow(color1[0] - color2[0], 2) +
        Math.pow(color1[1] - color2[1], 2) +
        Math.pow(color1[2] - color2[2], 2)
    );
}

function assignClusters(colors: RGB[], centroids: RGB[]): number[] {
    return colors.map(color => {
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

export async function getTwoMostUsedColors(img: Image): Promise<RGB[]> {
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

    return centroids.map(centroid => centroid.map(Math.round) as RGB);
}