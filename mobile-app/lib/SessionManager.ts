
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

export interface StoredSession {
    user_id: string;
    email: string;
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user_metadata?: any;
    last_active: number;
}

const STORAGE_KEY = 'remi_saved_sessions';

export const SessionManager = {
    /**
     * Save the current active session to local storage list
     */
    saveCurrentSession: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const stored: StoredSession = {
                user_id: session.user.id,
                email: session.user.email || 'No email',
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user_metadata: session.user.user_metadata,
                last_active: Date.now()
            };

            const existingJson = await AsyncStorage.getItem(STORAGE_KEY);
            let sessions: StoredSession[] = existingJson ? JSON.parse(existingJson) : [];

            // Update or add
            const index = sessions.findIndex(s => s.user_id === stored.user_id);
            if (index >= 0) {
                sessions[index] = stored;
            } else {
                sessions.push(stored);
            }

            // Clean up old sessions (keep max 5?)
            // sessions = sessions.sort((a, b) => b.last_active - a.last_active).slice(0, 5);

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
            console.log('[SessionManager] Session saved for:', stored.email);
        } catch (e) {
            console.error('[SessionManager] Error saving session:', e);
        }
    },

    /**
     * Get all saved sessions
     */
    getSavedSessions: async (): Promise<StoredSession[]> => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Remove a saved session
     */
    removeSession: async (userId: string) => {
        try {
            const sessions = await SessionManager.getSavedSessions();
            const filtered = sessions.filter(s => s.user_id !== userId);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error('[SessionManager] Error removing session:', e);
        }
    },

    /**
     * Switch to a specific user (User MUST explicitly call this)
     */
    switchToUser: async (userId: string): Promise<boolean> => {
        try {
            // First, save current session just in case
            await SessionManager.saveCurrentSession();

            const sessions = await SessionManager.getSavedSessions();
            const target = sessions.find(s => s.user_id === userId);

            if (!target) {
                console.warn('[SessionManager] Target session not found');
                return false;
            }

            console.log('[SessionManager] Switching to:', target.email);

            // Use Supabase to set session
            const { data, error } = await supabase.auth.setSession({
                access_token: target.access_token,
                refresh_token: target.refresh_token,
            });

            if (error) {
                console.warn('[SessionManager] Session Token Invalid:', error.message);
                // Token likely expired, remove it to prevent deadlock
                await SessionManager.removeSession(userId);
                return false;
            }

            // DOUBLE CHECK: Verify session is actually active
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData.user) {
                console.warn('[SessionManager] Session set but User Invalid:', userError?.message);
                await SessionManager.removeSession(userId);
                return false;
            }

            return true;
        } catch (e) {
            console.error('[SessionManager] Error switching session:', e);
            return false;
        }
    },

    /**
     * Clear current auth state locally WITHOUT removing the session from saved list
     * (Allows logging in to a new account)
     */
    prepareAddAccount: async () => {
        try {
            console.log('[SessionManager] Preparing to add account...');
            // 1. Save current session first
            await SessionManager.saveCurrentSession();

            // 2. DO NOT call supabase.auth.signOut() as it revokes the token on the server!
            // Instead, we manually clear the local storage keys Supabase uses.
            // This force-clears the client state "locally" so the UI thinks we are logged out
            // and allows signing in to a new account, which will then overwrite the storage with new tokens.

            // Supabase GoTrue client uses this key by default
            await AsyncStorage.removeItem('sb-mrabsfuwprxisgxfqnuy-auth-token');
            // Also might need to clear internal state if possible, but reloading the app or creating a new client 
            // is usually required. Since we can't easily reset the singleton, clearing storage + explicit navigation usually works.

            // NOTE: The Auth screen usually checks `supabase.auth.getUser()`.
            // If the singleton still has the session in memory, it might redirect back.
            // We might need to force a hard reload or pass a param to Auth screen.

            console.log('[SessionManager] Local session cleared (server token preserved).');
        } catch (e) {
            console.error('[SessionManager] Error preparing add account:', e);
        }
    }
};
