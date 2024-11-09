import { ArgumentMode } from "@prisma/client";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    name: 'settings',
    description: `VOT settings`,
    slashOnly: true,
    options: [
        {
            name: 'prefix',
            description: 'Set the bot prefix',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'prefix',
                    description: 'The new prefix',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'parsing',
            description: 'Set the argument parsing mode',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'value',
                    description: 'The parsing mode (Normal or Advanced)',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'Normal', value: 'n' },
                        { name: 'Advanced', value: 'a' }
                    ]
                }
            ]
        },
        {
            name: 'training',
            description: 'Enable or disable training data',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'value',
                    description: 'Enable or disable training data (true or false)',
                    type: ApplicationCommandOptionType.Boolean,
                    required: true,
                }
            ]
        }
    ],
    type: 'dmOnly',
    execute: async ({ interaction, user, handler }) => {
        if (!interaction) return;
        const subCommand = interaction.options.getSubcommand();
        switch (subCommand) {
            case 'prefix': {
                const value = interaction.options.getString('prefix', true)!;
                if (value.length > 3) return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Invalid value')
                        .setDescription(`The value must be less than 4 characters`)
                        .setColor('DarkRed')
                    ],
                    ephemeral: true
                }
                const pU = await handler.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        prefix: value
                    }
                })
                return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Prefix changed')
                        .setDescription(`The prefix has been changed to \`${pU.prefix}\``)
                        .setColor('Green')
                    ],
                    ephemeral: true
                }
            }
            case 'parsing': {
                const value = interaction.options.getString('value', true)!;
                const pU = await handler.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        ArgumentMode: value == 'n' ? ArgumentMode.Normal : ArgumentMode.Advanced
                    }
                })
                return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Parsing changed')
                        .setDescription(`The parsing has been changed to \`${pU.ArgumentMode}\``)
                        .setColor('Green')
                    ],
                    ephemeral: true
                }
            }
            case 'training': {
                const value = interaction.options.getBoolean('value', true)!;
                const pU = await handler.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        shouldTrain: value
                    }
                })
                return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Training data changed')
                        .setDescription(`Training data has been changed to \`${pU.shouldTrain}\``)
                        .setColor('Green')
                    ],
                    ephemeral: true
                }
            }
        }
    }
} as ICommand