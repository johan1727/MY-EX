import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
        return new Response('Missing signature or webhook secret', { status: 400 })
    }

    try {
        const body = await req.text()

        // Verify webhook signature
        // Use constructEventAsync for Edge/Deno environments to avoid synchronous crypto errors
        const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

        console.log(`[Webhook] Event type: ${event.type}`)

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                // Get user ID from metadata or client_reference_id
                const userId = session.metadata?.userId || session.client_reference_id

                if (!userId) {
                    console.error('[Webhook] No userId found in session')
                    return new Response('No userId', { status: 400 })
                }

                // Get subscription details
                const subscriptionId = session.subscription as string
                const customerId = session.customer as string

                if (!subscriptionId) {
                    console.error('[Webhook] No subscription ID found')
                    return new Response('No subscription', { status: 400 })
                }

                // Fetch full subscription details from Stripe
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)

                // Determine tier based on price ID
                const priceId = subscription.items.data[0]?.price.id
                let tier = 'survivor' // default

                // Map price IDs to tiers
                const priceToTier: Record<string, string> = {
                    // Monthly prices (LIVE)
                    'price_1RsodvP3GWiMooGSMQpJ0KL8': 'explorer',
                    'price_1RqOMRP3GWiMooGSD5OPjzim': 'warrior',
                    'price_1RqOM5P3GWiMooGS8k3BDdW8': 'phoenix',
                    // Annual prices (LIVE)
                    'price_1Sn4siP3GWiMooGSc336SbzN': 'explorer',
                    'price_1Sn4uNP3GWiMooGSsVmPQzAg': 'warrior',
                    'price_1Sn4uhP3GWiMooGSwqepVrYh': 'phoenix',
                }

                if (priceId && priceToTier[priceId]) {
                    tier = priceToTier[priceId]
                }

                console.log(`[Webhook] Updating subscription for user ${userId} to tier ${tier}`)

                // Update profiles table with subscription info
                // NOTE: Changed from 'users' to 'profiles' to match schema
                const { error: userError } = await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: tier,
                        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
                        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
                        stripe_customer_id: customerId,
                        subscription_status: 'active'
                    })
                    .eq('id', userId)

                if (userError) {
                    console.error('[Webhook] Error updating user tier:', userError)
                    // Don't fail the webhook, subscription is already created
                }

                console.log('[Webhook] Subscription updated successfully')
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string

                // Find user by customer ID in profiles table
                const { data: userData, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (fetchError || !userData) {
                    console.error('[Webhook] User not found for customer:', customerId)
                    return new Response('User not found', { status: 404 })
                }

                // Determine tier
                const priceId = subscription.items.data[0]?.price.id
                let tier = 'survivor'

                const priceToTier: Record<string, string> = {
                    // Monthly prices (LIVE)
                    'price_1RsodvP3GWiMooGSMQpJ0KL8': 'explorer',
                    'price_1RqOMRP3GWiMooGSD5OPjzim': 'warrior',
                    'price_1RqOM5P3GWiMooGS8k3BDdW8': 'phoenix',
                    // Annual prices (LIVE)
                    'price_1Sn4siP3GWiMooGSc336SbzN': 'explorer',
                    'price_1Sn4uNP3GWiMooGSsVmPQzAg': 'warrior',
                    'price_1Sn4uhP3GWiMooGSwqepVrYh': 'phoenix',
                }

                if (priceId && priceToTier[priceId]) {
                    tier = priceToTier[priceId]
                }

                // Update profiles table
                const { error: userError } = await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: tier,
                        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
                        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
                        subscription_status: 'active'
                    })
                    .eq('id', userData.id)

                if (userError) {
                    console.error('[Webhook] Error updating user tier:', userError)
                }

                console.log('[Webhook] Subscription updated')
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const customerId = subscription.customer as string

                // Find user by customer ID
                const { data: userData, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (fetchError || !userData) {
                    console.error('[Webhook] User not found')
                    return new Response('User not found', { status: 404 })
                }

                // Reset profiles table to free tier
                const { error: userError } = await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: 'survivor',
                        subscription_expires_at: null,
                        subscription_start_date: null,
                        subscription_status: 'free'
                    })
                    .eq('id', userData.id)

                if (userError) {
                    console.error('[Webhook] Error resetting user tier:', userError)
                }

                console.log('[Webhook] Subscription canceled')
                break
            }

            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        console.error('[Webhook] Error:', err.message)
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
