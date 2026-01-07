const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Use the correct environment variable names from Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if we have the credentials
let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { priceId, userId, email } = req.body;

        if (!priceId) {
            return res.status(400).json({ error: 'Missing priceId' });
        }

        // Use provided email or try to get from Supabase
        let customerEmail = email;

        if (!customerEmail && userId && supabase) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

            if (!error && profile) {
                customerEmail = profile.email;
            }
        }

        // Create Stripe Checkout Session
        const sessionConfig = {
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
        };

        // Add email if we have it
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        // Add metadata if we have userId
        if (userId) {
            sessionConfig.metadata = { userId };
            sessionConfig.subscription_data = {
                metadata: { userId },
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return res.status(200).json({ sessionUrl: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({
            error: error.message,
            details: error.type || 'unknown'
        });
    }
};
