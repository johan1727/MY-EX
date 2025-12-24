import Purchases, {
    PurchasesOfferings,
    PurchasesPackage,
    CustomerInfo,
    LOG_LEVEL
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { SubscriptionTier } from './subscriptions';
import { supabase } from './supabase';

// TODO: Replace with your actual RevenueCat API keys
const REVENUECAT_API_KEY = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_XXXXXXXXXXXXXXXX',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_XXXXXXXXXXXXXXXX'
}) || '';

export async function initializeRevenueCat(userId: string) {
    try {
        // Enable debug logs in development
        if (__DEV__) {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        await Purchases.configure({
            apiKey: REVENUECAT_API_KEY,
            appUserID: userId  // Use Supabase user ID for consistency
        });

        console.log('✅ RevenueCat initialized for user:', userId);

        // Set up listener for subscription changes
        setupPurchaseListener();

        // Sync current subscription status
        const customerInfo = await Purchases.getCustomerInfo();
        await syncSubscriptionToSupabase(customerInfo);

    } catch (error) {
        console.error('❌ Error initializing RevenueCat:', error);
    }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
    try {
        const offerings = await Purchases.getOfferings();

        if (offerings.current === null) {
            console.warn('No offerings found. Check RevenueCat dashboard.');
            return null;
        }

        console.log('Available offerings:', offerings.current.availablePackages.length);
        return offerings;
    } catch (error) {
        console.error('Error getting offerings:', error);
        return null;
    }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
}> {
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);

        // Sync to Supabase
        await syncSubscriptionToSupabase(customerInfo);

        console.log('✅ Purchase successful:', pkg.identifier);
        return { success: true, customerInfo };

    } catch (error: any) {
        if (error.userCancelled) {
            console.log('User cancelled purchase');
            return { success: false, error: 'cancelled' };
        }

        console.error('❌ Error purchasing:', error);
        return { success: false, error: error.message };
    }
}

export async function restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
}> {
    try {
        const customerInfo = await Purchases.restorePurchases();
        await syncSubscriptionToSupabase(customerInfo);

        console.log('✅ Purchases restored');
        return { success: true, customerInfo };
    } catch (error: any) {
        console.error('❌ Error restoring purchases:', error);
        return { success: false, error: error.message };
    }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo;
    } catch (error) {
        console.error('Error getting customer info:', error);
        return null;
    }
}

export async function getCurrentSubscriptionTier(): Promise<SubscriptionTier> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();

        if (customerInfo.entitlements.active['phoenix']) {
            return SubscriptionTier.PHOENIX;
        } else if (customerInfo.entitlements.active['warrior']) {
            return SubscriptionTier.WARRIOR;
        }

        return SubscriptionTier.SURVIVOR;
    } catch (error) {
        console.error('Error getting subscription tier:', error);
        return SubscriptionTier.SURVIVOR;
    }
}

async function syncSubscriptionToSupabase(customerInfo: CustomerInfo) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('No user found, cannot sync subscription');
            return;
        }

        let tier: SubscriptionTier = SubscriptionTier.SURVIVOR;
        let expiresAt: string | null = null;
        let status: 'active' | 'expired' | 'cancelled' = 'active';

        // Check active entitlements
        if (customerInfo.entitlements.active['phoenix']) {
            tier = SubscriptionTier.PHOENIX;
            expiresAt = customerInfo.entitlements.active['phoenix'].expirationDate || null;
        } else if (customerInfo.entitlements.active['warrior']) {
            tier = SubscriptionTier.WARRIOR;
            expiresAt = customerInfo.entitlements.active['warrior'].expirationDate || null;
        } else {
            // Check if subscription expired or was cancelled
            const allEntitlements = Object.values(customerInfo.entitlements.all);
            if (allEntitlements.length > 0) {
                status = 'expired';
            }
        }

        // Update Supabase
        const { error } = await supabase
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: status,
                subscription_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating subscription in Supabase:', error);
        } else {
            console.log('✅ Subscription synced to Supabase:', tier, status);
        }
    } catch (error) {
        console.error('❌ Error syncing subscription:', error);
    }
}

function setupPurchaseListener() {
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('📱 Customer info updated');
        syncSubscriptionToSupabase(customerInfo);
    });
}

// Helper to check if user has active subscription
export async function hasActiveSubscription(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// Helper to get subscription expiration date
export async function getSubscriptionExpirationDate(): Promise<Date | null> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        const activeEntitlements = Object.values(customerInfo.entitlements.active);

        if (activeEntitlements.length > 0 && activeEntitlements[0].expirationDate) {
            return new Date(activeEntitlements[0].expirationDate);
        }

        return null;
    } catch (error) {
        console.error('Error getting expiration date:', error);
        return null;
    }
}

// Helper to check if subscription will renew
export async function willSubscriptionRenew(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        const activeEntitlements = Object.values(customerInfo.entitlements.active);

        if (activeEntitlements.length > 0) {
            return activeEntitlements[0].willRenew;
        }

        return false;
    } catch (error) {
        console.error('Error checking renewal status:', error);
        return false;
    }
}
