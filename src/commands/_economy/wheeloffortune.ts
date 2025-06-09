import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	name: "wheeloffortune",
	cooldown: 60_000 * 60,
	description: "Place bets on segments of a spinning wheel!",
	aliases: ["wof", "wheel"],
	type: "all",
	options: [
		{
			name: "bet",
			description: "The amount of coins you want to bet",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
	],
	execute: async ({ user, args, handler: { prisma } }) => {
		const bet = args.get("bet") as number;
		if (!bet || Number.isNaN(bet) || bet < 1 || bet < 1)
			return {
				content: "Please provide a valid amount of coins to bet",
				ephemeral: true,
			};
		const eco = await prisma.economy.findFirst({
			where: {
				userId: user.id,
			},
		});
		if (!eco)
			return {
				content:
					"You do not have an economy account, please run the `balance` command to create one",
				ephemeral: true,
			};
		if (eco.balance < 100)
			return {
				content: "You need at least 100 coins to play Wheel of Fortune",
				ephemeral: true,
			};
		if (eco.balance < bet)
			return {
				content: "You do not have enough coins to bet that amount",
				ephemeral: true,
			};
		const weightedSegments = [
			{ multiplier: 1.5, emoji: "🍒", weight: 50 },
			{ multiplier: 2.0, emoji: "🔔", weight: 30 },
			{ multiplier: 2.5, emoji: "⭐", weight: 15 },
			{ multiplier: 3.0, emoji: "💎", weight: 5 },
		];

		const totalWeight = weightedSegments.reduce(
			(acc, segment) => acc + segment.weight,
			0,
		);
		const random = Math.floor(Math.random() * totalWeight);

		let cumulativeWeight = 0;
		const segment = weightedSegments.find((segment) => {
			cumulativeWeight += segment.weight;
			return random < cumulativeWeight;
		})!;
		const payout = bet * segment.multiplier;

		const embed = new EmbedBuilder()
			.setTitle("Wheel of Fortune")
			.setDescription(`🎡 | The wheel landed on ${segment.emoji} | 🎡\n`)
			.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
			.setColor("Random");

		if (segment.multiplier > 1) {
			eco.balance += payout;
			embed.addFields({
				name: "Result",
				value: `Congratulations! You won ${payout} coins!`,
			});
			embed.setColor("Green");
		} else {
			eco.balance -= bet;
			embed.addFields({
				name: "Result",
				value: `Sorry, you lost ${bet} coins.`,
			});
			embed.setColor("Red");
		}

		await prisma.economy.update({
			data: eco,
			where: {
				userId: user.id,
			},
		});
		return {
			embeds: [embed],
			ephemeral: false,
		};
	},
} as ICommand;
