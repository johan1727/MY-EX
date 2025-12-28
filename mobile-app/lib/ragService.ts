/**
 * RAG (Retrieval Augmented Generation) Service
 * 
 * Uses Gemini embeddings + Supabase pgvector for semantic search
 * This enables the AI to find RELEVANT past conversations, not just recent ones
 */

import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Gemini embedding model outputs 768 dimensions
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

export interface SimilarMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    similarity: number;
    created_at: string;
}

export interface ConversationSummary {
    id: string;
    summary_type: 'session' | 'daily' | 'weekly' | 'monthly';
    summary_content: string;
    period_start: string;
    period_end: string;
    key_topics: string[];
    emotional_tone: string;
}

// ============== EMBEDDINGS ==============

/**
 * Generate embedding vector for a text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

        const result = await model.embedContent(text);
        const embedding = result.embedding.values;

        console.log('[RAG] Generated embedding, dimensions:', embedding.length);
        return embedding;
    } catch (error) {
        console.error('[RAG] Error generating embedding:', error);
        return null;
    }
}

/**
 * Store a message with its embedding in the database
 */
export async function storeMessageEmbedding(
    userId: string,
    exProfileId: string,
    content: string,
    role: 'user' | 'assistant'
): Promise<boolean> {
    try {
        // Generate embedding for the message
        const embedding = await generateEmbedding(content);
        if (!embedding) {
            console.log('[RAG] Skipping storage - embedding generation failed');
            return false;
        }

        // Store in Supabase
        const { error } = await supabase
            .from('message_embeddings')
            .insert({
                user_id: userId,
                ex_profile_id: exProfileId,
                content: content,
                role: role,
                embedding: embedding,
                metadata: { timestamp: new Date().toISOString() }
            });

        if (error) {
            console.error('[RAG] Storage error:', error);
            return false;
        }

        console.log('[RAG] ✅ Message embedded and stored');
        return true;
    } catch (error) {
        console.error('[RAG] Error storing embedding:', error);
        return false;
    }
}

/**
 * Search for similar past messages (RAG retrieval)
 */
export async function searchSimilarMessages(
    userId: string,
    exProfileId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0.6
): Promise<SimilarMessage[]> {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);
        if (!queryEmbedding) {
            console.log('[RAG] Query embedding failed');
            return [];
        }

        // Call the search function in Supabase
        const { data, error } = await supabase.rpc('search_similar_messages', {
            p_user_id: userId,
            p_ex_profile_id: exProfileId,
            p_query_embedding: queryEmbedding,
            p_limit: limit,
            p_threshold: threshold
        });

        if (error) {
            console.error('[RAG] Search error:', error);
            return [];
        }

        console.log('[RAG] Found', data?.length || 0, 'similar messages');
        return data || [];
    } catch (error) {
        console.error('[RAG] Error searching:', error);
        return [];
    }
}

/**
 * Build context from similar messages for the AI prompt
 */
export function buildRAGContext(similarMessages: SimilarMessage[]): string {
    if (similarMessages.length === 0) return '';

    let context = '\n═══════════════════════════════════════════════\n';
    context += 'CONVERSACIONES PASADAS RELEVANTES:\n';

    for (const msg of similarMessages) {
        const date = new Date(msg.created_at).toLocaleDateString('es-MX');
        const roleLabel = msg.role === 'user' ? 'Usuario' : 'Ex';
        context += `[${date}] ${roleLabel}: ${msg.content}\n`;
    }

    context += '═══════════════════════════════════════════════\n';
    return context;
}

// ============== HIERARCHICAL SUMMARIES ==============

/**
 * Generate and store a session summary
 */
