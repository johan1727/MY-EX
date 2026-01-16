import { supabase } from './supabase';

export type PlanTier = 'free' | 'warrior' | 'phoenix';

export const VOICE_LIMITS_MINUTES: Record<PlanTier, number> = {
    free: 0,       // Demo disabled by default effectively, or super short if we change mind
    warrior: 15,   // Reduced to 15m due to High Quality Model costs
    phoenix: 60    // $123 MXN cost
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
        const remaining = Math.max(0, limit - totalUsed);
        const percent = Math.min(100, (totalUsed / limit) * 100);

        return {
            canCall: totalUsed < limit,
            minutesUsed: totalUsed,
            minutesLimit: limit,
            minutesRemaining: remaining,
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
            // Podríamos intentar reintentar o guardar localmente para sync después
        } else {
            console.log(`[CallLimitService] Logged ${minutes} mins for user ${userId}`);
        }
    }
}

export const callLimitService = new CallLimitService();
