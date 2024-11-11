import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import ICommand from '../../handler/interfaces/ICommand';

export default {
	name: 'redblack',
	cooldown: 60_000,
	description: 'Place bets on either "red" or "black" for a card draw!',
	aliases: ['rb', 'redorblack'],
	type: 'all',
	options: [
		{
			name: 'bet',
			description: 'The amount of coins you want to bet',
			type: ApplicationCommandOptionType.Integer,
			required: true,
		},
		{
			name: 'color',
			description: 'Your guess for the card color (red or black)',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: 'Red', value: 'red' },
				{ name: 'Black', value: 'black' },
			],
		},
	],
	execute: async ({ user, args, handler: { prisma } }) => {
		const bet = args.get('bet') as number;
		const color = args.get('color') as string;
		if (!bet || isNaN(bet) || bet < 1)
			return {
				content: 'Please provide a valid amount of coins to bet',
				ephemeral: true,
			};
		if (color !== 'red' && color !== 'black')
			return {
				content: 'Please provide a valid color to bet on (red or black)',
				ephemeral: true,
			};
		const eco = await prisma.economy.findFirst({
			where: {
				userId: user.id,
			},
		});
		if (!eco)
			return {
				content: 'You do not have an economy account, please run the `balance` command to create one',
				ephemeral: true,
			};
		if (eco.balance < 100)
			return {
				content: 'You need at least 100 coins to play red or black',
				ephemeral: true,
			};
		if (eco.balance < bet)
			return {
				content: 'You do not have enough coins to bet that amount',
				ephemeral: true,
			};

		const colors = ['red', 'black'];
		const drawnColor = colors[Math.floor(Math.random() * colors.length)];
		const embed = new EmbedBuilder()
			.setTitle('Red or Black')
			.setDescription(`🃏 | The card drawn is ${drawnColor.toUpperCase()} | 🃏\n`)
			.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
			.setColor('Random');

		if (color === drawnColor) {
			const payout = bet * 2;
			eco.balance += payout;
			embed.addFields({ name: 'Result', value: `Congratulations! You won ${payout} coins!` });
			embed.setColor('Green');
		} else {
			eco.balance -= bet;
			embed.addFields({ name: 'Result', value: `Sorry, you lost ${bet} coins.` });
			embed.setColor('Red');
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
