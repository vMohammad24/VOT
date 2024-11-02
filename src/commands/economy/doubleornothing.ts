import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'doubleornothing',
    cooldown: 60_000,
    description: 'Bet any amount of money and go for either double the amount or nothing',
    aliases: ['don', 'double'],
    type: 'all',
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
        if (!bet || isNaN(bet) || bet < 1) return {
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
            content: 'You need at least 100 coins to play Double or Nothing',
            ephemeral: true
        }
        if (eco.balance < bet) return {
            content: 'You do not have enough coins to bet that amount',
            ephemeral: true
        };

        const result = Math.random() < 0.5;
        const embed = new EmbedBuilder()
            .setTitle("Double or Nothing")
            .setDescription(`🪙 | You ${result ? 'won' : 'lost'}! | 🪙\n`)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setColor(result ? "Green" : "Red");

        if (result) {
            eco.balance += bet;
            embed.addFields({ name: "Result", value: `Congratulations! You won ${bet} coins!` });
        } else {
            eco.balance -= bet;
            embed.addFields({ name: "Result", value: `Sorry, you lost ${bet} coins.` });
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