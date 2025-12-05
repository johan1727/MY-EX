// Mock for expo-local-authentication on web
export const hasHardwareAsync = async () => false;
export const isEnrolledAsync = async () => false;
export const supportedAuthenticationTypesAsync = async () => [];
export const authenticateAsync = async () => ({ success: false });
