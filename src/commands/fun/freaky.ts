import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

const charMap: Record<string, string> = {
	q: "𝓺",
	w: "𝔀",
	e: "𝓮",
	r: "𝓻",
	t: "𝓽",
	y: "𝔂",
	u: "𝓾",
	i: "𝓲",
	o: "𝓸",
	p: "𝓹",
	a: "𝓪",
	s: "𝓼",
	d: "𝓭",
	f: "𝓯",
	g: "𝓰",
	h: "𝓱",
	j: "𝓳",
	k: "𝓴",
	l: "𝓵",
	z: "𝔃",
	x: "𝔁",
	c: "𝓬",
	v: "𝓿",
	b: "𝓫",
	n: "𝓷",
	m: "𝓶",
	Q: "𝓠",
	W: "𝓦",
	E: "𝓔",
	R: "𝓡",
	T: "𝓣",
	Y: "𝓨",
	U: "𝓤",
	I: "𝓘",
	O: "𝓞",
	P: "𝓟",
	A: "𝓐",
	S: "𝓢",
	D: "𝓓",
	F: "𝓕",
	G: "𝓖",
	H: "𝓗",
	J: "𝓙",
	K: "𝓚",
	L: "𝓛",
	Z: "𝓩",
	X: "𝓧",
	C: "𝓒",
	V: "𝓥",
	B: "𝓑",
	N: "𝓝",
	M: "𝓜",
};

const mapCharacters = (text: string, map: Record<string, string>) =>
	text
		.split("")
		.map((char) => map[char] || char)
		.join("");

function makeFreaky(text: string) {
	text = mapCharacters(text.trim() || "freaky", charMap);
	text += Math.random() < 0.25 ? " 👅" : " ❤️";
	return text;
}

export default {
	description: "Freaky!",
	options: [
		{
			name: "text",
			type: ApplicationCommandOptionType.String,
			description: "Text to freakify",
			required: true,
		},
	],
	type: "all",
	execute: async ({ args }) => {
		const text = args.get("text") as string;
		if (!text) return "You need to provide text to freakify!";
		const freaky = makeFreaky(text);
		return {
			content: freaky,
			allowedMentions: {},
		};
	},
} as ICommand;
