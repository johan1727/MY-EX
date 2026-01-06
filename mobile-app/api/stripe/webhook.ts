import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Received Stripe event:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCanceled(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('💰 Payment succeeded:', invoice.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log('❌ Payment failed:', invoice.id);
                // TODO: Enviar email al usuario
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) {
        console.error('No userId in session metadata');
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0].price.id;

    // Map price ID to tier
    const tierMapping: Record<string, string> = {
        [process.env.STRIPE_PRICE_EXPLORER!]: 'explorer',
        [process.env.STRIPE_PRICE_WARRIOR!]: 'warrior',
        [process.env.STRIPE_PRICE_PHOENIX!]: 'phoenix',
    };

    const tier = tierMapping[priceId] || 'survivor';

    // Update Supabase
    const { error } = await supabase
        .from('profiles')
        .update({
            subscription_tier: tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
        })
        .eq('id', userId);

    if (error) {
        console.error('Error updating user subscription:', error);
    } else {
        console.log(`✅ User ${userId} upgraded to ${tier}`);
    }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Find user by stripe_customer_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!profile) {
        console.error('User not found for customer:', customerId);
        return;
    }

    const priceId = subscription.items.data[0].price.id;

    const tierMapping: Record<string, string> = {
        [process.env.STRIPE_PRICE_EXPLORER!]: 'explorer',
        [process.env.STRIPE_PRICE_WARRIOR!]: 'warrior',
        [process.env.STRIPE_PRICE_PHOENIX!]: 'phoenix',
    };

    const tier = tierMapping[priceId] || 'survivor';

    await supabase
        .from('profiles')
        .update({
            subscription_tier: tier,
            subscription_status: subscription.status,
        })
        .eq('id', profile.id);

    console.log(`✅ Subscription updated for user ${profile.id}: ${tier}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!profile) {
        console.error('User not found for customer:', customerId);
        return;
    }

    await supabase
        .from('profiles')
        .update({
            subscription_tier: 'survivor',
            subscription_status: 'canceled',
        })
        .eq('id', profile.id);

    console.log(`❌ Subscription canceled for user ${profile.id}`);
}
