import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'mines',
    cooldown: 60_000,
    description: 'Play the mines game!',
    aliases: ['minefield', 'minesweeper'],
    type: 'all',
    options: [
        {
            name: 'bet',
            description: 'The amount of coins you want to bet',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
    ],
    execute: async ({ user, args, handler: { prisma }, message, interaction }) => {
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
            content: 'You need at least 100 coins to play mines',
            ephemeral: true
        }
        if (eco.balance < bet) return {
            content: 'You do not have enough coins to bet that amount',
            ephemeral: true
        };

        const totalTiles = 20; // 4x5 grid
        const mineCount = Math.floor(totalTiles * 0.2); // 20% of the grid are mines
        const mines = new Set<number>();
        while (mines.size < mineCount) {
            mines.add(Math.floor(Math.random() * totalTiles));
        }
        const embed = new EmbedBuilder()
            .setTitle('Minesweeper')
            .setDescription('Click on the tiles to reveal them');
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        for (let i = 0; i < totalTiles / 5; i++) { // 4x5 grid
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 5; j++) {
                const index = i * 5 + j;
                row.addComponents(new ButtonBuilder()
                    .setCustomId(`mines-${index}`)
                    .setLabel('᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌᠌')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(false)
                )
            }
            rows.push(row);
        }
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('mines-end')
                .setLabel('Collect')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(false)
        ))
        const rMsg = message ? await message.reply({ embeds: [embed], components: rows }) : await interaction!.reply({ embeds: [embed], components: rows });
        const collector = rMsg.createMessageComponentCollector({ filter: (i) => i.user.id == user.id, time: 120_000 });
        let collectedMoney = 0;
        collector.on('collect', async i => {
            if (i.customId === 'mines-end') {
                collector.stop();
                await i.update({});
                return;
            }
            const index = parseInt(i.customId.split('-')[1]);
            if (mines.has(index)) {
                mines.forEach(mine => {
                    const button = rows[Math.floor(mine / 5)].components[mine % 5] as ButtonBuilder;
                    button.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                });
                const button = rows[Math.floor(index / 5)].components[index % 5] as ButtonBuilder;
                button.setEmoji('💥').setStyle(ButtonStyle.Danger).setDisabled(true);
                const newEmbed = new EmbedBuilder()
                    .setTitle('Minesweeper')
                    .setDescription('You hit a mine!')
                    .setColor('Red');
                await prisma.economy.update({
                    where: { userId: user.id },
                    data: { balance: eco.balance - bet }
                })
                rows.forEach(row => row.components.forEach(button => button.setDisabled(true)));
                await i.update({ embeds: [newEmbed], components: rows });
                collector.stop();
                return;
            }
            const button = rows[Math.floor(index / 5)].components[index % 5] as ButtonBuilder;
            const multiplier = parseFloat((Math.random() + 1).toFixed(2));
            collectedMoney += bet * multiplier;
            button.setLabel(multiplier.toString()).setDisabled(true);
            await i.update({ components: rows });
        });

        collector.on('end', async collected => {
            if (collected.size > 0 && !collected.some(i => mines.has(parseInt(i.customId.split('-')[1])))) {
                await prisma.economy.update({
                    where: { userId: user.id },
                    data: { balance: eco.balance + collectedMoney }
                });
                const newEmbed = new EmbedBuilder()
                    .setTitle('Minesweeper')
                    .setDescription(`Congratulations! You won ${collectedMoney} coins!`)
                    .setColor('Green');
                await rMsg.edit({ embeds: [newEmbed] });
            }
        });
    }
} as ICommand;