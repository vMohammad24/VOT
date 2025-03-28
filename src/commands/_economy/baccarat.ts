import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";

export default {
	name: "baccarat",
	cooldown: 60_000,
	description: 'Place bets on either the "Player," "Banker," or a "Tie."',
	aliases: ["bac", "bacc"],
	type: "all",
	options: [
		{
			name: "bet",
			description: "The amount of coins you want to bet",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
		{
			name: "choice",
			description: "Your bet choice (Player, Banker, Tie)",
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: "Player", value: "player" },
				{ name: "Banker", value: "banker" },
				{ name: "Tie", value: "tie" },
			],
		},
	],
	execute: async ({ user, args, handler: { prisma } }) => {
		const bet = args.get("bet") as number;
		const choice = args.get("choice") as string;
		if (!bet || isNaN(bet) || bet < 1)
			return {
				content: "Please provide a valid amount of coins to bet",
				ephemeral: true,
			};
		if (choice !== "player" && choice !== "banker" && choice !== "tie")
			return {
				content:
					"Please provide a valid choice to bet on (Player, Banker, Tie)",
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
				content: "You need at least 100 coins to play baccarat",
				ephemeral: true,
			};
		if (eco.balance < bet)
			return {
				content: "You do not have enough coins to bet that amount",
				ephemeral: true,
			};

		const drawCard = () => Math.floor(Math.random() * 9) + 1;
		const playerHand = drawCard() + drawCard();
		const bankerHand = drawCard() + drawCard();
		const playerTotal = playerHand % 10;
		const bankerTotal = bankerHand % 10;

		const embed = new EmbedBuilder()
			.setTitle("Baccarat")
			.setDescription(
				`🃏 | Player: ${playerTotal} | Banker: ${bankerTotal} | 🃏\n`,
			)
			.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
			.setColor("Random");

		let payout = 0;
		if (choice === "player" && playerTotal > bankerTotal) {
			payout = bet * 2;
		} else if (choice === "banker" && bankerTotal > playerTotal) {
			payout = bet * 2;
		} else if (choice === "tie" && playerTotal === bankerTotal) {
			payout = bet * 8;
		}

		if (payout > 0) {
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
