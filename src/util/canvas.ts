import { createCanvas, loadImage } from "@napi-rs/canvas";

function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number,
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function linspace(count: number): number[] {
	return Array.from({ length: count }, (_, i) => i / (count - 1));
}

function drawShape([start, ...pts]: [number, number][]): [number, number][] {
	if (pts.length < 2) {
		return [start, ...pts, start, start, start];
	}
	return [start, ...pts, start];
}

function splitLinesAtEdges(
	lines: [number, number][][],
	boundaryBox: [number, number, number, number],
) {
	return lines.flatMap((line) => {
		const returnLines: [number, number][][] = [];
		let currline: [number, number][] = [];
		for (let i = 1; i < line.length; i++) {
			const prev = line[i - 1];
			const curr = line[i];
			currline.push(prev);
			if (
				isOnBoundaryBox(prev, boundaryBox) &&
				isOnBoundaryBox(curr, boundaryBox)
			) {
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

function isOnBoundaryBox(
	point: [number, number],
	[minX, minY, maxX, maxY]: [number, number, number, number],
) {
	const [x, y] = point;
	return (
		Math.abs(x - minX) < 0.5 ||
		Math.abs(x - maxX) < 0.5 ||
		Math.abs(y - minY) < 0.5 ||
		Math.abs(y - maxY) < 0.5
	);
}

function removeDuplicateLines(lines: [number, number][][]) {
	const takenLines: [number, number][][] = [];
	let takenLinesStart: number;
	do {
		takenLinesStart = takenLines.length;
		for (let l = 0; l < lines.length; l++) {
			const line = lines[l];
			let success = true;
			if (line.length > 2) {
				for (let i = 0; i < takenLines.length; i++) {
					if (
						(pointIsInLine(line[0], takenLines[i]) &&
							pointIsInLine(line[1], takenLines[i])) ||
						(pointIsInLine(line[line.length - 1], takenLines[i]) &&
							pointIsInLine(line[line.length - 2], takenLines[i]))
					) {
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
	return (
		Math.abs(pointA[0] - pointB[0]) < 2 && Math.abs(pointA[1] - pointB[1]) < 2
	);
}

function isoBands(
	data: number[][],
	lower: number,
	upper: number,
): [number, number][][] {
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

function marchSquare(
	square: [number, number, number][],
	lower: number,
	upper: number,
): [number, number][] {
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

export type MusicCanvasOptions = {
	thumbnailImage?: string;
	backgroundColor?: string;
	backgroundImage?: string;
	imageDarkness?: number;
	progress?: number;
	progressColor?: string;
	progressBarColor?: string;
	name?: string;
	nameColor?: string;
	author?: string;
	authorColor?: string;
	startTime?: string;
	endTime?: string;
	timeColor?: string;
};

export async function createMusicCanvas(options: MusicCanvasOptions) {
	const canvas = createCanvas(2458, 837);
	const ctx = canvas.getContext("2d");

	// Set defaults with better colors
	if (!options.progressBarColor) options.progressBarColor = "#5F2D00";
	if (!options.progressColor) options.progressColor = "#FF7A00";
	if (!options.backgroundColor) options.backgroundColor = "#070707";
	if (!options.nameColor) options.nameColor = "#FF7A00";
	if (!options.authorColor) options.authorColor = "#FFFFFF";
	if (!options.timeColor) options.timeColor = "#FFFFFF";
	if (!options.imageDarkness) options.imageDarkness = 10;
	if (!options.progress) options.progress = 0;
	if (!options.name) options.name = "Unknown";
	if (!options.author) options.author = "Unknown Artist";
	if (!options.startTime) options.startTime = "0:00";
	if (!options.endTime) options.endTime = "0:00";

	// Create background gradient
	if (options.backgroundImage) {
		const background = await loadImage(options.backgroundImage);
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		// Add gradient overlay
		const gradient = ctx.createLinearGradient(
			0,
			0,
			canvas.width,
			canvas.height,
		);
		gradient.addColorStop(0, `rgba(0, 0, 0, ${options.imageDarkness / 100})`);
		gradient.addColorStop(
			1,
			`rgba(0, 0, 0, ${(options.imageDarkness + 20) / 100})`,
		);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	} else {
		ctx.fillStyle = options.backgroundColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// Add a subtle glow effect
	ctx.shadowColor = options.progressColor;
	ctx.shadowBlur = 20;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	// Enhanced thumbnail display
	if (options.thumbnailImage) {
		const thumbnail = await loadImage(options.thumbnailImage);
		ctx.save();
		// Create thumbnail container with border
		ctx.beginPath();
		ctx.roundRect(100, 100, 600, 600, 30);
		ctx.strokeStyle = options.progressColor;
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.clip();
		ctx.drawImage(thumbnail, 100, 100, 600, 600);

		// Add reflection effect
		const gradient = ctx.createLinearGradient(0, 100, 0, 700);
		gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
		gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(100, 100, 600, 600);
		ctx.restore();
	}

	// Modern text styling
	ctx.textBaseline = "top";
	ctx.shadowBlur = 0; // Reset shadow for text

	// Title with gradient
	const titleGradient = ctx.createLinearGradient(750, 150, 750, 230);
	titleGradient.addColorStop(0, options.nameColor);
	titleGradient.addColorStop(1, options.progressColor);
	ctx.fillStyle = titleGradient;
	ctx.font = "bold 90px sans-serif";
	ctx.fillText(options.name, 750, 150);

	// Artist name with subtle glow
	ctx.fillStyle = options.authorColor;
	ctx.font = "60px sans-serif";
	ctx.globalAlpha = 0.9;
	ctx.fillText(options.author, 750, 280);
	ctx.globalAlpha = 1;

	// Enhanced progress bar
	const progressWidth = canvas.width - 900;
	const progressHeight = 15;
	const progressX = 750;
	const progressY = 400;

	// Progress bar background with gradient
	const barGradient = ctx.createLinearGradient(
		progressX,
		0,
		progressX + progressWidth,
		0,
	);
	barGradient.addColorStop(0, options.progressBarColor);
	barGradient.addColorStop(1, adjustColor(options.progressBarColor, -20));
	ctx.fillStyle = barGradient;
	ctx.roundRect(
		progressX,
		progressY,
		progressWidth,
		progressHeight,
		progressHeight / 2,
	);
	ctx.fill();

	// Progress indicator with glow
	const progress = Math.min(100, Math.max(0, options.progress));
	const progressGradient = ctx.createLinearGradient(
		progressX,
		0,
		progressX + progressWidth,
		0,
	);
	progressGradient.addColorStop(0, options.progressColor);
	progressGradient.addColorStop(1, adjustColor(options.progressColor, 20));
	ctx.fillStyle = progressGradient;
	ctx.shadowColor = options.progressColor;
	ctx.shadowBlur = 10;
	ctx.roundRect(
		progressX,
		progressY,
		progressWidth * (progress / 100),
		progressHeight,
		progressHeight / 2,
	);
	ctx.fill();

	// Progress knob
	ctx.beginPath();
	ctx.arc(
		progressX + progressWidth * (progress / 100),
		progressY + progressHeight / 2,
		12,
		0,
		Math.PI * 2,
	);
	ctx.fillStyle = "#FFFFFF";
	ctx.shadowBlur = 15;
	ctx.fill();

	// Time indicators with enhanced styling
	ctx.shadowBlur = 0;
	ctx.fillStyle = options.timeColor;
	ctx.font = "bold 40px sans-serif";
	ctx.fillText(options.startTime, progressX, progressY + 30);
	ctx.fillText(
		options.endTime,
		progressX + progressWidth - 100,
		progressY + 30,
	);

	return canvas.toBuffer("image/png");
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
	const hex = color.replace("#", "");
	const num = Number.parseInt(hex, 16);
	const r = Math.min(255, Math.max(0, (num >> 16) + amount));
	const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
	const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
