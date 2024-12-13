import { Cryptomus } from '@ignaigna/cryptomus';
import { nanoid } from 'nanoid/non-secure';
const merchantId = process.env.CRYPTOMUS_MERCHANTID!;
const paymentKey = process.env.CRYPTOMUS_PAYMENTKEY!;
const payoutKey = process.env.CRYPTOMUS_PAYOUTKEY!;
export const cryptomus = new Cryptomus(merchantId, paymentKey);



export async function createPayment(userId: string) {
    // const paymentP = await commandHandler.prisma.payment.create({
    //     data: {
    //         amount: 5,
    //         userId,
    //         orderId: nanoid(20)
    //     }
    // })
    const payment = await cryptomus.createPayment({
        amount: '5',
        currency: 'USD',
        order_id: nanoid(20),
        additional_data: userId,
    })
    return payment;
}

export async function getOrder(orderId: string, uuid: string) {
    const payment = await cryptomus.getPayment({
        order_id: orderId,
        uuid: uuid
    });
    return payment.result;

}