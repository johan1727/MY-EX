import { supabase } from './supabase';
import { sendMessageToChatGPT } from './openai';

interface Conversation {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

interface Message {
    id: string;
    conversation_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    created_at: string;
}

export class ConversationManager {
    async createConversation(userId: string, firstMessage?: string): Promise<Conversation | null> {
        try {
            // Generate title from first message using AI
            let title = 'Nueva Conversación';

            if (firstMessage) {
                title = await this.generateConversationTitle(firstMessage);
            }

            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    user_id: userId,
                    title,
                    message_count: 0
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating conversation:', error);
            return null;
        }
    }

    async generateConversationTitle(firstMessage: string): Promise<string> {
        try {
            const prompt = `Generate a short, descriptive title (max 6 words) for a conversation that starts with: "${firstMessage.substring(0, 100)}..."
            
            Respond with ONLY the title, nothing else. Make it concise and relevant.`;

            const response = await sendMessageToChatGPT(prompt);
            let title = response.text.trim();

            // Remove quotes if present
            title = title.replace(/^["']|["']$/g, '');

            // Limit to 50 characters
            if (title.length > 50) {
                title = title.substring(0, 47) + '...';
            }

            return title || 'Nueva Conversación';
        } catch (error) {
            console.error('Error generating title:', error);
            return 'Nueva Conversación';
        }
    }

    async saveMessage(
        conversationId: string,
        userId: string,
        role: 'user' | 'assistant',
        content: string,
        imageUrl?: string
    ): Promise<Message | null> {
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    role,
                    content,
                    image_url: imageUrl
                })
                .select()
                .single();

            if (error) throw error;

            // Update conversation message count and updated_at
            await supabase
                .from('conversations')
                .update({
                    message_count: supabase.rpc('increment_message_count', { conversation_id: conversationId }),
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId);

            return data;
        } catch (error) {
            console.error('Error saving message:', error);
            return null;
        }
    }

    async getConversations(userId: string, limit: number = 50): Promise<Conversation[]> {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting conversations:', error);
            return [];
        }
    }

    async getConversationMessages(conversationId: string): Promise<Message[]> {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }

    async deleteConversation(conversationId: string): Promise<boolean> {
        try {
            // Messages will be deleted automatically due to CASCADE
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting conversation:', error);
            return false;
        }
    }

    async searchConversations(userId: string, query: string): Promise<Conversation[]> {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', userId)
                .ilike('title', `%${query}%`)
                .order('updated_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching conversations:', error);
            return [];
        }
    }

    async updateConversationTitle(conversationId: string, newTitle: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ title: newTitle })
                .eq('id', conversationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating conversation title:', error);
            return false;
        }
    }
}

// Singleton instance
export const conversationManager = new ConversationManager();
