// This file exports TypeScript types and interfaces used throughout the mobile application for type safety.

export interface User {
    id: string;
    email: string;
    created_at: string;
    goal: 'move_on' | 'get_back' | 'learn';
    ex_name?: string;
    breakup_reason?: string;
    breakup_date?: string;
    no_contact_since?: string;
    no_contact_days: number;
    coins: number;
    subscription_status: 'free' | 'premium' | 'canceled';
    subscription_expires_at?: string;
    last_active_at: string;
    total_messages_sent: number;
}

export interface ChatLog {
    id: string;
    user_id: string;
    created_at: string;
    message: string;
    sender: 'user' | 'ai' | 'system';
    message_type?: 'text' | 'voice' | 'decoder_analysis';
    tokens_used?: number;
    detected_emotion?: 'anger' | 'sadness' | 'hope' | 'desperation';
    flagged_for_safety: boolean;
}

export interface UserMemory {
    id: string;
    user_id: string;
    created_at: string;
    key_fact: string;
    category?: 'relationship_detail' | 'trigger' | 'progress' | 'pattern';
    embedding: number[]; // Assuming embedding is an array of numbers
    importance_score: number;
    last_referenced_at?: string;
}

export interface MoodJournalEntry {
    id: string;
    user_id: string;
    created_at: string;
    date: string;
    mood_score: number;
    note?: string;
    triggers?: string[];
}

export interface PanicButtonLog {
    id: string;
    user_id: string;
    triggered_at: string;
    resisted: boolean;
    coping_strategy?: string;
    notes?: string;
}

export interface DecodedMessage {
    id: string;
    user_id: string;
    created_at: string;
    ex_message: string;
    ai_analysis: string;
    suggested_response?: string;
    is_breadcrumbing: boolean;
    genuine_interest_score?: number;
}