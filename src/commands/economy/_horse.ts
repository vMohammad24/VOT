import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'horse',
    cooldown: 60_000,
    description: 'Bet on a horse race!',
    aliases: ['horserace', 'race'],
    options: [
        {
            name: 'bet',
            description: 'The amount of coins you want to bet',
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    execute: async ({ user, args, handler: { prisma }, interaction, message, editReply }) => {
        const horses = ['Jess', 'John', 'Berry', 'Peace', 'Bull', 'Lucky', 'Snowball'];
        const chooseEmbed = new EmbedBuilder()
            .setTitle('Horses')
            .setDescription('Choose a horse to bet on\n' + horses.map((h, i) => `${i + 1}. **${h}**`).join('\n'))
            .setColor('Random')
            .setFooter({ text: 'You have 30 seconds to choose a horse' });
        // choose random 5 horses
        const rHorses: string[] = [];
        while (rHorses.length < 5) {
            const horse = horses[Math.floor(Math.random() * horses.length)];
            if (!rHorses.includes(horse)) rHorses.push(horse);
        }
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let i = 0; i < rHorses.length; i++) {
            row.addComponents(new ButtonBuilder().setCustomId(`${i + 1}`).setLabel(rHorses[i]).setStyle(ButtonStyle.Primary));
        }
        const rMsg = message ? await message!.reply({ embeds: [chooseEmbed], components: [row] }) : await interaction!.reply({ embeds: [chooseEmbed], components: [row] });
        const collector = rMsg.createMessageComponentCollector({ filter: (i) => i.user.id == user.id, time: 30_000 });
        let horse: string;
        collector.on('collect', async i => {
            if (!horses[parseInt(i.customId) - 1]) return;
            horse = horses[parseInt(i.customId) - 1];
            collector.stop();
        });
        collector.on('end', async collected => {
            if (!horse) {
                return editReply({ content: 'You did not choose a horse in time!', ephemeral: true }, rMsg);
            }

            const bet = args.get('bet') as number;
            if (!bet || isNaN(bet)) return {
                content: 'Please provide a valid amount of coins to bet',
                ephemeral: true
            }

            const eco = await prisma.economy.findFirst({
                where: { userId: user.id }
            });
            if (!eco || eco.balance < bet) {
                return editReply({ content: 'You do not have enough coins to bet that amount', ephemeral: true }, rMsg);
            }

            await prisma.economy.update({
                where: { userId: user.id },
                data: { balance: eco.balance - bet }
            });

            const winningHorse = rHorses[Math.floor(Math.random() * rHorses.length)];
            const resultEmbed = new EmbedBuilder()
                .setTitle('Horse Race Result')
                .setDescription(`The winning horse is **${winningHorse}**!`)
                .setColor('Random');

            if (horse === winningHorse) {
                const payout = bet * 2;
                await prisma.economy.update({
                    where: { userId: user.id },
                    data: { balance: eco.balance + payout }
                });
                resultEmbed.addFields({ name: 'Congratulations!', value: `You won ${payout} coins!` });
            } else {
                resultEmbed.addFields({ name: 'Better luck next time!', value: `You lost ${bet} coins.` });
            }

            await editReply({ embeds: [resultEmbed] }, rMsg);
        });
    }
} as ICommand;