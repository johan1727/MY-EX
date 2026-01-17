
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // Use latest or matching version
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { priceId, userId } = body;

        if (!priceId || !userId) {
            return Response.json({ error: 'Missing priceId or userId' }, { status: 400 });
        }

        const origin = request.headers.get('origin') || process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/subscribe`,
            client_reference_id: userId,
            metadata: {
                userId: userId,
            },
        });

        return Response.json({ sessionUrl: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
