import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
    },
    warrior: {
        daily_messages: -1, // Ilimitado
        weekly_decodings: -1,
        vault_access: true,
        mood_journal: true,
        export_data: true,
    },
    phoenix: {
        daily_messages: -1,
        weekly_decodings: -1,
        vault_access: true,
        mood_journal: true,
        export_data: true,
    },
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [tier, setTier] = useState<SubscriptionTier>('survivor');
    const [isLoading, setIsLoading] = useState(true);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    useEffect(() => {
        initRevenueCat();
    }, []);

    const initRevenueCat = async () => {
        try {
            // Usamos la key de prueba si no hay una en el entorno
            const apiKey = Platform.OS === 'android'
                ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'test_BRFygdGVZSuHBmcaRQqZe11'
                : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'test_BRFygdGVZSuHBmcaRQqZe11';

            await Purchases.configure({ apiKey });

            // Identificar usuario si está logueado
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await Purchases.logIn(user.id);
            }

            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);
            updateTierFromInfo(info);

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
        if (info.entitlements.active['phoenix']) {
            setTier('phoenix');
        } else if (info.entitlements.active['warrior']) {
            setTier('warrior');
        } else {
            setTier('survivor');
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
