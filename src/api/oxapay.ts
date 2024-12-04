import type Elysia from 'elysia';

const OXAPAY_API = 'https://api.oxapay.com';

interface PaymentRequest {
    merchant: string;
    amount: number;
    currency?: string;
    callbackUrl?: string;
    underPaidCover?: number;
    feePaidByPayer?: number;
    lifeTime?: number;
    email?: string;
    orderId?: string;
    description?: string;
    returnUrl?: string;
}

interface PaymentResponse {
    result: number;
    message: string;
    trackId: string;
    payLink: string;
}

export default (server: Elysia<'oxapay'>) => {
    // server
    //     .post('/startPayment', async ({ body }) => {
    //         try {
    //             const response = await axios.post<PaymentResponse>(
    //                 `${OXAPAY_API}/merchants/request`,
    //                 body
    //             );
    //             return response.data;
    //         } catch (error: any) {
    //             return {
    //                 result: error.response?.status || 500,
    //                 message: error.response?.data?.message || 'Internal server error',
    //                 trackId: '',
    //                 payLink: ''
    //             };
    //         }
    //     },
    //         {
    //             body: t.Object({
    //                 merchant: t.String(),
    //                 amount: t.Number({ minimum: 0 }),
    //                 currency: t.Optional(t.String()),
    //                 callbackUrl: t.Optional(t.String({ format: 'uri' })),
    //                 underPaidCover: t.Optional(t.Number({ minimum: 0, maximum: 60 })),
    //                 feePaidByPayer: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
    //                 lifeTime: t.Optional(t.Number({ minimum: 15, maximum: 2880 })),
    //                 email: t.Optional(t.String({ format: 'email' })),
    //                 orderId: t.Optional(t.String()),
    //                 description: t.Optional(t.String()),
    //                 returnUrl: t.Optional(t.String({ format: 'uri' }))
    //             }),
    //             response: t.Object({
    //                 result: t.Number(),
    //                 message: t.String(),
    //                 trackId: t.String(),
    //                 payLink: t.String()
    //             })
    //         }
    //     );
};