import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	name: "slots",
	cooldown: 60_000,
	description: "Play the slot machine!",
	aliases: ["slot", "slotmachine"],
	type: "all",
	options: [
		{
			name: "amount",
			description: "The amount of coins you want to bet",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
	],
	execute: async ({ user, args, handler: { prisma } }) => {
		const amount = args.get("amount") as number;
		if (!amount || isNaN(amount))
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
				content: "You need at least 100 coins to play slots",
				ephemeral: true,
			};
		if (eco.balance < amount)
			return {
				content: "You do not have enough coins to bet that amount",
				ephemeral: true,
			};
		const symbols = ["🍒", "🍋", "🍉", "🍇", "🔔", "⭐", "💎"];
		const reels = [];
		for (let i = 0; i < 3; i++) {
			const randomIndex = Math.floor(Math.random() * symbols.length);
			reels.push(symbols[randomIndex]);
		}

		const embed = new EmbedBuilder()
			.setTitle("Slot Machine")
			.setDescription(`🎰 | ${reels.join(" | ")} | 🎰\n`)
			.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
			.setColor("Random");

		if (reels[0] === reels[1] && reels[1] === reels[2]) {
			let payout = 0;
			switch (reels[0]) {
				case "🍒":
					payout = amount * 2;
					break;
				case "🍋":
					payout = amount * 3;
					break;
				case "🍉":
					payout = amount * 5;
					break;
				case "🍇":
					payout = amount * 10;
					break;
				case "🔔":
					payout = amount * 20;
					break;
				case "⭐":
					payout = amount * 50;
					break;
				case "💎":
					payout = amount * 100;
					break;
			}
			eco.balance += payout;
			embed.addFields({
				name: "Result",
				value: `Congratulations! You won ${payout} coins!`,
			});
			embed.setColor("Green");
		} else {
			eco.balance -= amount;
			embed.setColor("Red");
			embed.addFields({
				name: "Result",
				value: `Sorry, you lost ${amount} coins.`,
			});
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
