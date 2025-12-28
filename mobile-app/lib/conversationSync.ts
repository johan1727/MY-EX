import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Save conversation to Supabase cloud storage
 */
export async function saveConversationToCloud(
    userId: string | null,
    profileId: string,
    messages: ConversationMessage[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // If no user (guest mode), skip cloud sync
        if (!userId) {
            console.log('[ConversationSync] Guest mode - skipping cloud save');
            return { success: true };
        }

        console.log(`[ConversationSync] Saving ${messages.length} messages to cloud for profile ${profileId}`);

        // Check if conversation already exists
        const { data: existing, error: fetchError } = await supabase
            .from('simulation_conversations')
            .select('id')
            .eq('user_id', userId)
            .eq('ex_profile_id', profileId)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const conversationData = {
            user_id: userId,
            ex_profile_id: profileId,
            messages: messages,
            message_count: messages.length,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (existing) {
            // Update existing conversation
            const { error: updateError } = await supabase
                .from('simulation_conversations')
                .update(conversationData)
                .eq('id', existing.id);

            if (updateError) throw updateError;
            console.log('[ConversationSync] ✅ Updated existing conversation in cloud');
        } else {
            // Insert new conversation
            const { error: insertError } = await supabase
                .from('simulation_conversations')
                .insert(conversationData);

            if (insertError) throw insertError;
            console.log('[ConversationSync] ✅ Created new conversation in cloud');
        }

        return { success: true };
    } catch (error: any) {
        console.error('[ConversationSync] ❌ Error saving to cloud:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load conversation from Supabase cloud storage
 */
export async function loadConversationFromCloud(
    userId: string | null,
    profileId: string
): Promise<{ messages: ConversationMessage[]; error?: string }> {
    try {
        // If no user (guest mode), return empty
        if (!userId) {
            console.log('[ConversationSync] Guest mode - no cloud data');
            return { messages: [] };
        }

        console.log(`[ConversationSync] Loading conversation from cloud for profile ${profileId}`);

        const { data, error } = await supabase
            .from('simulation_conversations')
            .select('messages, updated_at')
            .eq('user_id', userId)
            .eq('ex_profile_id', profileId)
            .maybeSingle();

        if (error) {
            if (error.code === 'PGRST116') {
                // No conversation found
                console.log('[ConversationSync] No cloud conversation found');
                return { messages: [] };
            }
            throw error;
        }

        if (!data) {
            console.log('[ConversationSync] No cloud conversation found');
            return { messages: [] };
        }

        const messages = data.messages as ConversationMessage[];
        console.log(`[ConversationSync] ✅ Loaded ${messages.length} messages from cloud (last updated: ${data.updated_at})`);

        return { messages };
    } catch (error: any) {
        console.error('[ConversationSync] ❌ Error loading from cloud:', error);
        return { messages: [], error: error.message };
    }
}

/**
 * Sync conversation: merge local and cloud, preferring newer data
 */
export async function syncConversation(
    userId: string | null,
    profileId: string,
    localMessages: ConversationMessage[]
): Promise<{ messages: ConversationMessage[]; synced: boolean }> {
    try {
        // Load from cloud
        const { messages: cloudMessages, error } = await loadConversationFromCloud(userId, profileId);

        if (error) {
            console.log('[ConversationSync] Cloud sync failed, using local only');
            return { messages: localMessages, synced: false };
        }

        // If cloud is empty, use local
        if (cloudMessages.length === 0) {
            console.log('[ConversationSync] Cloud empty, using local messages');
            if (localMessages.length > 0 && userId) {
                await saveConversationToCloud(userId, profileId, localMessages);
            }
            return { messages: localMessages, synced: true };
        }

        // If local is empty, use cloud
        if (localMessages.length === 0) {
            console.log('[ConversationSync] Local empty, using cloud messages');
            return { messages: cloudMessages, synced: true };
        }

        // Both have data - use the one with more messages (simple merge strategy)
        const useCloud = cloudMessages.length > localMessages.length;
        const finalMessages = useCloud ? cloudMessages : localMessages;

        console.log(`[ConversationSync] Merged: using ${useCloud ? 'cloud' : 'local'} (${finalMessages.length} messages)`);

        // Save the chosen version to both
        if (userId) {
            await saveConversationToCloud(userId, profileId, finalMessages);
        }
        await AsyncStorage.setItem(
            `conversation_${profileId}`,
            JSON.stringify(finalMessages)
        );

        return { messages: finalMessages, synced: true };
    } catch (error: any) {
        console.error('[ConversationSync] ❌ Sync error:', error);
        return { messages: localMessages, synced: false };
    }
}

/**
 * Delete conversation from cloud
 */
export async function deleteConversationFromCloud(
    userId: string | null,
    profileId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!userId) {
            return { success: true };
        }

        console.log(`[ConversationSync] Deleting conversation from cloud for profile ${profileId}`);

        const { error } = await supabase
            .from('simulation_conversations')
            .delete()
            .eq('user_id', userId)
            .eq('ex_profile_id', profileId);

        if (error) throw error;

        console.log('[ConversationSync] ✅ Deleted from cloud');
        return { success: true };
    } catch (error: any) {
        console.error('[ConversationSync] ❌ Error deleting from cloud:', error);
        return { success: false, error: error.message };
    }
}
