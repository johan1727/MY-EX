import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
export type SubscriptionTier = 'survivor' | 'warrior' | 'phoenix';

interface SubscriptionContextType {
    tier: SubscriptionTier;
    isLoading: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    checkFeatureAccess: (feature: string) => boolean;
    getRemainingQuota: (feature: string) => number; // -1 para ilimitado
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Configuración de límites por plan
const TIER_LIMITS = {
    survivor: {
        daily_messages: 10,
        weekly_decodings: 1,
        vault_access: false,
        mood_journal: false,
        export_data: false,
        ex_simulator: false,
    },
    warrior: {
        daily_messages: -1, // Ilimitado
        weekly_decodings: -1,
        vault_access: true,
        mood_journal: true,
        export_data: true,
        ex_simulator: true,
    },
    phoenix: {
        daily_messages: -1,
        weekly_decodings: -1,
        vault_access: true,
        mood_journal: true,
        export_data: true,
        ex_simulator: true,
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
            console.log('[Subscription] Supabase URL:', supabase.supabaseUrl);

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', userId)
                .single();

            console.log('[Subscription] Query completed');
            console.log('[Subscription] Error:', error);
            console.log('[Subscription] Profile data:', profile);

            if (error) {
                console.error('[Subscription] ❌ Error fetching tier from Supabase:', error);
                console.error('[Subscription] Error details:', JSON.stringify(error, null, 2));
                return;
            }

            console.log('[Subscription] Profile data from Supabase:', profile);

            if (profile && profile.subscription_tier) {
                const newTier = profile.subscription_tier as SubscriptionTier;
                console.log('[Subscription] ✅ Setting tier from Supabase:', newTier);
                setTier(newTier);

                // Force a re-render by setting the tier again after a short delay
                setTimeout(() => {
                    console.log('[Subscription] Confirming tier:', newTier);
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
        // ============================================
        // TEMP: Deshabilitar RevenueCat temporalmente
        // Esto evita el error "Wrong API Key" hasta configurar productos en Google Play
        // TODO: Reactivar cuando tengas productos configurados en Google Play Console
        // ============================================
        console.log('[Subscription] ⚠️ RevenueCat deshabilitado temporalmente');
        console.log('[Subscription] ✅ Tier phoenix (acceso completo) activado');
        setTier('phoenix');
        setIsLoading(false);
        return;
        // ============================================

        // RevenueCat initialization
        // Make sure to set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in .env

        try {
            // Usamos la key de prueba si no hay una en el entorno
            const apiKey = Platform.OS === 'android'
                ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'test_BRFygdGVZSuHBmcaRQqZe11'
                : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'test_BRFygdGVZSuHBmcaRQqZe11';

            await Purchases.configure({ apiKey });

            // Identificar usuario si está logueado
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                console.log('[Subscription] User found, fetching tier from Supabase');
                if (Platform.OS !== 'web') {
                    await Purchases.logIn(user.id);
                }
                // ALWAYS fetch from Supabase first for web
                await fetchTierFromSupabase(user.id);
            } else {
                console.log('[Subscription] No user found');
            }

            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);

            // Only use RevenueCat info if we didn't get it from Supabase or if it's a native purchase
            if (Platform.OS !== 'web') {
                updateTierFromInfo(info);
            } else {
                console.log('[Subscription] Web platform - using Supabase tier only');
            }

            await loadOfferings();
        } catch (e) {
            console.error('Error initializing RevenueCat:', e);
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
        // If we already have a tier from Supabase (e.g. set in initRevenueCat), 
        // we might want to keep it unless RevenueCat has a newer/better one.
        // For now, we'll let RevenueCat override ONLY if it detects a paid tier.

        if (info.entitlements.active['phoenix']) {
            setTier('phoenix');
        } else if (info.entitlements.active['warrior']) {
            setTier('warrior');
        } else {
            // Only revert to survivor if we are NOT on web (where we rely on Supabase)
            // or if we want to enforce RevenueCat's source of truth.
            // For this specific case, we'll leave it as is, but the initRevenueCat logic 
            // handles the initial load from Supabase.
            if (Platform.OS !== 'web') {
                setTier('survivor');
            }
        }
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            setCustomerInfo(customerInfo);
            updateTierFromInfo(customerInfo);
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Purchase error:', e);
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
