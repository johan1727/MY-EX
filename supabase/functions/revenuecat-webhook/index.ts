import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || '';

serve(async (req) => {
    try {
        if (REVENUECAT_WEBHOOK_SECRET) {
            const authHeader = req.headers.get('authorization');
            if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
                return new Response('Unauthorized', { status: 401 });
            }
        }

        const body = await req.json();
        const event = body.event || body;
        const eventType = event.type;
        const userId = event.app_user_id;
        const productId = event.product_id;

        // V2: El subscriber puede no estar, pero tenemos entitlement_ids en el evento
        const subscriber = event.subscriber || (body.event ? body.event.subscriber : null) || {};

        // ESTRATEGIA: 1. Mapa detallado, 2. Lista IDs, 3. Product ID directo
        const entitlementsMap = subscriber.entitlements || {};
        const entitlementIdsList = event.entitlement_ids || [];

        console.log(`[RevenueCat] Processing ${eventType} for ${userId}`);
        console.log(`[RevenueCat] Product ID: ${productId}`);
        console.log('[RevenueCat] IDs List:', JSON.stringify(entitlementIdsList));

        if (!userId) return new Response('No user ID', { status: 400 });

        // Función helper
        const hasEntitlement = (id: string, keyword: string) => {
            // 1. Mapa detallado
            if (entitlementsMap[id]?.expires_date) return true;
            // 2. Lista IDs
            if (entitlementIdsList.some((e: string) => e.toLowerCase() === id)) return true;
            // 3. Fallback: Product ID contiene palabra clave (ej: 'phoenix_monthly' contiene 'phoenix')
            if (productId && productId.toLowerCase().includes(keyword)) return true;

            return false;
        };

        switch (eventType) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'PRODUCT_CHANGE':
            case 'UNCANCELLATION': {
                let tier = 'survivor';
                let expiresAt: string | null = null;
                let status = 'active';

                // Usamos Keywords para buscar en product_id si falla entitlements
                if (hasEntitlement('phoenix', 'phoenix')) tier = 'phoenix';
                else if (hasEntitlement('warrior', 'warrior')) tier = 'warrior';
                else if (hasEntitlement('explorer', 'explorer')) tier = 'explorer';

                // Determinar Expiración
                const isSandbox = event.environment === 'SANDBOX';

                if (isSandbox) {
                    const thirtyDays = new Date();
                    thirtyDays.setDate(thirtyDays.getDate() + 30);
                    expiresAt = thirtyDays.toISOString();
                    console.log(`[Webhook] SANDBOX: Force 30 days expiry -> ${expiresAt}`);
                } else if (entitlementsMap[tier]?.expires_date) {
                    expiresAt = entitlementsMap[tier].expires_date;
                } else if (event.expiration_at_ms) {
                    expiresAt = new Date(event.expiration_at_ms).toISOString();
                }

                // FIX: Sandbox/Test purchases often expire in minutes.
                // If expiration is < 2 days from now, force it to 1 month from now for UX
                const now = new Date();
                const expDate = expiresAt ? new Date(expiresAt) : now;
                const diffHours = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (diffHours < 48) {
                    console.log(`[RevenueCat] Short expiration detected (${diffHours.toFixed(1)}h), forcing 1 month for UX`);
                    const newExp = new Date();
                    newExp.setMonth(newExp.getMonth() + 1);
                    expiresAt = newExp.toISOString();
                }

                console.log(`[RevenueCat] Detected Tier: ${tier}`);

                const { error } = await supabase.from('profiles').update({
                    subscription_tier: tier,
                    subscription_status: status,
                    subscription_expires_at: expiresAt
                }).eq('id', userId);

                if (error) {
                    console.error('[RevenueCat] Error DB:', error);
                    return new Response(JSON.stringify(error), { status: 500 });
                }
                console.log(`[RevenueCat] ✅ Updated: ${tier}`);
                break;
            }

            case 'CANCELLATION':
                await supabase.from('profiles').update({ subscription_status: 'cancelled' }).eq('id', userId);
                console.log(`[RevenueCat] ✅ Cancelled`);
                break;

            case 'EXPIRATION':
                await supabase.from('profiles').update({ subscription_tier: 'survivor', subscription_status: 'expired' }).eq('id', userId);
                console.log(`[RevenueCat] ✅ Expired`);
                break;

            case 'BILLING_ISSUE':
                await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', userId);
                console.log(`[RevenueCat] ✅ Past Due`);
                break;
        }

        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('[RevenueCat] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
