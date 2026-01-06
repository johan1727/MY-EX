// import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
// Temporary debug adapter
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Custom storage adapter for Native (uses SecureStore)
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        return SecureStore.deleteItemAsync(key);
    },
};

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Use SecureStore on Native, default localStorage on Web
        storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
        autoRefreshToken: true, // Enable auto-refresh for better UX
        persistSession: true,
        // CRITICAL: Enable session detection in URL for Web OAuth to work
        detectSessionInUrl: Platform.OS === 'web', // true for Web, false for Native
    },
});
