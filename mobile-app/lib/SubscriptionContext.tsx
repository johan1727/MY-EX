import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// Dynamic import for native modules
let Purchases: any;
if (Platform.OS !== 'web') {
    Purchases = require('react-native-purchases').default;
} else {
    // Mock for web
    Purchases = {
        configure: async () => { },
        logIn: async () => { },
        logOut: async () => { },
        getCustomerInfo: async () => ({ entitlements: { active: {} } }),
        getOfferings: async () => ({ current: { availablePackages: [] } }),
        purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
        restorePurchases: async () => ({ entitlements: { active: {} } }),
    };
}

// Definición de tipos
export type SubscriptionTier = 'survivor' | 'explorer' | 'warrior' | 'phoenix';

interface SubscriptionContextType {
    tier: SubscriptionTier;
    isLoading: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    checkFeatureAccess: (feature: string) => boolean;
    getRemainingQuota: (feature: string) => number; // -1 para ilimitado
    setSubscriberAttribute: (key: string, value: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Configuración de límites por plan
// Configuración de límites por plan (Sincronizado con SQL 2026-01-02)
const TIER_LIMITS = {
    survivor: {
        daily_messages: 60, // 18k tokens / 300
        weekly_decodings: 1,
        vault_access: false,
        mood_journal: false,
        export_data: false,
        ex_simulator: false,
        voice_call: false, // NO ACCESS
    },
    explorer: {
        daily_messages: 500, // 150k tokens / 300
        weekly_decodings: 50,
        vault_access: true,
        mood_journal: true,
        export_data: true,
        ex_simulator: true,
        voice_call: false, // NO ACCESS (Warrior+)
    },
    warrior: {
        daily_messages: 1300, // 400k tokens / 300
        weekly_decodings: 200,
        vault_access: true,
        mood_journal: true,
        export_data: true,
        ex_simulator: true,
        voice_call: true, // ACCESS GRANTED
    },
    phoenix: {
        daily_messages: 6500, // 2M tokens / 300 (Virtualmente ilimitado)
        weekly_decodings: 1000,
        vault_access: true,
        mood_journal: true,
        export_data: true,
        ex_simulator: true,
        voice_call: true, // ACCESS GRANTED
    },
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [tier, setTier] = useState<SubscriptionTier>('survivor');
    const [isLoading, setIsLoading] = useState(true);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    useEffect(() => {
        initRevenueCat();

        // Listen for auth changes to update tier immediately when user signs in
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await fetchTierFromSupabase(session.user.id);
                if (Platform.OS !== 'web') {
                    await Purchases.logIn(session.user.id);
                    const info = await Purchases.getCustomerInfo();
                    setCustomerInfo(info);
                    updateTierFromInfo(info);
                }
            } else if (event === 'SIGNED_OUT') {
                setTier('survivor');
                setCustomerInfo(null);
                if (Platform.OS !== 'web') {
                    await Purchases.logOut();
                }
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchTierFromSupabase = async (userId: string) => {
        try {
            console.log('[Subscription] Fetching tier for user:', userId);

            // Create a timeout promise (5s)
            const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Supabase request timed out')), 5000)
            );

            // Execute query - include expires_at for expiration check
            const queryPromise = supabase
                .from('profiles')
                .select('subscription_tier, subscription_expires_at, subscription_current_period_end')
                .eq('id', userId)
                .single();

            // Race against timeout
            const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            console.log('[Subscription] Query completed');

            if (error) {
                console.error('[Subscription] ❌ Error fetching tier from Supabase:', error);
                // Fallback to survivor on error
                setTier('survivor');
                return;
            }

            console.log('[Subscription] Profile data from Supabase:', profile);

            if (profile && profile.subscription_tier) {
                // Ensure we handle case-insensitivity
                let newTier = (profile.subscription_tier as string).toLowerCase() as SubscriptionTier;

                // CHECK IF SUBSCRIPTION EXPIRED
                const expiresAt = profile.subscription_expires_at || profile.subscription_current_period_end;
                if (expiresAt && newTier !== 'survivor') {
                    const expireDate = new Date(expiresAt);
                    const now = new Date();

                    if (now > expireDate) {
                        console.log('[Subscription] ⚠️ Subscription expired locally:', {
                            tier: newTier,
                            expiresAt: expiresAt,
                            now: now.toISOString(),
                        });

                        // CRITICAL FIX: Do NOT auto-downgrade locally yet. 
                        // Trust the DB value until backend updates it.
                        // newTier = 'survivor'; 
                    } else {
                        console.log('[Subscription] ✅ Subscription active until:', expireDate.toISOString());
                    }
                }
                console.log('[Subscription] ✅ Setting tier from Supabase:', newTier);
                setTier(newTier);

                // Force a re-render by setting the tier again after a short delay
                setTimeout(() => {
                    setTier(newTier);
                }, 100);
            } else {
                console.log('[Subscription] ⚠️ No subscription_tier found in profile, defaulting to survivor');
                setTier('survivor');
            }
        } catch (err) {
            console.error('[Subscription] ❌ Exception fetching tier from Supabase:', err);
            console.error('[Subscription] Exception details:', JSON.stringify(err, null, 2));
        }
    };

    const initRevenueCat = async () => {
        try {
            // FIRST: Always try to get user and fetch tier from Supabase
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                console.log('[Subscription] User found, fetching tier from Supabase FIRST');
                await fetchTierFromSupabase(user.id);
            } else {
                console.log('[Subscription] No user found');
            }

            // THEN: Configure RevenueCat for native platforms
            if (Platform.OS !== 'web') {
                const apiKey = Platform.OS === 'android'
                    ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''
                    : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';

                if (apiKey) {
                    await Purchases.configure({ apiKey });

                    if (user) {
                        await Purchases.logIn(user.id);
                    }

                    const info = await Purchases.getCustomerInfo();
                    setCustomerInfo(info);
                    updateTierFromInfo(info);
                    await loadOfferings();
                } else {
                    console.log('[Subscription] No RevenueCat API key for native');
                }
            } else {
                console.log('[Subscription] Web platform - using Supabase tier only (no RevenueCat)');
            }
        } catch (e) {
            console.error('Error initializing subscription:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length > 0) {
                setPackages(offerings.current.availablePackages);
            }
        } catch (e) {
            console.error('Error loading offerings:', e);
        }
    };

    const updateTierFromInfo = (info: CustomerInfo) => {
        // FIXED: Only UPGRADE tier from RevenueCat, never DOWNGRADE.
        // Supabase is the source of truth after webhook updates it.
        // RevenueCat entitlements may be delayed or not synced in sandbox/emulator.

        if (info.entitlements.active['phoenix']) {
            console.log('[Subscription] ✅ RevenueCat has phoenix entitlement');
            setTier('phoenix');
        } else if (info.entitlements.active['warrior']) {
            console.log('[Subscription] ✅ RevenueCat has warrior entitlement');
            setTier('warrior');
        } else if (info.entitlements.active['explorer']) {
            console.log('[Subscription] ✅ RevenueCat has explorer entitlement');
            setTier('explorer');
        } else {
            // CRITICAL FIX: Do NOT revert to survivor here!
            // Supabase has already set the tier from DB (which is updated by webhook).
            // RevenueCat may not have synced yet, especially in sandbox/test mode.
            console.log('[Subscription] ⚠️ No RevenueCat entitlements found, keeping Supabase tier');
            // DO NOT CALL setTier('survivor') - trust Supabase!
        }
    };


    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            setCustomerInfo(customerInfo);
            updateTierFromInfo(customerInfo);

            // CRITICAL: Robust refresh mechanism
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('[Subscription] 🔄 Refreshing tier from Supabase after purchase...');

                // Show immediate success to user while we sync in background
                Alert.alert(
                    '✅ Compra exitosa',
                    'Tu suscripción se ha activado. Actualizando perfil...',
                    [{ text: 'OK' }]
                );

                // Polling mechanism: Check every 2s for 10s
                let attempts = 0;
                const maxAttempts = 5;
                const pollInterval = 2000;

                const checkTier = async () => {
                    attempts++;
                    console.log(`[Subscription] Polling tier attempt ${attempts}/${maxAttempts}`);
                    await fetchTierFromSupabase(user.id);

                    // If we haven't reached max attempts, schedule next check
                    if (attempts < maxAttempts) {
                        setTimeout(checkTier, pollInterval);
                    }
                };

                // Start polling
                checkTier();
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Purchase error:', e);
                // Alert handled by revenuecat usually, but good to log
                throw e;
            }
        }
    };

    const restorePurchases = async () => {
        try {
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);
            updateTierFromInfo(info);
        } catch (e) {
            console.error('Restore error:', e);
            throw e;
        }
    };

    const checkFeatureAccess = (feature: string): boolean => {
        const limits = TIER_LIMITS[tier];
        // @ts-ignore
        return limits[feature] === true || limits[feature] === -1 || limits[feature] > 0;
    };

    const getRemainingQuota = (feature: string): number => {
        // @ts-ignore
        return TIER_LIMITS[tier][feature] ?? 0;
    };

    const setSubscriberAttribute = async (key: string, value: string) => {
        if (Platform.OS !== 'web') {
            try {
                await Purchases.setAttributes({ [key]: value });
                console.log(`[Subscription] Attribute set: ${key}=${value}`);
            } catch (e) {
                console.error('[Subscription] Error setting attribute:', e);
            }
        }
    };

    return (
        <SubscriptionContext.Provider
            value={{
                tier,
                isLoading,
                packages,
                purchasePackage,
                restorePurchases,
                checkFeatureAccess,
                getRemainingQuota,
                setSubscriberAttribute,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
