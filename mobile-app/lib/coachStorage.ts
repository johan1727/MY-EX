import { storage } from './storage';

export interface CoachConversation {
    id: string;
    title: string;
    messages: CoachMessage[];
    createdAt: string;
    lastUpdated: string;
}

export interface CoachMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

const COACH_CONVERSATIONS_KEY = '@remi_coach_conversations';
const ACTIVE_COACH_CONVERSATION_KEY = '@remi_coach_active';

const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Generate title from first user message
const generateTitle = (messages: CoachMessage[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
        const title = firstUserMessage.content.slice(0, 40);
        return title.length < firstUserMessage.content.length ? title + '...' : title;
    }
    return 'Nueva conversación';
};

export const coachStorage = {
    // Get all conversations
    async getAllConversations(): Promise<CoachConversation[]> {
        const data = await storage.getItem(COACH_CONVERSATIONS_KEY);
        if (!data) return [];
        try {
            const conversations = JSON.parse(data);
            // Sort by lastUpdated descending
            return conversations.sort((a: CoachConversation, b: CoachConversation) =>
                new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
            );
        } catch {
            return [];
        }
    },

    // Get active conversation ID
    async getActiveConversationId(): Promise<string | null> {
        return await storage.getItem(ACTIVE_COACH_CONVERSATION_KEY);
    },

    // Get active conversation
    async getActiveConversation(): Promise<CoachConversation | null> {
        const conversations = await this.getAllConversations();
        const activeId = await this.getActiveConversationId();

        if (!activeId || conversations.length === 0) {
            return null;
        }

        return conversations.find(c => c.id === activeId) || null;
    },

    // Set active conversation
    async setActiveConversation(conversationId: string): Promise<void> {
        await storage.setItem(ACTIVE_COACH_CONVERSATION_KEY, conversationId);
    },

    // Create new conversation
    async createConversation(): Promise<CoachConversation> {
        const conversations = await this.getAllConversations();

        const newConversation: CoachConversation = {
            id: generateId(),
            title: 'Nueva conversación',
            messages: [],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        conversations.unshift(newConversation);
        await storage.setItem(COACH_CONVERSATIONS_KEY, JSON.stringify(conversations));
        await this.setActiveConversation(newConversation.id);

        return newConversation;
    },

    // Save messages to conversation
    async saveMessages(conversationId: string, messages: CoachMessage[]): Promise<void> {
        const conversations = await this.getAllConversations();
        const index = conversations.findIndex(c => c.id === conversationId);

        if (index !== -1) {
            conversations[index].messages = messages;
            conversations[index].lastUpdated = new Date().toISOString();

            // Auto-generate title from first message if still default
            if (conversations[index].title === 'Nueva conversación' && messages.length > 0) {
                conversations[index].title = generateTitle(messages);
            }

            await storage.setItem(COACH_CONVERSATIONS_KEY, JSON.stringify(conversations));
        }
    },

    // Delete conversation
    async deleteConversation(conversationId: string): Promise<void> {
        const conversations = await this.getAllConversations();
        const filtered = conversations.filter(c => c.id !== conversationId);
        await storage.setItem(COACH_CONVERSATIONS_KEY, JSON.stringify(filtered));

        // If deleted was active, set first as active
        const activeId = await this.getActiveConversationId();
        if (activeId === conversationId && filtered.length > 0) {
            await this.setActiveConversation(filtered[0].id);
        }
    },

    // Get or create conversation for use
    async getOrCreateActiveConversation(): Promise<CoachConversation> {
        const active = await this.getActiveConversation();
        if (active) return active;
        return await this.createConversation();
    },
};
