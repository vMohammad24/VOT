import { ApplicationCommandOptionType } from "discord.js";
import type ICommand from "../../handler/interfaces/ICommand";
import VOTEmbed from "../../util/VOTEmbed";
import { getUserByID } from "../../util/database";

export default {
	name: "transfer",
	description: "Transfer coins to another user",
	aliases: ["pay", "give"],
	type: "all",
	options: [
		{
			name: "user",
			description: "The user to transfer coins to",
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: "amount",
			description: "The amount of coins to transfer",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
	],
	execute: async ({ user: author, args, handler: { prisma } }) => {
		const targetId = args.get("user").id;
		const amount = args.get("amount") as number;

		if (targetId === author.id) {
			return {
				content: "You can't transfer coins to yourself!",
				ephemeral: true,
			};
		}

		if (amount <= 0) {
			return {
				content: "Please provide a valid amount greater than 0",
				ephemeral: true,
			};
		}

		const [sender, receiver] = await Promise.all([
			getUserByID(author.id, { economy: true, name: true }),
			getUserByID(targetId, { economy: true, name: true }),
		]);

		if (sender.economy.balance < amount) {
			return {
				content: "You do not have enough coins to make this transfer",
				ephemeral: true,
			};
		}

		await prisma.$transaction([
			prisma.economy.update({
				where: { userId: author.id },
				data: { balance: { decrement: amount } },
			}),
			prisma.economy.update({
				where: { userId: targetId },
				data: { balance: { increment: amount } },
			}),
		]);

		return {
			embeds: [
				new VOTEmbed()
					.setTitle("Transfer Successful")
					.setDescription(
						`Successfully transferred $${amount} to ${receiver.name}`,
					)
					.setTimestamp(),
			],
		};
	},
} as ICommand;