export async function createSessionSummary(
    userId: string,
    exProfileId: string,
    messages: { role: string; content: string; timestamp: Date | string }[],
    exName: string
): Promise<string | null> {
    if (messages.length < 10) return null;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const msgText = messages.map(m =>
            `${m.role === 'user' ? 'Usuario' : exName}: ${m.content}`
        ).join('\n');

        const prompt = `Analiza esta conversación y genera un resumen estructurado.

CONVERSACIÓN:
${msgText}

Genera un JSON con este formato exacto:
{
    "summary": "Resumen de 2-3 oraciones",
    "keyTopics": ["tema1", "tema2", "tema3"],
    "emotionalTone": "positivo/negativo/neutral/mixto",
    "importantMoments": ["momento1", "momento2"]
}

Responde SOLO con el JSON válido:`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(responseText);

        // Store the summary
        const now = new Date().toISOString();
        const firstMsgTime = messages[0].timestamp;

        const { error } = await supabase
            .from('conversation_summaries')
            .insert({
                user_id: userId,
                ex_profile_id: exProfileId,
                summary_type: 'session',
                summary_content: parsed.summary,
                period_start: typeof firstMsgTime === 'string' ? firstMsgTime : firstMsgTime.toISOString(),
                period_end: now,
                message_count: messages.length,
                key_topics: parsed.keyTopics,
                emotional_tone: parsed.emotionalTone
            });

        if (error) {
            console.error('[RAG] Summary storage error:', error);
            return null;
        }

        console.log('[RAG] ✅ Session summary created');
        return parsed.summary;
    } catch (error) {
        console.error('[RAG] Error creating summary:', error);
        return null;
    }
}

/**
 * Get conversation summaries for context
 */
export async function getSummaries(
    userId: string,
    exProfileId: string,
    type?: 'session' | 'daily' | 'weekly' | 'monthly',
    limit: number = 5
): Promise<ConversationSummary[]> {
    try {
        let query = supabase
            .from('conversation_summaries')
            .select('*')
            .eq('user_id', userId)
            .eq('ex_profile_id', exProfileId)
            .order('period_end', { ascending: false })
            .limit(limit);

        if (type) {
            query = query.eq('summary_type', type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[RAG] Error getting summaries:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[RAG] Error:', error);
        return [];
    }
}

/**
 * Build context from summaries for the AI prompt
 */
export function buildSummaryContext(summaries: ConversationSummary[]): string {
    if (summaries.length === 0) return '';

    let context = '\n═══════════════════════════════════════════════\n';
    context += 'RESÚMENES DE CONVERSACIONES ANTERIORES:\n';

    for (const s of summaries) {
        const date = new Date(s.period_end).toLocaleDateString('es-MX');
        context += `[${date}] ${s.summary_content}\n`;
        if (s.key_topics?.length > 0) {
            context += `  Temas: ${s.key_topics.join(', ')}\n`;
        }
    }

    context += '═══════════════════════════════════════════════\n';
    return context;
}

// ============== MEMORY DECAY ==============

/**
 * Get facts with decay applied (more important = shown first)
 */
export async function getFactsWithDecay(
    userId: string,
    exProfileId: string,
    limit: number = 30
): Promise<{ id: string; fact_type: string; fact_content: string; effective_importance: number }[]> {
    try {
        const { data, error } = await supabase.rpc('get_active_facts', {
            p_user_id: userId,
            p_ex_profile_id: exProfileId,
            p_limit: limit
        });

        if (error) {
            console.error('[RAG] Error getting facts with decay:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[RAG] Error:', error);
        return [];
    }
}

/**
 * Refresh a fact's importance when it's used/mentioned
 */
export async function refreshFactImportance(factId: string): Promise<void> {
    try {
        await supabase.rpc('refresh_fact_importance', { p_fact_id: factId });
        console.log('[RAG] Fact importance refreshed:', factId);
    } catch (error) {
        console.error('[RAG] Error refreshing fact:', error);
    }
}

/**
 * Trigger decay calculation (call periodically, e.g., on app start)
 */
export async function applyMemoryDecay(): Promise<void> {
    try {
        await supabase.rpc('apply_memory_decay');
        console.log('[RAG] Memory decay applied');
    } catch (error) {
        console.error('[RAG] Error applying decay:', error);
    }
}
