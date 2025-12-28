import { supabase } from './supabase';

/**
 * Sistema de Memoria Episódica usando ex_memory_facts
 */

export interface MemoryFact {
    id: string;
    userId: string;
    exProfileId: string;
    factType: 'person' | 'place' | 'event' | 'preference' | 'emotion' | 'other';
    factContent: string;
    importance: number; // 1-10
    mentionedCount: number;
    firstMentionedAt: Date;
    lastMentionedAt: Date;
    isActive: boolean;
}

/**
 * Guardar un hecho en la memoria
 */
export async function saveMemoryFact(
    userId: string,
    exProfileId: string,
    fact: {
        type: MemoryFact['factType'];
        content: string;
        importance?: number;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[MemorySync] Saving fact for profile ${exProfileId}:`, fact.content);

        // Verificar si ya existe un hecho similar
        const { data: existing } = await supabase
            .from('ex_memory_facts')
            .select('id, mentioned_count')
            .eq('ex_profile_id', exProfileId)
            .eq('fact_content', fact.content)
            .maybeSingle();

        if (existing) {
            // Actualizar contador y fecha
            const { error } = await supabase
                .from('ex_memory_facts')
                .update({
                    mentioned_count: existing.mentioned_count + 1,
                    last_mentioned_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) throw error;
            console.log('[MemorySync] ✅ Updated existing fact');
        } else {
            // Crear nuevo hecho
            const { error } = await supabase
                .from('ex_memory_facts')
                .insert({
                    user_id: userId,
                    ex_profile_id: exProfileId,
                    fact_type: fact.type,
                    fact_content: fact.content,
                    importance: fact.importance || 5,
                    mentioned_count: 1,
                    is_active: true
                });

            if (error) throw error;
            console.log('[MemorySync] ✅ Created new fact');
        }

        return { success: true };
    } catch (error: any) {
        console.error('[MemorySync] ❌ Error saving fact:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cargar hechos importantes de la memoria
 */
export async function loadMemoryFacts(
    exProfileId: string,
    limit: number = 10
): Promise<MemoryFact[]> {
    try {
        console.log(`[MemorySync] Loading top ${limit} facts for profile ${exProfileId}`);

        const { data, error } = await supabase
            .from('ex_memory_facts')
            .select('*')
            .eq('ex_profile_id', exProfileId)
            .eq('is_active', true)
            .order('importance', { ascending: false })
            .order('last_mentioned_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        console.log(`[MemorySync] ✅ Loaded ${data?.length || 0} facts`);

        return (data || []).map(d => ({
            id: d.id,
            userId: d.user_id,
            exProfileId: d.ex_profile_id,
            factType: d.fact_type,
            factContent: d.fact_content,
            importance: d.importance,
            mentionedCount: d.mentioned_count,
            firstMentionedAt: new Date(d.first_mentioned_at),
            lastMentionedAt: new Date(d.last_mentioned_at),
            isActive: d.is_active
        }));
    } catch (error: any) {
        console.error('[MemorySync] ❌ Error loading facts:', error);
        return [];
    }
}

/**
 * Desactivar un hecho (marcar como no relevante)
 */
export async function deactivateMemoryFact(factId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ex_memory_facts')
            .update({ is_active: false })
            .eq('id', factId);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('[MemorySync] ❌ Error deactivating fact:', error);
        return false;
    }
}

/**
 * Extraer y guardar hechos de una conversación
 */
export async function extractAndSaveMemoryFromConversation(
    userId: string,
    exProfileId: string,
    recentMessages: Array<{ role: string; content: string }>
): Promise<number> {
    let savedCount = 0;

    try {
        const userMessages = recentMessages
            .filter(m => m.role === 'user')
            .slice(-5); // Últimos 5 mensajes del usuario

        for (const msg of userMessages) {
            // Detectar nombres propios
            const properNouns = msg.content.match(/\b([A-Z][a-z]+)\b/g);
            if (properNouns && properNouns.length > 0) {
                for (const noun of properNouns.slice(0, 2)) { // Max 2 por mensaje
                    if (noun.length > 2) {
                        const result = await saveMemoryFact(userId, exProfileId, {
                            type: 'person',
                            content: `Mencionó a: ${noun}`,
                            importance: 6
                        });
                        if (result.success) savedCount++;
                    }
                }
            }

            // Detectar info personal explícita
            const personalInfoPattern = /mi\s+(\w+)\s+se\s+llama\s+(\w+)/i;
            const match = msg.content.match(personalInfoPattern);
            if (match) {
                const result = await saveMemoryFact(userId, exProfileId, {
                    type: 'other',
                    content: `Su ${match[1]} se llama ${match[2]}`,
                    importance: 8
                });
                if (result.success) savedCount++;
            }

            // Detectar preferencias
            if (msg.content.match(/me\s+gusta|me\s+encanta/i)) {
                const result = await saveMemoryFact(userId, exProfileId, {
                    type: 'preference',
                    content: msg.content.substring(0, 100), // Primeros 100 chars
                    importance: 5
                });
                if (result.success) savedCount++;
            }
        }

        console.log(`[MemorySync] ✅ Extracted and saved ${savedCount} new facts`);
    } catch (error) {
        console.error('[MemorySync] ❌ Error extracting memory:', error);
    }

    return savedCount;
}

/**
 * Formatear hechos para incluir en prompt
 */
export function formatMemoryFactsForPrompt(facts: MemoryFact[]): string {
    if (facts.length === 0) return '';

    const formatted = facts
        .map(f => `- ${f.factContent} (importancia: ${f.importance}/10)`)
        .join('\n');

    return `\nMEMORIA EPISÓDICA (hechos que SIEMPRE debes recordar):\n${formatted}\n`;
}
