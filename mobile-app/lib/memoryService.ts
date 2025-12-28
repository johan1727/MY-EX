/**
 * Advanced Memory Service for Ex Simulator
 * Handles:
 * 1. Cloud storage of conversations
 * 2. Structured facts extraction and storage
 * 3. Session summaries
 */

import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
}

export interface MemoryFact {
    id?: string;
    fact_type: 'name' | 'date' | 'preference' | 'event' | 'promise' | 'emotion' | 'topic';
    fact_content: string;
    importance: number;
}

// ============== MEMORY COMMANDS (ChatGPT-style) ==============

/**
 * Detect if user is giving an explicit memory command
 * Examples: "Recuerda que mi perro se llama Max", "Remember that I like coffee"
 */
export function detectMemoryCommand(message: string): { isCommand: boolean; fact: string | null } {
    const lowerMsg = message.toLowerCase().trim();

    // Spanish patterns
    const spanishPatterns = [
        /^recuerda que (.+)/i,
        /^no olvides que (.+)/i,
        /^acuérdate que (.+)/i,
        /^ten en cuenta que (.+)/i,
        /^importante:? (.+)/i,
        /^nota:? (.+)/i,
    ];

    // English patterns
    const englishPatterns = [
        /^remember that (.+)/i,
        /^don't forget that (.+)/i,
        /^note:? (.+)/i,
        /^important:? (.+)/i,
    ];

    const allPatterns = [...spanishPatterns, ...englishPatterns];

    for (const pattern of allPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return { isCommand: true, fact: match[1].trim() };
        }
    }

    return { isCommand: false, fact: null };
}

/**
 * Save an explicit memory fact (user command)
 * These get highest importance (10)
 */
export async function saveExplicitFact(
    userId: string,
    exProfileId: string,
    factContent: string
): Promise<boolean> {
    try {
        // Determine fact type based on content
        let factType: MemoryFact['fact_type'] = 'topic';
        const lowerFact = factContent.toLowerCase();

        if (lowerFact.includes('llama') || lowerFact.includes('nombre') || lowerFact.includes('name')) {
            factType = 'name';
        } else if (lowerFact.includes('fecha') || lowerFact.includes('cumpleaños') || lowerFact.includes('aniversario') || lowerFact.includes('date')) {
            factType = 'date';
        } else if (lowerFact.includes('gusta') || lowerFact.includes('prefiero') || lowerFact.includes('like') || lowerFact.includes('prefer')) {
            factType = 'preference';
        } else if (lowerFact.includes('prometo') || lowerFact.includes('voy a') || lowerFact.includes('promise') || lowerFact.includes('will')) {
            factType = 'promise';
        }

        await supabase
            .from('ex_memory_facts')
            .insert({
                user_id: userId,
                ex_profile_id: exProfileId,
                fact_type: factType,
                fact_content: factContent,
                importance: 10 // Highest importance for explicit commands
            });

        console.log('[MemoryService] ✅ Explicit fact saved:', factContent.substring(0, 50));
        return true;
    } catch (error) {
        console.error('[MemoryService] Error saving explicit fact:', error);
        return false;
    }
}

// ============== CONVERSATION SYNC ==============

/**
 * Load conversation from Supabase for a profile
 */
export async function loadConversationFromCloud(
    userId: string,
    exProfileId: string
): Promise<Message[]> {
    try {
        const queryFn = async () => {
            return await supabase
                .from('simulation_conversations')
                .select('messages')
                .eq('user_id', userId)
                .eq('ex_profile_id', exProfileId)
                .single();
        };
        const { data, error } = await withTimeout(queryFn(), 5000);

        if (error || !data) {
            console.log('[MemoryService] No cloud conversation found');
            return [];
        }

        console.log('[MemoryService] Loaded', (data.messages as any[]).length, 'messages from cloud');
        return data.messages as Message[];
    } catch (error) {
        console.error('[MemoryService] Error loading conversation:', error);
        return [];
    }
}

/**
 * Save conversation to Supabase (called after each message)
 */
export async function saveConversationToCloud(
    userId: string,
    exProfileId: string,
    messages: Message[]
): Promise<void> {
    try {
        // Check if conversation exists
        const { data: existing } = await supabase
            .from('simulation_conversations')
            .select('id')
            .eq('user_id', userId)
            .eq('ex_profile_id', exProfileId)
            .single();

        if (existing) {
            // Update existing
            await supabase
                .from('simulation_conversations')
                .update({ messages: messages })
                .eq('id', existing.id);
        } else {
            // Create new
            await supabase
                .from('simulation_conversations')
                .insert({
                    user_id: userId,
                    ex_profile_id: exProfileId,
                    messages: messages
                });
        }
        console.log('[MemoryService] Saved', messages.length, 'messages to cloud');
    } catch (error) {
        console.error('[MemoryService] Error saving conversation:', error);
    }
}

// ============== STRUCTURED FACTS ==============

/**
 * Load all facts for a profile
 */
export async function loadFacts(
    userId: string,
    exProfileId: string
): Promise<MemoryFact[]> {
    try {
        const queryFn = async () => {
            return await supabase
                .from('ex_memory_facts')
                .select('*')
                .eq('user_id', userId)
                .eq('ex_profile_id', exProfileId)
                .eq('is_active', true)
                .order('importance', { ascending: false })
                .limit(50);
        };
        const { data, error } = await withTimeout(queryFn(), 5000);

        if (error) {
            console.error('[MemoryService] Error loading facts:', error);
            return [];
        }

        console.log('[MemoryService] Loaded', data?.length || 0, 'facts');
        return data || [];
    } catch (error) {
        console.error('[MemoryService] Timeout loading facts');
        return [];
    }
}

