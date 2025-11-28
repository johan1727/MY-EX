import { supabase } from './supabase';

export enum SubscriptionTier {
    SURVIVOR = 'survivor',
    WARRIOR = 'warrior',
    PHOENIX = 'phoenix'
}

export interface SubscriptionFeatures {
    dailyMessages: number; // -1 = unlimited
    messageDecoder: number; // per week, -1 = unlimited
    moodJournal: boolean;
    analytics: 'none' | 'weekly' | 'daily';
    panicButton: 'basic' | 'advanced';
    notifications: number; // per week, -1 = unlimited
    vault: boolean;
    exportDiary: boolean;
    coachingSessions?: boolean;
    prioritySupport?: boolean;
    earlyAccess?: boolean;
}

export const SUBSCRIPTION_CONFIG: Record<SubscriptionTier, {
    name: string;
    price: number;
    yearlyPrice?: number;
    features: SubscriptionFeatures;
    badge: string;
    color: string;
}> = {
    [SubscriptionTier.SURVIVOR]: {
        name: 'Survivor',
        price: 0,
        badge: '🌱',
        color: '#22c55e',
        features: {
            dailyMessages: 10,
            messageDecoder: 1,
            moodJournal: true,
            analytics: 'none',
            panicButton: 'basic',
            notifications: 0,
            vault: false,
            exportDiary: false
        }
    },
    [SubscriptionTier.WARRIOR]: {
        name: 'Warrior',
        price: 7.99,
        yearlyPrice: 79.99,
        badge: '💪',
        color: '#3b82f6',
        features: {
            dailyMessages: -1,
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 5,
            vault: true,
            exportDiary: true
        }
    },
    [SubscriptionTier.PHOENIX]: {
        name: 'Phoenix',
        price: 14.99,
        yearlyPrice: 149.99,
        badge: '👑',
        color: '#a855f7',
        features: {
            dailyMessages: -1,
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'daily',
            panicButton: 'advanced',
            notifications: -1,
            vault: true,
            exportDiary: true,
            coachingSessions: true,
            prioritySupport: true,
            earlyAccess: true
        }
    }
};

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status, subscription_expires_at')
            .eq('user_id', userId)
            .single();

        if (!data || data.subscription_status !== 'active') {
            return SubscriptionTier.SURVIVOR;
        }

        // Check if subscription has expired
        if (data.subscription_expires_at) {
            const expiresAt = new Date(data.subscription_expires_at);
            if (expiresAt < new Date()) {
                // Subscription expired, downgrade to free
                await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: SubscriptionTier.SURVIVOR,
                        subscription_status: 'expired'
                    })
                    .eq('user_id', userId);

                return SubscriptionTier.SURVIVOR;
            }
        }

        return (data.subscription_tier as SubscriptionTier) || SubscriptionTier.SURVIVOR;
    } catch (error) {
        console.error('Error getting subscription:', error);
        return SubscriptionTier.SURVIVOR;
    }
}

export async function canUseFeature(
    userId: string,
    feature: 'message' | 'decoder' | 'vault' | 'export' | 'coaching'
): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
    try {
        const tier = await getUserSubscription(userId);
        const config = SUBSCRIPTION_CONFIG[tier];

        // Reset counters if needed
        await resetCountersIfNeeded(userId);

        const { data: profile } = await supabase
            .from('profiles')
            .select('daily_message_count, weekly_decoder_count')
            .eq('user_id', userId)
            .single();

        if (!profile) {
            return { allowed: false, reason: 'Profile not found' };
        }

        switch (feature) {
            case 'message':
                const messageLimit = config.features.dailyMessages;
                if (messageLimit === -1) {
                    return { allowed: true };
                }
                if (profile.daily_message_count >= messageLimit) {
                    return {
                        allowed: false,
                        reason: 'Daily message limit reached',
                        limit: messageLimit,
                        current: profile.daily_message_count
                    };
                }
                return {
                    allowed: true,
                    limit: messageLimit,
                    current: profile.daily_message_count
                };

            case 'decoder':
                const decoderLimit = config.features.messageDecoder;
                if (decoderLimit === -1) {
                    return { allowed: true };
                }
                if (profile.weekly_decoder_count >= decoderLimit) {
                    return {
                        allowed: false,
                        reason: 'Weekly decoder limit reached',
                        limit: decoderLimit,
                        current: profile.weekly_decoder_count
                    };
                }
                return {
                    allowed: true,
                    limit: decoderLimit,
                    current: profile.weekly_decoder_count
                };

            case 'vault':
                return {
                    allowed: config.features.vault,
                    reason: config.features.vault ? undefined : 'Upgrade to Warrior or Phoenix to access Vault'
                };

            case 'export':
                return {
                    allowed: config.features.exportDiary,
                    reason: config.features.exportDiary ? undefined : 'Upgrade to Warrior or Phoenix to export diary'
                };

            case 'coaching':
                return {
                    allowed: config.features.coachingSessions || false,
                    reason: config.features.coachingSessions ? undefined : 'Upgrade to Phoenix to access coaching sessions'
                };

            default:
                return { allowed: false, reason: 'Unknown feature' };
        }
    } catch (error) {
        console.error('Error checking feature access:', error);
        return { allowed: false, reason: 'Error checking access' };
    }
}

export async function incrementFeatureUsage(userId: string, feature: 'message' | 'decoder') {
    try {
        if (feature === 'message') {
            await supabase.rpc('increment', {
                row_id: userId,
                column_name: 'daily_message_count'
            });
        } else if (feature === 'decoder') {
            await supabase.rpc('increment', {
                row_id: userId,
                column_name: 'weekly_decoder_count'
            });
        }

        // Track usage in analytics
        await supabase.from('feature_usage').insert({
            user_id: userId,
            feature_name: feature,
            usage_count: 1
        });
    } catch (error) {
        console.error('Error incrementing feature usage:', error);
    }
}

async function resetCountersIfNeeded(userId: string) {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('last_message_reset_date, last_decoder_reset_date')
            .eq('user_id', userId)
            .single();

        if (!data) return;

        const today = new Date().toISOString().split('T')[0];

        // Reset daily message counter
        if (data.last_message_reset_date !== today) {
            await supabase
                .from('profiles')
                .update({
                    daily_message_count: 0,
                    last_message_reset_date: today
                })
                .eq('user_id', userId);
        }

        // Reset weekly decoder counter (every 7 days)
        const lastReset = new Date(data.last_decoder_reset_date);
        const daysSinceReset = Math.floor((Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceReset >= 7) {
            await supabase
                .from('profiles')
                .update({
                    weekly_decoder_count: 0,
                    last_decoder_reset_date: today
                })
                .eq('user_id', userId);
        }
    } catch (error) {
        console.error('Error resetting counters:', error);
    }
}

export function getFeatureDescription(tier: SubscriptionTier, feature: keyof SubscriptionFeatures): string {
    const config = SUBSCRIPTION_CONFIG[tier].features;
    const value = config[feature];

    if (typeof value === 'boolean') {
        return value ? '✓ Included' : '✗ Not included';
    }
    if (typeof value === 'number') {
        return value === -1 ? 'Unlimited' : `${value} per ${feature.includes('daily') ? 'day' : 'week'}`;
    }
    return String(value);
}

export function calculateSavings(tier: SubscriptionTier): number {
    const config = SUBSCRIPTION_CONFIG[tier];
    if (!config.yearlyPrice || !config.price) return 0;

    const monthlyTotal = config.price * 12;
    const savings = monthlyTotal - config.yearlyPrice;
    const percentage = Math.round((savings / monthlyTotal) * 100);

    return percentage;
}
