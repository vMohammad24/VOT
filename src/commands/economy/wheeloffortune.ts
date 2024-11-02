import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'wheeloffortune',
    cooldown: 60_000 * 60 * 24,
    description: 'Place bets on segments of a spinning wheel!',
    aliases: ['wof', 'wheel'],
    options: [
        {
            name: 'bet',
            description: 'The amount of coins you want to bet',
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    execute: async ({ user, args, handler: { prisma } }) => {
        const bet = args.get('bet') as number;
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
            content: 'You need at least 100 coins to play Wheel of Fortune',
            ephemeral: true
        }
        if (eco.balance < bet) return {
            content: 'You do not have enough coins to bet that amount',
            ephemeral: true
        };

        const segments = [
            { multiplier: 2, emoji: '🍒' },
            { multiplier: 3, emoji: '🍋' },
            { multiplier: 5, emoji: '🍉' },
            { multiplier: 10, emoji: '🍇' },
            { multiplier: 20, emoji: '🔔' },
            { multiplier: 50, emoji: '⭐' },
            { multiplier: 100, emoji: '💎' }
        ];
        const segment = segments[Math.floor(Math.random() * segments.length)];
        const payout = bet * segment.multiplier;

        const embed = new EmbedBuilder()
            .setTitle("Wheel of Fortune")
            .setDescription(`🎡 | The wheel landed on ${segment.emoji} | 🎡\n`)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setColor("Random");

        if (segment.multiplier > 1) {
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