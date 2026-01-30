import { supabase } from './supabase';

const DAILY_LIMIT = 20; // Matches SURVIVOR tier limit
// Burst limit is handled locally for UI responsiveness but daily limit is the hard stop source of truth

export async function checkFreeTierLimits(userId: string): Promise<{ allowed: boolean; reason?: 'daily' | 'total', waitTime?: number }> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('daily_message_count, last_message_reset_date, subscription_tier')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error('[UsageTracking] Error checking limits:', error);
            return { allowed: true }; // Fail open to not block user
        }

        // If paid user, always allowed
        if (data.subscription_tier !== 'survivor') {
            return { allowed: true };
        }

        // Check date reset
        const today = new Date().toISOString().split('T')[0];
        if (data.last_message_reset_date !== today) {
            // It's a new day, we need to reset count. 
            // We'll do this lazily on the next increment, so here we just allow it.
            return { allowed: true };
        }

        // Check limit
        if (data.daily_message_count >= DAILY_LIMIT) {
            return { allowed: false, reason: 'daily' };
        }

        return { allowed: true };
    } catch (e) {
        console.error('[UsageTracking] Exception checking limits:', e);
        return { allowed: true };
    }
}

export async function incrementFreeTierUsage(userId: string): Promise<void> {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Use RPC or direct update? Direct update is risky for race conditions but simpler.
        // Better: Fetch, check date, update.

        const { data } = await supabase
            .from('profiles')
            .select('daily_message_count, last_message_reset_date')
            .eq('id', userId)
            .single();

        if (!data) return;

        let newCount = data.daily_message_count + 1;
        let newDate = data.last_message_reset_date;

        if (data.last_message_reset_date !== today) {
            newCount = 1;
            newDate = today;
        }

        await supabase
            .from('profiles')
            .update({
                daily_message_count: newCount,
                last_message_reset_date: newDate
            })
            .eq('id', userId);

        console.log(`[UsageTracking] Updated limits for ${userId}: ${newCount}/${DAILY_LIMIT}`);

    } catch (e) {
        console.error('[UsageTracking] Error incrementing usage:', e);
    }
}

// Legacy function kept for compatibility but no-op or clear storage
export async function resetUsage(userId: string): Promise<void> {
    // No-op for DB based tracking relies on dates
}
