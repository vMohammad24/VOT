import { Canvas } from '@napi-rs/canvas';
import { bboxClip, polygon } from '@turf/turf';
import { createNoise3D } from 'simplex-noise';
import simplify from 'simplify-js';


const simplex = createNoise3D();

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function linspace(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i / (count - 1));
}

export function generateTopography(canvas: Canvas, seed: number, nrlines: number) {
    const sizeX = canvas.width;
    const sizeY = canvas.height;
    const ctx = canvas.getContext('2d');
    const gridSize = [200, 100];
    const data: number[][] = [];

    for (let y = 0; y < gridSize[1]; y++) {
        data[y] = [];
        for (let x = 0; x < gridSize[0]; x++) {
            const _n = simplex(x / (gridSize[0] * 0.75), y / (gridSize[1] * 0.75), seed);
            const n = mapRange(_n, -1, 1, 0, 1);
            data[y].push(n);
        }
    }

    const intervals = linspace(nrlines);
    let lines: number[][][] = [];

    intervals.forEach((_, idx) => {
        if (idx > 0) {
            const lowerBand = intervals[idx - 1];
            const upperBand = intervals[idx];
            const bands = isoBands(data, lowerBand, upperBand);
            bands.forEach((band) => {
                const scaledBand: [number, number][] = band.map(([x, y]) => [
                    mapRange(x, 0, gridSize[0] - 1, 0, sizeX),
                    mapRange(y, 0, gridSize[1] - 1, 0, sizeY),
                ]) as [number, number][];
                lines.push(drawShape(scaledBand));
            });
        }
    });

    const margin = 4;
    const bbox: [number, number, number, number] = [margin, margin, sizeX - margin, sizeY - margin];
    let clipped: [number, number][][] = lines.map((line) => bboxClip(polygon([line]), bbox).geometry.coordinates[0] as [number, number][]);
    clipped = clipped.filter((l) => l);
    const splitted = splitLinesAtEdges(clipped, bbox);
    let filtered = removeDuplicateLines(splitted);
    const simplified = filtered.map((line) => {
        const objectLine = line.map(([x, y]) => ({ x, y }));
        return simplify(objectLine, 5, true).map((obj) => [obj.x, obj.y]);
    });

    simplified.forEach((line) => {
        ctx.beginPath();
        line.forEach(([x, y], idx) => {
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
    });

    return canvas;
}

function drawShape([start, ...pts]: [number, number][]): [number, number][] {
    if (pts.length < 2) {
        return [start, ...pts, start, start, start];
    }
    return [start, ...pts, start];
}

function splitLinesAtEdges(lines: [number, number][][], boundaryBox: [number, number, number, number]) {
    return lines.flatMap((line) => {
        let returnLines: [number, number][][] = [];
        let currline: [number, number][] = [];
        for (let i = 1; i < line.length; i++) {
            const prev = line[i - 1];
            const curr = line[i];
            currline.push(prev);
            if (isOnBoundaryBox(prev, boundaryBox) && isOnBoundaryBox(curr, boundaryBox)) {
                if (currline.length > 1) {
                    returnLines.push(currline);
                }
                currline = [];
            }
        }
        currline.push(line[line.length - 1]);
        returnLines.push(currline);
        return returnLines;
    });
}

function isOnBoundaryBox(point: [number, number], [minX, minY, maxX, maxY]: [number, number, number, number]) {
    const [x, y] = point;
    return Math.abs(x - minX) < 0.5 || Math.abs(x - maxX) < 0.5 || Math.abs(y - minY) < 0.5 || Math.abs(y - maxY) < 0.5;
}

function removeDuplicateLines(lines: [number, number][][]) {
    let takenLines: [number, number][][] = [];
    let takenLinesStart: number;
    do {
        takenLinesStart = takenLines.length;
        for (let l = 0; l < lines.length; l++) {
            let line = lines[l];
            let success = true;
            if (line.length > 2) {
                for (let i = 0; i < takenLines.length; i++) {
                    if ((pointIsInLine(line[0], takenLines[i]) && pointIsInLine(line[1], takenLines[i])) ||
                        (pointIsInLine(line[line.length - 1], takenLines[i]) && pointIsInLine(line[line.length - 2], takenLines[i]))) {
                        if (line.length > takenLines[i].length) {
                            takenLines[i] = line;
                        }
                        success = false;
                        break;
                    }
                }
                if (success) {
                    takenLines.push(line);
                }
            }
        }
    } while (takenLinesStart !== takenLines.length);
    return takenLines;
}

function pointIsInLine(point: [number, number], line: [number, number][]) {
    return line.some((pt) => isClose(pt, point));
}

function isClose(pointA: [number, number], pointB: [number, number]) {
    return Math.abs(pointA[0] - pointB[0]) < 2 && Math.abs(pointA[1] - pointB[1]) < 2;
}

function isoBands(data: number[][], lower: number, upper: number): [number, number][][] {
    const bands: [number, number][][] = [];
    for (let y = 0; y < data.length - 1; y++) {
        for (let x = 0; x < data[0].length - 1; x++) {
            const square: [number, number, number][] = [
                [x, y, data[y][x]],
                [x + 1, y, data[y][x + 1]],
                [x + 1, y + 1, data[y + 1][x + 1]],
                [x, y + 1, data[y + 1][x]],
            ];
            const band = marchSquare(square, lower, upper);
            if (band.length) bands.push(band);
        }
    }
    return bands;
}

function marchSquare(square: [number, number, number][], lower: number, upper: number): [number, number][] {
    const edges: [number, number][] = [];
    const [a, b, c, d] = square;
    const cases = [
        [a, b],
        [b, c],
        [c, d],
        [d, a],
    ];

    cases.forEach(([p1, p2]) => {
        const [x1, y1, val1] = p1;
        const [x2, y2, val2] = p2;

        if ((val1 < lower && val2 >= lower) || (val1 >= lower && val2 < lower)) {
            const t = (lower - val1) / (val2 - val1);
            edges.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
        }
    });

    return edges;
}
