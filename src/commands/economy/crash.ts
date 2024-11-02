import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'crash',
    cooldown: 60_000,
    description: 'Play the crash game!',
    aliases: ['crashgame'],
    options: [
        {
            name: 'bet',
            description: 'The amount of coins you want to bet',
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    execute: async ({ user, args, handler: { prisma }, message, interaction }) => {
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
            content: 'You need at least 100 coins to play Crash',
            ephemeral: true
        }
        if (eco.balance < bet) return {
            content: 'You do not have enough coins to bet that amount',
            ephemeral: true
        };

        let multiplier = 1.0;
        const crashPoint = parseFloat((Math.random() * (5 - 1.2) + 1.2).toFixed(2));
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setTitle('Crash Game')
            .setDescription(`Multiplier: ${multiplier}x\nPress "Cash Out" to secure your winnings!`)
            .setColor('Random');

        const cashOutButton = new ButtonBuilder()
            .setCustomId('cashout')
            .setLabel('Cash Out')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(cashOutButton);

        const rMsg = message ? await message.reply({ embeds: [embed], components: [row] }) : await interaction!.reply({ embeds: [embed], components: [row] });
        const collector = rMsg.createMessageComponentCollector({ filter: (i) => i.user.id == user.id, time: 30_000 });

        let cashedOut = false;
        collector.on('collect', async i => {
            if (i.customId === 'cashout') {
                cashedOut = true;
                const payout = bet * multiplier;
                eco.balance += payout;
                await prisma.economy.update({
                    where: { userId: user.id },
                    data: { balance: eco.balance }
                });
                embed.setDescription(`You cashed out at ${multiplier}x and won ${payout} coins!`);
                embed.setColor('Green');
                await i.update({ embeds: [embed], components: [] });
                collector.stop();
            }
        });

        let timeElapsed = 0; // Track time in seconds
        const interval = setInterval(async () => {
            if (cashedOut) {
                clearInterval(interval);
                return;
            }

            // Determine multiplier increase based on time elapsed
            if (timeElapsed < 5) {
                multiplier += 0.1; // Phase 1: 0-5 seconds, increase by 0.1 per second
            } else if (timeElapsed < 10) {
                multiplier += 0.2; // Phase 2: 5-10 seconds, increase by 0.2 per second
            } else {
                multiplier += 0.5; // Phase 3: 10+ seconds, increase by 0.5 per second
            }

            timeElapsed++; // Increment the time tracker

            // Check if the game has crashed
            if (multiplier >= crashPoint) {
                clearInterval(interval);
                eco.balance -= bet;
                await prisma.economy.update({
                    where: { userId: user.id },
                    data: { balance: eco.balance }
                });
                embed.setDescription(`The game crashed at ${crashPoint.toFixed(2)}x. You lost ${bet.toFixed(2)} coins.`);
                embed.setColor('Red');
                await rMsg.edit({ embeds: [embed], components: [] });
                collector.stop();
            } else {
                // Update embed message with the current multiplier
                embed.setDescription(`Multiplier: ${multiplier.toFixed(2)}x\nPress "Cash Out" to secure your winnings!`);
                await rMsg.edit({ embeds: [embed] });
            }
        }, 1000); // Interval set to 1000ms (1 second)

    }
} as ICommand;