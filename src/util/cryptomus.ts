import { Cryptomus } from '@ignaigna/cryptomus';
const merchantId = process.env.CRYPTOMUS_MERCHANTID!;
const paymentKey = process.env.CRYPTOMUS_PAYMENTKEY!;
const payoutKey = process.env.CRYPTOMUS_PAYOUTKEY!;
export const cryptomus = new Cryptomus(merchantId, paymentKey);
