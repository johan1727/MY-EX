const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { buffer } = require('micro');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS for server-side updates
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Disable body parsing - we need the raw body for Stripe signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Price ID to tier mapping
const PRICE_TO_TIER = {
    'price_1RxtmyP3GWiMooGS4yHwDZmW': 'explorer',  // Explorer TEST
    'price_1RxtnNP3GWiMooGSgROuc422': 'warrior',   // Warrior TEST
    'price_1RxtnWP3GWiMooGS5kpAvvXn': 'phoenix',   // Phoenix TEST

    // LIVE Price IDs
    'price_1RsodvP3GWiMooGSMQpJ0KL8': 'explorer',  // Explorer LIVE
    'price_1RqOMRP3GWiMooGSD5OPjzim': 'warrior',   // Warrior LIVE
    'price_1RqOM5P3GWiMooGS8k3BDdW8': 'phoenix',   // Phoenix LIVE
};

module.exports = async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Get raw body as buffer
        const rawBody = await buffer(req);

        // Verify webhook signature with raw body
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ error: error.message });
    }
};

async function handleCheckoutCompleted(session) {
    console.log('Checkout completed:', session.id);

    const userId = session.metadata?.userId;
    const customerEmail = session.customer_email;

    if (!userId && !customerEmail) {
        throw new Error('No userId or email in session metadata');
    }

    // Check if this is a subscription checkout
    if (!session.subscription) {
        console.log('No subscription in checkout session, skipping...');
        return;
    }

    try {
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        console.log('[Webhook] Subscription retrieved:', JSON.stringify({
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            start_date: subscription.start_date,
        }));

        const priceId = subscription.items.data[0].price.id;
        const tier = PRICE_TO_TIER[priceId] || 'survivor';
        console.log('[Webhook] Price ID:', priceId, '-> Tier:', tier);

        // Update user profile - ALWAYS include period_end
        const expiresAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
        const startDate = subscription.start_date
            ? new Date(subscription.start_date * 1000).toISOString()
            : new Date().toISOString();

        const updateData = {
            subscription_tier: tier,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: subscription.status,
            subscription_current_period_end: expiresAt,
            subscription_expires_at: expiresAt,
            subscription_start_date: startDate,
        };

        console.log('[Webhook] Update data:', JSON.stringify(updateData));

        let query;
        if (userId) {
            console.log('[Webhook] Updating by userId:', userId);
            query = supabase.from('profiles').update(updateData).eq('id', userId);
        } else {
            console.log('[Webhook] Updating by email:', customerEmail);
            query = supabase.from('profiles').update(updateData).eq('email', customerEmail);
        }

        const { data, error } = await query.select();

        console.log('[Webhook] Update result - data:', JSON.stringify(data));

        if (error) {
            console.error('[Webhook] Error updating profile:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ Updated user ${userId || customerEmail} to tier ${tier}, expires: ${expiresAt}`);
    } catch (error) {
        console.error('Error handling checkout completed:', error);
        throw error;
    }
}

async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);

    const priceId = subscription.items.data[0].price.id;
    const tier = PRICE_TO_TIER[priceId] || 'survivor';

    // Calculate expiration date
    const expiresAt = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

    const updateData = {
        subscription_tier: tier,
        subscription_status: subscription.status,
    };

    if (expiresAt) {
        updateData.subscription_current_period_end = expiresAt;
        updateData.subscription_expires_at = expiresAt;
    }

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('stripe_subscription_id', subscription.id);

    if (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }

    console.log(`Updated subscription ${subscription.id} to tier ${tier}`);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);

    const { error } = await supabase
        .from('profiles')
        .update({
            subscription_tier: 'survivor', // Downgrade to free
            subscription_status: 'canceled',
        })
        .eq('stripe_subscription_id', subscription.id);

    if (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }

    console.log(`Downgraded subscription ${subscription.id} to survivor`);
}
