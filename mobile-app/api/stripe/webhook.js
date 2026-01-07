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

    // LIVE Annual Price IDs
    'price_1Sn4siP3GWiMooGSc336SbzN': 'explorer',  // Explorer Annual LIVE
    'price_1Sn4uNP3GWiMooGSsVmPQzAg': 'warrior',   // Warrior Annual LIVE
    'price_1Sn4uhP3GWiMooGSwqepVrYh': 'phoenix',   // Phoenix Annual LIVE
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

            case 'customer.subscription.created': {
                const subscription = event.data.object;
                console.log('[Webhook] Subscription created event received');
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                console.log('[Webhook] Invoice payment succeeded');

                // Only process subscription invoices (not one-time payments)
                if (invoice.subscription) {
                    await handleInvoicePaid(invoice);
                }
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
    console.log('[Webhook] Subscription updated/created:', JSON.stringify({
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        customer: subscription.customer,
    }));

    const priceId = subscription.items.data[0].price.id;
    const tier = PRICE_TO_TIER[priceId] || 'survivor';
    console.log('[Webhook] Price ID:', priceId, '-> Tier:', tier);

    // Calculate expiration date with FALLBACK for Stripe TEST mode bug
    let expiresAt;

    if (subscription.current_period_end) {
        // Normal case: Stripe provides the end date
        expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        console.log('[Webhook] Using Stripe period_end:', expiresAt);
    } else {
        // FALLBACK: Stripe TEST mode sends null - calculate manually
        console.log('[Webhook] ⚠️ Stripe sent null period_end, calculating...');

        // Use billing_cycle_anchor (always present) + interval
        const billingStart = subscription.billing_cycle_anchor || subscription.created || Math.floor(Date.now() / 1000);
        const interval = subscription.items.data[0].price.recurring?.interval || 'month';
        const intervalCount = subscription.items.data[0].price.recurring?.interval_count || 1;

        const startDate = new Date(billingStart * 1000);
        console.log('[Webhook] Billing start:', startDate.toISOString(), 'Interval:', interval, intervalCount);

        // Calculate end date based on interval
        if (interval === 'month') {
            startDate.setMonth(startDate.getMonth() + intervalCount);
        } else if (interval === 'year') {
            startDate.setFullYear(startDate.getFullYear() + intervalCount);
        } else if (interval === 'week') {
            startDate.setDate(startDate.getDate() + (7 * intervalCount));
        } else if (interval === 'day') {
            startDate.setDate(startDate.getDate() + intervalCount);
        }

        expiresAt = startDate.toISOString();
        console.log('[Webhook] ✅ Calculated period_end:', expiresAt);
    }

    const startDateISO = subscription.start_date
        ? new Date(subscription.start_date * 1000).toISOString()
        : new Date().toISOString();

    const updateData = {
        subscription_tier: tier,
        subscription_status: subscription.status,
        subscription_current_period_end: expiresAt,
        subscription_expires_at: expiresAt,
        subscription_start_date: startDateISO,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
    };

    console.log('[Webhook] Update data for subscription event:', JSON.stringify(updateData));

    // Update using customer ID
    const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('stripe_customer_id', subscription.customer)
        .select();

    console.log('[Webhook] Subscription update result:', JSON.stringify(data));

    if (error) {
        console.error('[Webhook] Error updating subscription:', error);
        throw error;
    }

    console.log(`[Webhook] ✅ Subscription updated for customer ${subscription.customer}, expires: ${expiresAt} to tier ${tier}`);
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

async function handleInvoicePaid(invoice) {
    console.log('[Webhook] Invoice paid:', JSON.stringify({
        id: invoice.id,
        subscription: invoice.subscription,
        customer: invoice.customer,
        amount_paid: invoice.amount_paid,
    }));

    try {
        // Get the full subscription object to get the updated period_end
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

        console.log('[Webhook] Retrieved subscription for invoice:', JSON.stringify({
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
        }));

        const priceId = subscription.items.data[0].price.id;
        const tier = PRICE_TO_TIER[priceId] || 'survivor';

        // Update the subscription period_end with FALLBACK
        let expiresAt;

        if (subscription.current_period_end) {
            expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
            console.log('[Webhook] Using Stripe period_end for renewal:', expiresAt);
        } else {
            // FALLBACK: Calculate manually
            console.log('[Webhook] ⚠️ Calculating period_end for renewal...');
            const billingStart = subscription.billing_cycle_anchor || subscription.created || Math.floor(Date.now() / 1000);
            const interval = subscription.items.data[0].price.recurring?.interval || 'month';
            const intervalCount = subscription.items.data[0].price.recurring?.interval_count || 1;

            const startDate = new Date(billingStart * 1000);

            if (interval === 'month') {
                startDate.setMonth(startDate.getMonth() + intervalCount);
            } else if (interval === 'year') {
                startDate.setFullYear(startDate.getFullYear() + intervalCount);
            } else if (interval === 'week') {
                startDate.setDate(startDate.getDate() + (7 * intervalCount));
            } else if (interval === 'day') {
                startDate.setDate(startDate.getDate() + intervalCount);
            }

            expiresAt = startDate.toISOString();
            console.log('[Webhook] ✅ Calculated renewal period_end:', expiresAt);
        }

        const updateData = {
            subscription_tier: tier,
            subscription_status: subscription.status,
            subscription_current_period_end: expiresAt,
            subscription_expires_at: expiresAt,
        };

        console.log('[Webhook] Updating renewal period:', JSON.stringify(updateData));

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('stripe_customer_id', invoice.customer)
            .select();

        if (error) {
            console.error('[Webhook] Error updating renewal:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ Renewal processed for customer ${invoice.customer}, new period_end: ${expiresAt}`);
    } catch (error) {
        console.error('[Webhook] Error handling invoice payment:', error);
        throw error;
    }
}
