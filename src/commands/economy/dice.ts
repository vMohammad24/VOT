import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'dice',
    cooldown: 60_000,
    description: 'Place bets on a dice roll!',
    aliases: ['roll', 'diceroll'],
    options: [
        {
            name: 'bet',
            description: 'The amount of coins you want to bet',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: 'guess',
            description: 'Your guess for the dice roll (1-6, 1-2, 3-4, 5-6, low, high)',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    execute: async ({ user, args, handler: { prisma } }) => {
        const bet = args.get('bet') as number;
        const guess = args.get('guess') as string;
        if (!bet || isNaN(bet)) return {
            content: 'Please provide a valid amount of coins to bet',
            ephemeral: true
        }
        const eco = await prisma.economy.findFirst({
            where: {
                userId: user.id
            }
        })
        if (!eco) return {
            content: 'You do not have an economy account, please run the `balance` command to create one',
            ephemeral: true
        };
        if (eco.balance < 100) return {
            content: 'You need at least 100 coins to play dice',
            ephemeral: true
        }
        if (eco.balance < bet) return {
            content: 'You do not have enough coins to bet that amount',
            ephemeral: true
        };

        const roll = Math.floor(Math.random() * 6) + 1;
        const embed = new EmbedBuilder()
            .setTitle("Dice Roll")
            .setDescription(`🎲 | The dice rolled a ${roll} | 🎲\n`)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setColor("Random");

        let payout = 0;
        if (guess === 'low' && roll >= 1 && roll <= 3) {
            payout = bet * 2;
        } else if (guess === 'high' && roll >= 4 && roll <= 6) {
            payout = bet * 2;
        } else if (guess.includes('-')) {
            const [min, max] = guess.split('-').map(Number);
            if (max - min === 1 && roll >= min && roll <= max) {
                payout = bet * 2;
            }
        } else {
            const guessedNumber = Number(guess);
            if (roll === guessedNumber) {
                payout = bet * 6;
            }
        }

        if (payout > 0) {
            eco.balance += payout;
            embed.addFields({ name: "Result", value: `Congratulations! You won ${payout} coins!` });
            embed.setColor("Green");
        } else {
            eco.balance -= bet;
            embed.addFields({ name: "Result", value: `Sorry, you lost ${bet} coins.` });
            embed.setColor("Red");
        }

        await prisma.economy.update({
            data: eco,
            where: {
                userId: user.id
            }
        });
        return {
            embeds: [embed],
            ephemeral: false
        };
    }
} as ICommand;