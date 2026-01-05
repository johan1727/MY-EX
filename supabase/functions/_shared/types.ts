// Shared types for Edge Functions
export interface ParsedMessage {
    content: string;
    sender: string;
    timestamp: Date | string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    seen?: boolean;
}

export interface GenerateChatRequest {
    profileId: string;
    userMessage: string;
    conversationHistory: ChatMessage[];
    masterPrompt: string;
    contextualData?: {
        defensiveTopics?: string[];
        jealousyTriggers?: string[];
        messagingPattern?: 'metralleta' | 'biblia';
    };
}

export interface GenerateChatResponse {
    response: string;
    mode?: 'defensive' | 'jealous' | null;
    pattern?: 'metralleta' | 'biblia';
    fragments?: string[];
}

export interface AnalyzePersonalityRequest {
    messages: ParsedMessage[];
    exName: string;
    relationshipType: 'ex-partner' | 'friend' | 'family' | 'deceased' | 'current-partner';
    userName?: string;
}

export interface AnalyzePersonalityResponse {
    success: boolean;
    profile?: any;
    error?: string;
}

export interface GenerateMasterPromptRequest {
    analysisResults: Record<string, string>;
    exName: string;
    relationshipType: string;
    userName: string;
}

export interface GenerateMasterPromptResponse {
    masterPrompt: string;
    tokenCount: number;
}
