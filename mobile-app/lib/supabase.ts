// import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
// Temporary debug adapter
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
    },
    setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
    },
    removeItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
        return Promise.resolve();
    },
};

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof window !== 'undefined',
    },
});
