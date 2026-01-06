import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { priceId, userId } = req.body;

        if (!priceId || !userId) {
            return res.status(400).json({ error: 'Missing priceId or userId' });
        }

        // Get user email from Supabase
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin || 'https://soyremi.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://soyremi.com'}/subscribe`,
            customer_email: profile.email,
            metadata: {
                userId,
            },
            subscription_data: {
                metadata: {
                    userId,
                },
            },
        });

        return res.status(200).json({ sessionUrl: session.url });
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({ error: error.message });
    }
}
