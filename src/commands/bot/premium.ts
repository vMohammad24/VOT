import { E_PAYMENT_STATUS } from '@ignaigna/cryptomus/lib/types';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    InteractionReplyOptions,
    MessageReplyOptions,
} from 'discord.js';
import commandHandler from '../..';
import type ICommand from '../../handler/interfaces/ICommand';
import { createPayment, getOrder } from '../../util/cryptomus';
import { getEmoji } from '../../util/emojis';
import VOTEmbed from '../../util/VOTEmbed';

export default {
    description: 'Upgrade to VOT Premium',
    type: 'all',
    execute: async ({ interaction, user, message }) => {

        const embed = await new VOTEmbed()
            .setTitle('VOT Premium')
            .setDescription('Upgrade to VOT Premium to unlock these features:')
            .addFields([
                { name: '⚡ Priority Support', value: 'Get help faster with dedicated support' },
                { name: '🚫 No Cooldowns', value: 'Use commands without a cooldown' },
                { name: '🔧 Advanced Commands', value: 'Access to premium-only commands' },
                { name: '🎤 Premium Voice Effects', value: 'Additional voice filters and effects' },
                { name: '🔜 More Coming Soon', value: 'Stay tuned' }
            ])
            .author(user)
            .dominant();
        const replyWith: InteractionReplyOptions | MessageReplyOptions = {
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('buy_premium')
                        .setLabel('Buy Premium')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        }
        const rMsg = await (message ? message.reply(replyWith as any) : interaction!.reply(replyWith as any));
        const collector = rMsg.createMessageComponentCollector({
            filter: i => i.user.id === user.id,
            time: 60000
        })

        collector.on('collect', async i => {
            collector.stop();
            const payment = await createPayment(i.user.id);
            const logo = getEmoji('cryptomus');
            const embed = await new VOTEmbed()
                .setTitle('VOT Premium')
                .author(i.user)
                .addFields([
                    { name: 'Amount', value: '$5' },
                    { name: 'Order ID', value: payment.result.order_id },
                ])
                .setFooter({
                    text: 'Powered by Cryptomus',
                    iconURL: logo.imageURL()!
                })
                .dominant();
            const res = await i.reply({
                embeds: [embed],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setURL(payment.result.url)
                                .setStyle(ButtonStyle.Link)
                                .setLabel('Pay now')
                                .setEmoji(logo.toString()),
                            new ButtonBuilder()
                                .setCustomId('check_payment')
                                .setLabel('Check Payment')
                                .setStyle(ButtonStyle.Secondary)
                        )
                ]
            });
            const checkCollector = res.createMessageComponentCollector({
                filter: i => i.user.id === user.id,
                time: 60000
            })
            checkCollector.on('collect', async inter => {
                checkCollector.stop();
                const result = await getOrder(
                    payment.result.order_id,
                    payment.result.uuid
                );

                const embed = await new VOTEmbed()
                    .setTitle('VOT Premium - Payment Status')
                    .author(inter.user)
                    .setFooter({
                        text: 'Powered by Cryptomus',
                        iconURL: logo.imageURL()!
                    })
                    .dominant();
                switch (result.payment_status) {
                    case E_PAYMENT_STATUS.WRONG_AMOUNT:
                        embed.setDescription('Wrong amount paid')
                            .setColor('Red');
                        break;
                    case E_PAYMENT_STATUS.PROCESS:
                        embed.setDescription('Payment is processing')
                            .setColor('Yellow');
                        break;
                    case E_PAYMENT_STATUS.PAID:
                    case E_PAYMENT_STATUS.PAID_OVER:
                        embed.setDescription('Payment is successful')
                            .setColor('Green');
                        await commandHandler.prisma.user.update({
                            where: {
                                id: user.id
                            },
                            data: {
                                tier: 'Premium'
                            }
                        })
                        embed.setDescription('Payment is successful and you are now a VOT Premium user');
                        break;
                    case E_PAYMENT_STATUS.FAIL:
                        embed.setDescription('Payment failed')
                            .setColor('Red');
                        break;
                    case E_PAYMENT_STATUS.CANCEL:
                        embed.setDescription('Payment was cancelled')
                            .setColor('Red');
                        break;
                    case E_PAYMENT_STATUS.REFUND_PROCESS:
                        embed.setDescription('Payment was refunded')
                            .setColor('Orange');
                        break;
                    case E_PAYMENT_STATUS.WRONG_AMOUNT_WAITING:
                        embed.setDescription('Waiting for correct amount')
                            .setColor('Yellow');
                        break;
                    case E_PAYMENT_STATUS.CHECK:
                        embed.setDescription('Payment is being checked')
                            .setColor('Yellow');
                        break;
                    case E_PAYMENT_STATUS.CONFIRM_CHECK:
                        embed.setDescription('Payment is being confirmed')
                            .setColor('Yellow');
                        break;
                    case E_PAYMENT_STATUS.LOCKED:
                        embed.setDescription('Payment is locked')
                            .setColor('Red');
                        break;
                    case E_PAYMENT_STATUS.REFUND_FAIL:
                        embed.setDescription('Refund failed')
                            .setColor('Red');
                        break;
                    case E_PAYMENT_STATUS.SYSTEM_FAIL:
                        embed.setDescription('System failure')
                            .setColor('Red');
                        break;
                    default:
                        embed.setDescription('Payment status unknown')
                            .setColor('Grey');
                        break;
                }
                inter.update({});
                await i.editReply({
                    embeds: [embed],
                })
            })
        })

        collector.on('end', () => { })
    }
} as ICommand;
