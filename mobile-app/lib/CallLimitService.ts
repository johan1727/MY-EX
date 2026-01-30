import { supabase } from './supabase';

export type PlanTier = 'free' | 'warrior' | 'phoenix';

export const VOICE_LIMITS_MINUTES: Record<PlanTier, number> = {
    free: 0,       // Demo disabled by default effectively
    warrior: 10,   // 10 minutes/month
    phoenix: 60    // 60 minutes/month
};

export interface UsageStatus {
    canCall: boolean;
    minutesUsed: number;
    minutesLimit: number;
    minutesRemaining: number;
    tier: PlanTier;
    usagePercent: number;
}

class CallLimitService {
    /**
     * Get current month-year string (e.g. "01-2026")
     */
    private getCurrentMonthKey(): string {
        const now = new Date();
        return `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }

    /**
     * Get user's current tier (mocked or from DB)
     */
    async getUserTier(userId: string): Promise<PlanTier> {
        // TODO: Comprobar tier real desde 'profiles' o 'subscriptions'
        // Por ahora asumimos que si tiene acceso a la feature, verificamos su metadata
        // o hacemos un fetch a la tabla de usuarios.

        const { data, error } = await supabase
            .from('profiles') // Asumiendo que existe una tabla profiles con 'subscription_tier'
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        if (error || !data) return 'free';

        const tier = data.subscription_tier?.toLowerCase();
        if (tier === 'phoenix') return 'phoenix';
        if (tier === 'warrior') return 'warrior';
        return 'free';
    }

    /**
     * Check if user can start/continue a call
     */
    async checkUsageStatus(userId: string): Promise<UsageStatus> {
        const monthKey = this.getCurrentMonthKey();
        const tier = await this.getUserTier(userId);
        const limit = VOICE_LIMITS_MINUTES[tier];

        if (limit === 0) {
            return { canCall: false, minutesUsed: 0, minutesLimit: 0, minutesRemaining: 0, tier, usagePercent: 100 };
        }

        // Get call_credits from profiles
        const { data: profileData } = await supabase
            .from('profiles')
            .select('call_credits')
            .eq('id', userId)
            .single();

        const credits = profileData?.call_credits || 0;

        // Sumar todo el uso del mes
        const { data, error } = await supabase
            .from('voice_usage_logs')
            .select('minutes_used')
            .eq('user_id', userId)
            .eq('month_year', monthKey);

        if (error) {
            console.error('[CallLimitService] Error checking usage:', error);
            // Fail safe: deny if error to avoid free usage leak
            return { canCall: false, minutesUsed: 0, minutesLimit: limit, minutesRemaining: 0, tier, usagePercent: 100 };
        }

        const totalUsed = data.reduce((sum, row) => sum + row.minutes_used, 0);
        const monthlyRemaining = Math.max(0, limit - totalUsed);
        const totalRemaining = monthlyRemaining + credits;
        const percent = Math.min(100, (totalUsed / limit) * 100);

        return {
            canCall: totalRemaining > 0,
            minutesUsed: totalUsed,
            minutesLimit: limit,
            minutesRemaining: totalRemaining,
            tier,
            usagePercent: percent
        };
    }

    /**
     * Log usage after a call
     */
    async logUsage(userId: string, profileId: string, secondsUsed: number): Promise<void> {
        if (secondsUsed <= 0) return;

        const minutes = Number((secondsUsed / 60).toFixed(2));
        const monthKey = this.getCurrentMonthKey();

        // Log the usage
        const { error } = await supabase
            .from('voice_usage_logs')
            .insert({
                user_id: userId,
                profile_id: profileId,
                minutes_used: minutes,
                month_year: monthKey
            });

        if (error) {
            console.error('[CallLimitService] Failed to log usage:', error);
            return;
        }

        console.log(`[CallLimitService] Logged ${minutes} mins for user ${userId}`);

        // Check if we need to deduct from credits
        const tier = await this.getUserTier(userId);
        const limit = VOICE_LIMITS_MINUTES[tier];

        // Get total usage for this month
        const { data: usageData } = await supabase
            .from('voice_usage_logs')
            .select('minutes_used')
            .eq('user_id', userId)
            .eq('month_year', monthKey);

        const totalUsed = usageData?.reduce((sum, row) => sum + row.minutes_used, 0) || 0;
        const overage = totalUsed - limit;

        if (overage > 0) {
            // We're over the monthly limit, deduct from credits
            const { data: profileData } = await supabase
                .from('profiles')
                .select('call_credits')
                .eq('id', userId)
                .single();

            const currentCredits = profileData?.call_credits || 0;
            const creditsToDeduct = Math.min(overage, currentCredits);

            if (creditsToDeduct > 0) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ call_credits: currentCredits - creditsToDeduct })
                    .eq('id', userId);

                if (!updateError) {
                    console.log(`[CallLimitService] Deducted ${creditsToDeduct} mins from credits (${currentCredits} -> ${currentCredits - creditsToDeduct})`);
                }
            }
        }
    }
}

export const callLimitService = new CallLimitService();
