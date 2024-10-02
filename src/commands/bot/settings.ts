import { ArgumentMode } from "@prisma/client";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import ICommand from "../../handler/interfaces/ICommand";

export default {
    description: `VOT settings`,
    aliases: ['sets', 'set', 'setting'],
    slashOnly: true,
    options: [
        {
            name: 'name',
            description: 'The name of the option you want to change',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'Prefix',
                    value: 'prefix'
                },
                {
                    name: 'Parsing',
                    value: 'parsing'
                },
                {
                    name: 'Training data',
                    value: 'training'
                }
            ]
        },
        {
            name: 'value',
            description: 'The value you want to set the option to',
            type: ApplicationCommandOptionType.String,
            required: true,
            // choices: [{
            //     name: 'Normal',
            //     value: 'Normal'
            // }, {
            //     name: 'Advanced',
            //     value: 'Advanced'
            // },
            // {
            //     name: 'Disable Training Data',
            //     value: 'false'
            // },
            // {
            //     name: 'Enable Training Data',
            //     value: 'true'
            // }]
        }
    ],
    type: 'all',
    execute: async ({ interaction, user, handler }) => {
        if (!interaction) return;
        const subCommand = interaction.options.getString('name');
        const value = interaction.options.getString('value', true);
        switch (subCommand) {
            case 'prefix': {
                if (value.length > 3) return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Invalid value')
                        .setDescription(`The value must be less than 4 characters`)
                        .setColor('Red')
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
                if (!['Normal', 'Advanced'].includes(value)) return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Invalid value')
                        .setDescription(`The value must be either \`Normal\` or \`Advanced\``)
                        .setColor('Red')
                    ],
                    ephemeral: true
                }
                const pU = await handler.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        ArgumentMode: value as ArgumentMode
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
                if (!['true', 'false'].includes(value)) return {
                    embeds: [new EmbedBuilder()
                        .setTitle('Invalid value')
                        .setDescription(`The value must be either \`true\` or \`false\``)
                        .setColor('Red')
                    ],
                    ephemeral: true
                }
                const pU = await handler.prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        shouldTrain: value === 'true'
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