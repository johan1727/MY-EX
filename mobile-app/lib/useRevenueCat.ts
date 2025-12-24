import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// REPLACE VALUES WITH YOUR REVENUECAT KEYS
const API_KEYS = {
    apple: 'appl_REPLACE_WITH_YOUR_KEY',
    google: 'goog_REPLACE_WITH_YOUR_KEY'
};

export const useRevenueCat = () => {
    const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                if (Platform.OS === 'ios') {
                    Purchases.configure({ apiKey: API_KEYS.apple });
                } else if (Platform.OS === 'android') {
                    Purchases.configure({ apiKey: API_KEYS.google });
                }

                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                checkEntitlement(info);

                try {
                    const offerings = await Purchases.getOfferings();
                    if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                        setCurrentOffering(offerings.current.availablePackages[0]);
                    }
                } catch (e) {
                    console.log('Error fetching offerings', e);
                }

            } catch (e) {
                console.log('RevenueCat init error', e);
            }
        };

        init();
    }, []);

    const checkEntitlement = (info: CustomerInfo) => {
        // Replace 'pro' with your actual Entitlement Identifier in RevenueCat
        if (info.entitlements.active['pro']) {
            setIsPro(true);
        } else {
            setIsPro(false);
        }
    };

    const restorePermissions = async () => {
        try {
            const info = await Purchases.restorePurchases();
            setCustomerInfo(info);
            checkEntitlement(info);
            return info;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const purchasePackage = async (pack: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            setCustomerInfo(customerInfo);
            checkEntitlement(customerInfo);
            return true;
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error(e);
            }
            return false;
        }
    };

    return {
        isPro,
        currentOffering,
        customerInfo,
        restorePermissions,
        purchasePackage
    };
};
