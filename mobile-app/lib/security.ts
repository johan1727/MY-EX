/**
 * Security Module
 * 
 * Handles app locking with biometric authentication (FaceID/TouchID/Fingerprint)
 * and PIN fallback for devices without biometric hardware.
 * 
 * Note: Security features are disabled on web platform.
 */

import { Platform } from 'react-native';

// Only import these modules on native platforms
let LocalAuthentication: any = null;
let SecureStore: any = null;

if (Platform.OS !== 'web') {
    // LocalAuthentication = require('expo-local-authentication');
    // SecureStore = require('expo-secure-store');
}

const SECURITY_ENABLED_KEY = 'security_enabled';
const SECURITY_METHOD_KEY = 'security_method';
const PIN_KEY = 'user_pin';
const LAST_LOCK_TIME_KEY = 'last_lock_time';

export type SecurityMethod = 'biometric' | 'pin' | 'both' | 'none';

/**
 * Check if device has biometric hardware
 */
export async function hasBiometricHardware(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    return hasHardware;
}

/**
 * Check if user has enrolled biometrics
 */
export async function isBiometricEnrolled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
}

/**
 * Get available biometric types
 */
export async function getAvailableBiometrics(): Promise<any[]> {
    if (Platform.OS === 'web') return [];
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
}

/**
 * Setup app lock - determine best security method
 */
export async function setupAppLock(): Promise<SecurityMethod> {
    const hasHardware = await hasBiometricHardware();
    const isEnrolled = await isBiometricEnrolled();

    if (hasHardware && isEnrolled) {
        return 'biometric';
    }
    return 'pin'; // Fallback to PIN
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometric(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock My Ex Coach',
            fallbackLabel: 'Use PIN',
            disableDeviceFallback: false,
            cancelLabel: 'Cancel',
        });

        return result.success;
    } catch (error) {
        console.error('Biometric authentication error:', error);
        return false;
    }
}

/**
 * Save PIN to secure storage
 */
export async function savePIN(pin: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(PIN_KEY, pin);
}

/**
 * Verify PIN
 */
export async function verifyPIN(pin: string): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const storedPIN = await SecureStore.getItemAsync(PIN_KEY);
    return storedPIN === pin;
}

/**
 * Enable security
 */
export async function enableSecurity(method: SecurityMethod): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(SECURITY_ENABLED_KEY, 'true');
    await SecureStore.setItemAsync(SECURITY_METHOD_KEY, method);
}

/**
 * Disable security
 */
export async function disableSecurity(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(SECURITY_ENABLED_KEY, 'false');
    await SecureStore.deleteItemAsync(PIN_KEY);
}

/**
 * Check if security is enabled
 */
export async function isSecurityEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const enabled = await SecureStore.getItemAsync(SECURITY_ENABLED_KEY);
    return enabled === 'true';
}

/**
 * Get current security method
 */
export async function getSecurityMethod(): Promise<SecurityMethod> {
    if (Platform.OS === 'web') return 'none';
    const method = await SecureStore.getItemAsync(SECURITY_METHOD_KEY);
    return (method as SecurityMethod) || 'none';
}

/**
 * Check if app should be locked
 * Returns true if security is enabled and enough time has passed since last unlock
 */
export async function shouldLockApp(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const enabled = await isSecurityEnabled();
    if (!enabled) return false;

    const lastLockTime = await SecureStore.getItemAsync(LAST_LOCK_TIME_KEY);
    if (!lastLockTime) return true;

    const now = Date.now();
    const timeSinceLastLock = now - parseInt(lastLockTime);
    const lockTimeout = 30 * 1000; // 30 seconds

    return timeSinceLastLock > lockTimeout;
}

/**
 * Mark app as unlocked
 */
export async function markAppUnlocked(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(LAST_LOCK_TIME_KEY, Date.now().toString());
}

/**
 * Mark app as locked (when going to background)
 */
export async function markAppLocked(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(LAST_LOCK_TIME_KEY);
}

/**
 * Authenticate user (tries biometric first, then falls back to PIN)
 */
export async function authenticateUser(): Promise<boolean> {
    const method = await getSecurityMethod();

    if (method === 'biometric' || method === 'both') {
        const hasHardware = await hasBiometricHardware();
        const isEnrolled = await isBiometricEnrolled();

        if (hasHardware && isEnrolled) {
            const success = await authenticateWithBiometric();
            if (success) {
                await markAppUnlocked();
                return true;
            }
        }
    }

    // If biometric fails or not available, user will need to enter PIN manually
    // This will be handled by the UI component
    return false;
}

/**
 * Change PIN
 */
export async function changePIN(oldPIN: string, newPIN: string): Promise<boolean> {
    const isValid = await verifyPIN(oldPIN);
    if (!isValid) return false;

    await savePIN(newPIN);
    return true;
}

/**
 * Reset security (requires re-authentication via email)
 */
export async function resetSecurity(): Promise<void> {
    if (Platform.OS === 'web') return;
    await disableSecurity();
    await SecureStore.deleteItemAsync(LAST_LOCK_TIME_KEY);
}
