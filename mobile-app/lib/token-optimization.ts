import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const MAX_MESSAGES_BEFORE_SUMMARY = 20;
const RECENT_MESSAGES_TO_KEEP = 10;

/**
 * Builds an efficient context for the AI by combining:
 * - A summary of older messages (if conversation is long)
 * - Recent messages (last 10)
 * - Current message
 * 
 * This reduces token usage by 60-70% for long conversations
 */
export async function buildEfficientContext(
    userId: string,
    currentMessage: string
): Promise<Message[]> {
    try {
        // Get total message count
        const { count: totalCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (!totalCount || totalCount <= RECENT_MESSAGES_TO_KEEP) {
            // Conversation is short, just get all messages
            const { data: messages } = await supabase
                .from('chat_messages')
                .select('content, sender')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            return [
                ...(messages || []).map(m => ({
                    role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.content
                })),
                { role: 'user' as const, content: currentMessage }
            ];
        }

        // Conversation is long, use summary + recent messages
        const summary = await getOrCreateConversationSummary(userId, totalCount);

        // Get recent messages
        const { data: recentMessages } = await supabase
            .from('chat_messages')
            .select('content, sender')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(RECENT_MESSAGES_TO_KEEP);

        const recentMsgs = (recentMessages || []).reverse().map(m => ({
            role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content
        }));

        return [
            { role: 'system' as const, content: `Previous conversation summary: ${summary}` },
            ...recentMsgs,
            { role: 'user' as const, content: currentMessage }
        ];

    } catch (error) {
        console.error('Error building context:', error);
        // Fallback: just return current message
        return [{ role: 'user', content: currentMessage }];
    }
}

/**
 * Gets existing summary or creates a new one if needed
 */
async function getOrCreateConversationSummary(
    userId: string,
    totalMessageCount: number
): Promise<string> {
    try {
        // Check if we have a recent summary
        const { data: existingSummary } = await supabase
            .from('conversation_summaries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // If summary exists and covers most messages, use it
        if (existingSummary && existingSummary.message_count >= totalMessageCount - MAX_MESSAGES_BEFORE_SUMMARY) {
            return existingSummary.summary_text;
        }

        // Need to create new summary
        return await createConversationSummary(userId, totalMessageCount);

    } catch (error) {
        console.error('Error getting summary:', error);
        return 'No previous conversation context available.';
    }
}

/**
 * Creates a new summary of the conversation using Gemini
 */
async function createConversationSummary(
    userId: string,
    totalMessageCount: number
): Promise<string> {
    try {
        // Get messages to summarize (all except recent ones)
        const messagesToSummarize = totalMessageCount - RECENT_MESSAGES_TO_KEEP;

        const { data: messages } = await supabase
            .from('chat_messages')
            .select('content, sender, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(messagesToSummarize);

        if (!messages || messages.length === 0) {
            return 'No previous conversation.';
        }

        // Format messages for summarization
        const conversationText = messages
            .map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.content}`)
            .join('\n');

        // Generate summary using Gemini
        const prompt = `Summarize this conversation between a user healing from a breakup and their AI coach. Focus on:
- Main emotional state and progress
- Key events or revelations shared
- Current goals or struggles
- Important context to remember

Keep it concise (3-4 sentences max).

Conversation:
${conversationText}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(prompt);
        const summary = result.response.text() || 'Unable to generate summary.';

        // Save summary to database
        await supabase.from('conversation_summaries').insert({
            user_id: userId,
            summary_text: summary,
            message_count: messagesToSummarize,
            summarized_until: messages[messages.length - 1].created_at
        });

        console.log(`✅ Created conversation summary for ${messagesToSummarize} messages`);
        return summary;

    } catch (error) {
        console.error('Error creating summary:', error);
        return 'Error creating conversation summary.';
    }
}

/**
 * Estimates token count for a message (rough approximation)
 */
export function estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

/**
 * Calculates token savings from using summaries
 */
export function calculateTokenSavings(
    totalMessages: number,
    recentMessages: number = RECENT_MESSAGES_TO_KEEP
): { savedTokens: number; savingsPercentage: number } {
    if (totalMessages <= recentMessages) {
        return { savedTokens: 0, savingsPercentage: 0 };
    }

    const avgTokensPerMessage = 100; // Conservative estimate
    const summaryTokens = 150; // Typical summary size

    const withoutSummary = totalMessages * avgTokensPerMessage;
    const withSummary = summaryTokens + (recentMessages * avgTokensPerMessage);

    const savedTokens = withoutSummary - withSummary;
    const savingsPercentage = Math.round((savedTokens / withoutSummary) * 100);

    return { savedTokens, savingsPercentage };
}

/**
 * Cleans up old summaries (keep only the most recent one)
 */
export async function cleanupOldSummaries(userId: string): Promise<void> {
    try {
        const { data: summaries } = await supabase
            .from('conversation_summaries')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!summaries || summaries.length <= 1) return;

        // Keep only the most recent, delete the rest
        const toDelete = summaries.slice(1).map(s => s.id);

        await supabase
            .from('conversation_summaries')
            .delete()
            .in('id', toDelete);

        console.log(`🧹 Cleaned up ${toDelete.length} old summaries`);
    } catch (error) {
        console.error('Error cleaning up summaries:', error);
    }
}