/**
 * Extract and save new facts from conversation
 */
export async function extractAndSaveFacts(
    userId: string,
    exProfileId: string,
    messages: Message[],
    exName: string
): Promise<void> {
    if (messages.length < 5) return; // Need enough context

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Take last 30 messages for analysis
        const recentMsgs = messages.slice(-30).map(m =>
            `${m.role === 'user' ? 'Usuario' : exName}: ${m.content}`
        ).join('\n');

        const extractPrompt = `Analiza esta conversación y extrae HECHOS CONCRETOS que deben recordarse permanentemente.

CONVERSACIÓN:
${recentMsgs}

Extrae hechos en formato JSON array. Cada hecho debe tener:
- type: "name" | "date" | "preference" | "event" | "promise" | "emotion" | "topic"
- content: el hecho concreto (máximo 100 caracteres)
- importance: 1-10 (10 = muy importante)

Ejemplos:
- {"type": "name", "content": "El perro del usuario se llama Max", "importance": 8}
- {"type": "date", "content": "Aniversario es el 15 de marzo", "importance": 9}
- {"type": "preference", "content": "Al usuario le gusta el café con leche", "importance": 6}
- {"type": "promise", "content": "Prometió llamar mañana a las 8pm", "importance": 8}

Responde SOLO con el JSON array válido, sin explicaciones. Si no hay hechos relevantes, responde []:`;

        const result = await model.generateContent(extractPrompt);
        let responseText = result.response.text().trim();

        // Clean response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        if (!responseText || responseText === '[]') {
            console.log('[MemoryService] No new facts extracted');
            return;
        }

        const facts: any[] = JSON.parse(responseText);
        console.log('[MemoryService] Extracted', facts.length, 'facts');

        // Save each fact
        for (const fact of facts) {
            if (fact.content && fact.type) {
                // Check if similar fact exists
                const { data: existing } = await supabase
                    .from('ex_memory_facts')
                    .select('id, mentioned_count')
                    .eq('user_id', userId)
                    .eq('ex_profile_id', exProfileId)
                    .ilike('fact_content', `%${fact.content.substring(0, 30)}%`)
                    .single();

                if (existing) {
                    // Update existing fact
                    await supabase
                        .from('ex_memory_facts')
                        .update({
                            mentioned_count: existing.mentioned_count + 1,
                            last_mentioned_at: new Date().toISOString(),
                            importance: Math.min(10, (fact.importance || 5) + 1) // Increase importance
                        })
                        .eq('id', existing.id);
                } else {
                    // Insert new fact
                    await supabase
                        .from('ex_memory_facts')
                        .insert({
                            user_id: userId,
                            ex_profile_id: exProfileId,
                            fact_type: fact.type,
                            fact_content: fact.content,
                            importance: fact.importance || 5
                        });
                }
            }
        }
        console.log('[MemoryService] Facts saved to cloud');
    } catch (error) {
        console.error('[MemoryService] Error extracting facts:', error);
    }
}

/**
 * Build context string from facts for AI prompt
 */
export function buildFactsContext(facts: MemoryFact[]): string {
    if (facts.length === 0) return '';

    const groupedFacts: { [key: string]: string[] } = {};

    for (const fact of facts) {
        const type = fact.fact_type;
        if (!groupedFacts[type]) groupedFacts[type] = [];
        groupedFacts[type].push(fact.fact_content);
    }

    let context = '\n═══════════════════════════════════════════════\n';
    context += 'HECHOS QUE DEBES RECORDAR:\n';

    const typeLabels: { [key: string]: string } = {
        name: '👤 Nombres',
        date: '📅 Fechas',
        preference: '❤️ Preferencias',
        event: '🎉 Eventos',
        promise: '🤝 Promesas',
        emotion: '😊 Emociones',
        topic: '💬 Temas'
    };

    for (const [type, factsOfType] of Object.entries(groupedFacts)) {
        context += `${typeLabels[type] || type}:\n`;
        for (const f of factsOfType) {
            context += `  • ${f}\n`;
        }
    }
    context += '═══════════════════════════════════════════════\n';

    return context;
}

// ============== SESSION SUMMARY ==============

/**
 * Generate and save a summary of the current session
 */
export async function generateSessionSummary(
    userId: string,
    exProfileId: string,
    messages: Message[],
    exName: string
): Promise<string> {
    if (messages.length < 10) return '';

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const allMsgs = messages.map(m =>
            `${m.role === 'user' ? 'Usuario' : exName}: ${m.content}`
        ).join('\n');

        const summaryPrompt = `Resume esta conversación en 2-3 oraciones para recordar los puntos clave:

${allMsgs}

Incluye:
- El tema principal
- El tono emocional
- Cualquier acuerdo o plan mencionado

Responde solo con el resumen:`;

        const result = await model.generateContent(summaryPrompt);
        const summary = result.response.text().trim();

        // Save summary to cloud
        const { data: existing } = await supabase
            .from('simulation_conversations')
            .select('id')
            .eq('user_id', userId)
            .eq('ex_profile_id', exProfileId)
            .single();

        if (existing) {
            await supabase
                .from('simulation_conversations')
                .update({ session_summary: summary })
                .eq('id', existing.id);
        }

        console.log('[MemoryService] Session summary saved');
        return summary;
    } catch (error) {
        console.error('[MemoryService] Error generating summary:', error);
        return '';
    }
}
