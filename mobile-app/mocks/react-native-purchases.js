// Mock for react-native-purchases on web
export default {
    configure: async () => { },
    logIn: async () => { },
    getCustomerInfo: async () => ({ entitlements: { active: {} } }),
    getOfferings: async () => ({ current: { availablePackages: [] } }),
    purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
    restorePurchases: async () => ({ entitlements: { active: {} } }),
};
