/**
 * Ex Profile Sync Service
 * Handles syncing ex profiles between local storage and Supabase
 * Ensures profiles are tied to user accounts and persist across devices
 */

import { supabase } from './supabase';
import { storage } from './storage';

export interface ExProfile {
    id: string;
    exName: string;
    profile: any;
    messageCount: number;
    createdAt: string;
    tokenCount?: number;
    masterPrompt?: string;
    supabaseId?: string; // The Supabase UUID for the profile
}

interface SupabaseExProfile {
    id: string;
    user_id: string;
    ex_name: string;
    profile_data: any;
    message_count: number;
    created_at: string;
    updated_at: string;
}

// Timeout for Supabase operations (5 seconds)
const SUPABASE_TIMEOUT = 5000;

/**
 * Helper to add timeout to promises
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), ms)
        )
    ]);
}

/**
 * Save a profile to both local storage and Supabase
 */
export async function saveProfile(profile: ExProfile, userId?: string): Promise<ExProfile> {
    // Always save to local storage first (for offline support)
    await saveProfileLocal(profile);

    // If user is logged in, sync to Supabase
    if (userId) {
        try {
            const supabaseProfile = await withTimeout(
                saveProfileToSupabase(profile, userId),
                SUPABASE_TIMEOUT,
                'Timeout saving to cloud'
            );
            if (supabaseProfile) {
                profile.supabaseId = supabaseProfile.id;
                // Update local with supabase ID
                await saveProfileLocal(profile);
                console.log('[ProfileSync] ✅ Profile saved to cloud:', supabaseProfile.id);
            }
        } catch (error) {
            console.error('[ProfileSync] ⚠️ Cloud save failed (will work offline):', error);
            // Continue without Supabase - local storage works as fallback
        }
    }

    return profile;
}

/**
 * Load all profiles for the current user
 * Loads from cloud if logged in, falls back to local
 */
export async function loadProfiles(userId?: string): Promise<ExProfile[]> {
    console.log('[ProfileSync] Loading profiles for user:', userId || 'guest');

    // If not logged in, return local only (guest mode)
    if (!userId) {
        const localProfiles = await loadProfilesLocal();
        console.log('[ProfileSync] Guest mode - local profiles only:', localProfiles.length);
        return localProfiles;
    }

    // User is logged in - try cloud first with timeout
    try {
        const cloudProfiles = await withTimeout(
            loadProfilesFromSupabase(userId),
            SUPABASE_TIMEOUT,
            'Timeout loading from cloud'
        );
        console.log('[ProfileSync] ✅ Cloud profiles loaded:', cloudProfiles.length);

        if (cloudProfiles.length > 0) {
            // Update local cache with cloud data
            await storage.setItem('exSimulator_allProfiles', JSON.stringify(cloudProfiles));
            return cloudProfiles;
        }

        // No cloud profiles - return empty (user needs to create new ones)
        console.log('[ProfileSync] No cloud profiles found for user');
        return [];

    } catch (error) {
        console.error('[ProfileSync] ⚠️ Cloud load failed, using local fallback:', error);
        // Fallback to local if cloud fails
        return await loadProfilesLocal();
    }
}

/**
 * Delete a profile from both local storage and Supabase
 */
export async function deleteProfile(profileId: string, supabaseId?: string): Promise<void> {
    // Delete from local storage
    await deleteProfileLocal(profileId);

    // Delete from Supabase if we have the ID
    if (supabaseId) {
        try {
            const deleteOperation = async () => {
                await supabase.from('ex_profiles').delete().eq('id', supabaseId);
            };
            await withTimeout(
                deleteOperation(),
                SUPABASE_TIMEOUT,
                'Timeout deleting from cloud'
            );
            console.log('[ProfileSync] ✅ Deleted from cloud:', supabaseId);
        } catch (error) {
            console.error('[ProfileSync] ⚠️ Cloud delete failed:', error);
        }
    }
}

// ============== PRIVATE FUNCTIONS ==============

async function saveProfileLocal(profile: ExProfile): Promise<void> {
    // Save as current profile
    await storage.setItem('exSimulator_currentProfile', JSON.stringify(profile));

    // Add to all profiles list
    const existingProfiles = await loadProfilesLocal();
    const existingIndex = existingProfiles.findIndex(p => p.id === profile.id);

    if (existingIndex >= 0) {
        existingProfiles[existingIndex] = profile;
    } else {
        existingProfiles.push(profile);
    }

    await storage.setItem('exSimulator_allProfiles', JSON.stringify(existingProfiles));
}

async function loadProfilesLocal(): Promise<ExProfile[]> {
    try {
        const stored = await storage.getItem('exSimulator_allProfiles');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('[ProfileSync] Error loading local profiles:', error);
        return [];
    }
}

async function deleteProfileLocal(profileId: string): Promise<void> {
    const profiles = await loadProfilesLocal();
    const filtered = profiles.filter(p => p.id !== profileId);
    await storage.setItem('exSimulator_allProfiles', JSON.stringify(filtered));

    // Clear current profile if it was the deleted one
    const current = await storage.getItem('exSimulator_currentProfile');
    if (current) {
        const currentProfile = JSON.parse(current);
        if (currentProfile.id === profileId) {
            await storage.removeItem('exSimulator_currentProfile');
        }
    }
}

async function saveProfileToSupabase(profile: ExProfile, userId: string): Promise<SupabaseExProfile | null> {
    console.log('[ProfileSync] Saving to Supabase for user:', userId);

    // Check if profile already exists in Supabase
    if (profile.supabaseId) {
        // Update existing
        const { data, error } = await supabase
            .from('ex_profiles')
            .update({
                ex_name: profile.exName,
                profile_data: profile.profile,
                message_count: profile.messageCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', profile.supabaseId)
            .select()
            .single();

        if (error) {
            console.error('[ProfileSync] Update error:', error);
            return null;
        }
        return data;
    }

    // Insert new profile
    const { data, error } = await supabase
        .from('ex_profiles')
        .insert({
            user_id: userId,
            ex_name: profile.exName,
            profile_data: profile.profile,
            message_count: profile.messageCount
        })
        .select()
        .single();

    if (error) {
        console.error('[ProfileSync] Insert error:', error);
        return null;
    }

    console.log('[ProfileSync] Created new profile in Supabase:', data.id);
    return data;
}

async function loadProfilesFromSupabase(userId: string): Promise<ExProfile[]> {
    console.log('[ProfileSync] Querying Supabase for user_id:', userId);

    const { data, error } = await supabase
        .from('ex_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ProfileSync] Load error:', error);
        throw error; // Throw so timeout handler can catch
    }

    console.log('[ProfileSync] Raw data from Supabase:', data?.length || 0, 'profiles');

    // Convert Supabase format to local format
    return (data || []).map((p: SupabaseExProfile) => ({
        id: `supabase_${p.id}`, // Use prefixed ID to avoid conflicts
        supabaseId: p.id,
        exName: p.ex_name,
        profile: p.profile_data,
        messageCount: p.message_count,
        createdAt: p.created_at
    }));
}
