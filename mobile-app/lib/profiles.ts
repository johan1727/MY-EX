import { storage } from './storage';

// Types for multi-profile system
export interface ExProfile {
    id: string;
    exName: string;
    messageCount: number;
    hasDeepAnalysis?: boolean;
    createdAt: string;
    lastUsed: string;
    analysisData?: any;
    conversationHistory?: any[];
}

export interface ProfilesData {
    activeProfileId: string | null;
    profiles: ExProfile[];
}

const PROFILES_KEY = '@remi_profiles';
const ACTIVE_PROFILE_KEY = '@remi_active_profile';

// Generate unique ID
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const profilesStorage = {
    // Get all profiles
    async getAllProfiles(): Promise<ExProfile[]> {
        const data = await storage.getItem(PROFILES_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    },

    // Get active profile ID
    async getActiveProfileId(): Promise<string | null> {
        return await storage.getItem(ACTIVE_PROFILE_KEY);
    },

    // Get active profile
    async getActiveProfile(): Promise<ExProfile | null> {
        const profiles = await this.getAllProfiles();
        const activeId = await this.getActiveProfileId();
        if (!activeId) {
            // Return first profile if exists
            return profiles[0] || null;
        }
        return profiles.find(p => p.id === activeId) || profiles[0] || null;
    },

    // Set active profile
    async setActiveProfile(profileId: string): Promise<void> {
        await storage.setItem(ACTIVE_PROFILE_KEY, profileId);

        // Update lastUsed
        const profiles = await this.getAllProfiles();
        const updated = profiles.map(p =>
            p.id === profileId
                ? { ...p, lastUsed: new Date().toISOString() }
                : p
        );
        await storage.setItem(PROFILES_KEY, JSON.stringify(updated));
    },

    // Create new profile
    async createProfile(exName: string, messageCount: number = 0, analysisData?: any): Promise<ExProfile> {
        const profiles = await this.getAllProfiles();

        const newProfile: ExProfile = {
            id: generateId(),
            exName,
            messageCount,
            hasDeepAnalysis: !!analysisData,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            analysisData,
            conversationHistory: [],
        };

        profiles.push(newProfile);
        await storage.setItem(PROFILES_KEY, JSON.stringify(profiles));

        // Set as active
        await this.setActiveProfile(newProfile.id);

        return newProfile;
    },

    // Update profile
    async updateProfile(profileId: string, updates: Partial<ExProfile>): Promise<void> {
        const profiles = await this.getAllProfiles();
        const updated = profiles.map(p =>
            p.id === profileId
                ? { ...p, ...updates, lastUsed: new Date().toISOString() }
                : p
        );
        await storage.setItem(PROFILES_KEY, JSON.stringify(updated));
    },

    // Delete profile
    async deleteProfile(profileId: string): Promise<void> {
        const profiles = await this.getAllProfiles();
        const filtered = profiles.filter(p => p.id !== profileId);
        await storage.setItem(PROFILES_KEY, JSON.stringify(filtered));

        // If deleted profile was active, set first profile as active
        const activeId = await this.getActiveProfileId();
        if (activeId === profileId && filtered.length > 0) {
            await this.setActiveProfile(filtered[0].id);
        } else if (filtered.length === 0) {
            await storage.removeItem(ACTIVE_PROFILE_KEY);
        }
    },

    // Get profile by ID
    async getProfile(profileId: string): Promise<ExProfile | null> {
        const profiles = await this.getAllProfiles();
        return profiles.find(p => p.id === profileId) || null;
    },

    // Save conversation for profile
    async saveConversation(profileId: string, messages: any[]): Promise<void> {
        await this.updateProfile(profileId, { conversationHistory: messages });
    },

    // Migrate legacy profile to new system
    async migrateLegacyProfile(): Promise<void> {
        const profiles = await this.getAllProfiles();
        if (profiles.length > 0) return; // Already migrated

        // Check for legacy data
        const legacyProfile = await storage.getItem('@ex_profile');
        const legacyAnalysis = await storage.getItem('@ex_analysis');
        const legacyConversation = await storage.getItem('@ex_conversation');

        if (legacyProfile) {
            try {
                const { exName, messageCount, hasDeepAnalysis } = JSON.parse(legacyProfile);
                let analysisData = null;
                let conversation = [];

                if (legacyAnalysis) {
                    analysisData = JSON.parse(legacyAnalysis);
                }
                if (legacyConversation) {
                    conversation = JSON.parse(legacyConversation);
                }

                const newProfile: ExProfile = {
                    id: generateId(),
                    exName,
                    messageCount,
                    hasDeepAnalysis,
                    createdAt: new Date().toISOString(),
                    lastUsed: new Date().toISOString(),
                    analysisData,
                    conversationHistory: conversation,
                };

                await storage.setItem(PROFILES_KEY, JSON.stringify([newProfile]));
                await this.setActiveProfile(newProfile.id);

                console.log('[Profiles] Migrated legacy profile successfully');
            } catch (e) {
                console.error('[Profiles] Migration failed:', e);
            }
        }
    },
};
