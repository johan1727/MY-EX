import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, PurchasesError } from 'react-native-purchases';
import { supabase } from './supabase';

// Define valid subscription tiers
export type SubscriptionTier = 'survivor' | 'explorer' | 'warrior' | 'phoenix';

interface SubscriptionContextType {
    tier: SubscriptionTier;
    isLoading: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Configuration for RevenueCat
const APIKeys = {
    apple: "appl_...", // Placeholder, should be in env or removed if not used
    google: "goog_..." // Placeholder
};

// Map entitlement IDs to our internal tier names
// REVENUECAT ENTITLEMENTS: 'phoenix', 'warrior', 'explorer'
const ENTITLEMENT_ID = 'premium'; // If you use a single entitlement with different levels, or check specific identifiers

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tier, setTier] = useState<SubscriptionTier>('survivor');
    const [isLoading, setIsLoading] = useState(true);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    useEffect(() => {
        initRevenueCat();
    }, []);

    const initRevenueCat = async () => {
        try {
            // Check Supabase profile first to get status immediately (faster UI)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, subscription_status, subscription_expires_at')
                    .eq('id', user.id)
                    .single();

                if (profile?.subscription_tier) {
                    // Start with what Supabase says, then let RevenueCat confirm/deny
                    setTier(profile.subscription_tier as SubscriptionTier);
                }
            }

            if (Platform.OS === 'android' || Platform.OS === 'ios') {
                // Determine API Key based on platform
                const apiKey = Platform.OS === 'android'
                    ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
                    : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

                if (apiKey) {
                    // Configure logic
                    if (user?.id) {
                        // If we have a user, configure AND identify immediately
                        await Purchases.configure({ apiKey, appUserID: user.id });
                    } else {
                        await Purchases.configure({ apiKey });
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

    const updateTierFromInfo = (info: CustomerInfo): string | null => {
        // If we already have a tier from Supabase (e.g. set in initRevenueCat), 
        // we might want to keep it unless RevenueCat has a newer/better one.
        // For now, we'll let RevenueCat override ONLY if it detects a paid tier.

        let detectedTier: SubscriptionTier | null = null;

        if (info.entitlements.active['phoenix']) {
            detectedTier = 'phoenix';
        } else if (info.entitlements.active['warrior']) {
            detectedTier = 'warrior';
        } else if (info.entitlements.active['explorer']) {
            detectedTier = 'explorer';
        }

        if (detectedTier) {
            setTier(detectedTier);
            return detectedTier;
        } else {
            // DON'T reset to survivor - keep the Supabase tier as source of truth
            // RevenueCat might not have synced yet, or user has a valid Supabase tier
            // Only log for debugging, don't override the tier
            console.log('[Subscription] No active RevenueCat entitlements, keeping current tier from Supabase');
            return null;
        }
    };

    // Helper to save subscription to Supabase
    const saveSubscriptionToSupabase = async (tier: string, pkg: PurchasesPackage) => {
        try {
            console.log('[Subscription] 💾 Fetching user for Supabase save...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) console.error('[Subscription] ❌ Failed to get user:', userError);

            if (user) {
                console.log('[Subscription] 💾 Attempting Supabase save for tier:', tier);
                const isYearly = pkg.packageType === 'ANNUAL' || pkg.identifier.toLowerCase().includes('yearly');
                const expirationDate = new Date();
                if (isYearly) {
                    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
                } else {
                    expirationDate.setMonth(expirationDate.getMonth() + 1);
                }

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: tier,
                        subscription_status: 'active',
                        subscription_updated_at: new Date().toISOString(),
                        subscription_expires_at: expirationDate.toISOString(),
                        subscription_current_period_end: expirationDate.toISOString()
                    })
                    .eq('id', user.id);

                if (error) {
                    console.error('[Subscription] ❌ Error saving tier to Supabase:', error);
                } else {
                    console.log('[Subscription] ✅ Saved tier to Supabase:', tier, 'expires:', expirationDate.toISOString());
                }
            } else {
                console.log('[Subscription] ⚠️ No authenticated user, skipping Supabase save');
            }
        } catch (err) {
            console.error('[Subscription] ❌ Critical error saving to Supabase:', err);
        }
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            console.log('[Subscription] 🛒 Starting purchase...', {
                packageId: pkg.identifier,
                offeringId: pkg.offeringIdentifier
            });

            // 1. Attempt Purchase with RevenueCat
            const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);

            console.log('[Subscription] 💳 Purchase finished. Product:', productIdentifier);
            setCustomerInfo(customerInfo);

            // 2. Logic to determine new tier
            // Ideally, RevenueCat entitlements update immediately.
            // But if we are in Sandbox or it lags, we might want to OPTIMISTICALLY set the tier
            // based on the package ID the user just bought.

            let newTier: SubscriptionTier = 'survivor';

            // Try to get from entitlements first
            if (customerInfo.entitlements.active['phoenix']) newTier = 'phoenix';
            else if (customerInfo.entitlements.active['warrior']) newTier = 'warrior';
            else if (customerInfo.entitlements.active['explorer']) newTier = 'explorer';

            // Fallback: Infer from package ID if entitlements aren't ready yet or sandbox issue
            if (newTier === 'survivor') {
                const pkgId = pkg.identifier.toLowerCase();
                console.log('[Subscription] 🔍 Package ID to check:', pkgId);

                if (pkgId.includes('phoenix')) {
                    newTier = 'phoenix';
                } else if (pkgId.includes('warrior')) {
                    newTier = 'warrior';
                } else if (pkgId.includes('explorer')) {
                    newTier = 'explorer';
                }
                console.log('[Subscription] ⚠️ Fallback detected tier:', newTier);
            }

            setTier(newTier);
            console.log('[Subscription] ✅ Purchase successful, final tier:', newTier);

            // 3. Save to Supabase (Critical for cross-platform/web support)
            await saveSubscriptionToSupabase(newTier, pkg);

        } catch (e: any) {
            // Handle User Cancelled quietly
            if (e.userCancelled) {
                console.log('User cancelled purchase');
                return;
            }

            console.error('Purchase error:', e);

            // CRITICAL FIX: RECOVERY FOR "ALREADY OWNED" SCENARIO
            // If the error indicates the user already owns the item (RevenueCat often throws this),
            // or any other error that might mask a successful transaction state properly handled by store but not app.
            // We should check if they actually have the entitlement.

            try {
                console.log('[Subscription] 🔄 Purchase failed, attempting recovery check (checking entitlements)...');
                const info = await Purchases.getCustomerInfo();
                const recoveredTier = updateTierFromInfo(info); // This updates local state

                // If we found a valid tier, we treat this as a success and force-sync Supabase
                // This fixes the "User buys -> Error: Already Owned -> Supabase never updates" bug.
                if (recoveredTier) {
                    console.log('[Subscription] ✅ Recovery successful! User has tier:', recoveredTier);
                    // We need to pass the package info. Since we failed to buy, we assume the package we TRIED to buy is the one they own
                    // (or consistent with the tier). We pass 'pkg' to calculate expiration.
                    // This assumes the user 're-bought' the same thing.
                    await saveSubscriptionToSupabase(recoveredTier, pkg);

                    // We can return success or treat it as handled.
                    // Returning here prevents the UI from showing an error alert if we successfully recovered.
                    return;
                }
            } catch (recoveryErr) {
                console.error('[Subscription] Recovery check failed:', recoveryErr);
            }

            // If recovery failed or no entitlement found, throw the original error for UI to handle
            throw e;
        }
    };

    // Helper to sync tier from Supabase (Source of Truth)
    const syncTierFromSupabase = async (uid?: string) => {
        try {
            const targetId = uid || (await supabase.auth.getUser()).data.user?.id;
            if (!targetId) return null;

            console.log('[Subscription] 🔄 Syncing tier from Supabase for:', targetId);
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('subscription_tier, subscription_status, subscription_expires_at')
                .eq('id', targetId)
                .single();

            if (error) {
                console.error('[Subscription] ❌ Error fetching Supabase profile:', error);
                return null;
            }

            if (profile?.subscription_tier) {
                const dbTier = profile.subscription_tier as SubscriptionTier;
                console.log('[Subscription] ✅ Supabase reports tier:', dbTier);
                setTier(dbTier); // Update local state!
                return dbTier;
            }
        } catch (e) {
            console.error('[Subscription] ❌ Sync error:', e);
        }
        return null;
    };

    const restorePurchases = async () => {
        try {
            console.log('[Subscription] 🔄 restoring purchases...');
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);

            // 1. Try to get tier from RevenueCat entitlements
            const restoredTier = updateTierFromInfo(info);

            // 2. IMPORTANT: If RevenueCat returns empty (common in V2 migration or delays),
            // check Supabase, because our Webhook V4 might have just updated it!
            if (!restoredTier) {
                console.log('[Subscription] ⚠️ RevenueCat entitlements empty after restore. Checking Supabase (Webhook)...');

                // Give the webhook a moment to write (if triggered by restore)
                // A small delay helps avoiding race conditions if the webhook is slightly slower than the client response
                await new Promise(resolve => setTimeout(resolve, 2000));

                await syncTierFromSupabase();
            } else {
                // If RevenueCat DID find a tier, also sync it to Supabase to be safe
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({
                        subscription_tier: restoredTier,
                        subscription_status: 'active'
                    }).eq('id', user.id);
                }
            }
        } catch (e) {
            console.error('Restore error:', e);
            throw e;
        }
    };

    const checkSubscriptionStatus = async () => {
        // Just re-run init logic
        // Just re-run init logic but also FORCE a sync from Supabase to be sure
        await initRevenueCat();
        await syncTierFromSupabase();
    };

    // Listen for auth changes to identify user in RevenueCat
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('[Subscription] 👤 User signed in, identifying in RevenueCat:', session.user.id);
                try {
                    await Purchases.logIn(session.user.id);
                    await checkSubscriptionStatus();
                } catch (e) {
                    console.error('[Subscription] ❌ Error identifying user:', e);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[Subscription] 👤 User signed out, resetting RevenueCat');
                try {
                    await Purchases.logOut();
                    setTier('survivor');
                } catch (e) {
                    console.error('[Subscription] ❌ Error resetting user:', e);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <SubscriptionContext.Provider value={{
            tier,
            isLoading,
            packages,
            purchasePackage,
            restorePurchases,
            checkSubscriptionStatus
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
