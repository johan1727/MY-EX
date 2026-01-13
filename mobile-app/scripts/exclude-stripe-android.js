const fs = require('fs');
const path = require('path');

/**
 * Remove Stripe Android native code from node_modules
 * Stripe is only needed for web payments, not Android (RevenueCat handles that)
 * This prevents Kotlin version conflicts during Android builds
 */

const stripAndroidPath = path.join(
    __dirname,
    '..',
    'node_modules',
    '@stripe',
    'stripe-react-native',
    'android'
);

console.log('[Post-Install] Checking for Stripe Android code...');

if (fs.existsSync(stripAndroidPath)) {
    console.log('[Post-Install] Removing Stripe Android native code...');
    fs.rmSync(stripAndroidPath, { recursive: true, force: true });
    console.log('[Post-Install] ✅ Stripe Android removed (web still works)');
} else {
    console.log('[Post-Install] ℹ️ Stripe Android not found (already removed or not installed)');
}
