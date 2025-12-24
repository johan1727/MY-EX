import { storage } from './storage';
import { supabase } from './supabase';

export interface Conversation {
    id: string;
    title: string;
    last_message_at: string;
    message_count: number;
    created_at: string;
    type: 'coach' | 'simulator';
    metadata?: any;
}

export const loadConversations = async (): Promise<Conversation[]> => {
    try {
        const conversations: Conversation[] = [];

        // 1. Add "My Ex Coach" (Optionally, can serve as a persistent chat)
        // For now, let's focus on Ex Profiles as "Chats"

        // 2. Fetch Ex Profiles (Simulations)
        // Try local storage first
        const localProfiles = await storage.getItem('exSimulator_profiles');
        if (localProfiles) {
            const parsed = JSON.parse(localProfiles);
            parsed.forEach((p: any) => {
                conversations.push({
                    id: p.id,
                    title: p.exName || 'Ex Desconocido',
                    last_message_at: new Date().toISOString(), // Mock for now, or fetch from msgs
                    message_count: 0,
                    created_at: new Date().toISOString(),
                    type: 'simulator',
                    metadata: p
                });
            });
        }

        // If logged in, maybe fetch from Supabase 'ex_profiles' if local is empty?
        // (Skipping for now to prioritize local/offline-first flow established in Dashboard)

        return conversations;
    } catch (error) {
        console.error("Error loading conversations:", error);
        return [];
    }
};

export const setCurrentSimulation = async (profileId: string) => {
    try {
        const localProfiles = await storage.getItem('exSimulator_profiles');
        if (localProfiles) {
            const parsed = JSON.parse(localProfiles);
            const profile = parsed.find((p: any) => p.id === profileId);
            if (profile) {
                await storage.setItem('exSimulator_currentProfile', JSON.stringify(profile));
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
};
