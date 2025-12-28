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

// ==========================================
// ADVANCED MEMORY FEATURES
// ==========================================

/**
 * Calcular similitud entre dos textos (simple string similarity)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size; // Jaccard similarity
}

/**
 * ADVANCED: Consolidar memoria - combinar hechos relacionados
 */
export async function consolidateMemory(
    exProfileId: string
): Promise<{ consolidated: number; deactivated: number }> {
    try {
        console.log('[AdvancedMemory] 🔄 Starting memory consolidation...');

        // Cargar todos los hechos activos
        const { data: allFacts, error } = await supabase
            .from('ex_memory_facts')
            .select('*')
            .eq('ex_profile_id', exProfileId)
            .eq('is_active', true)
            .order('importance', { ascending: false });

        if (error || !allFacts) throw error;

        let consolidated = 0;
        let deactivated = 0;
        const processedIds = new Set<string>();

        // Buscar hechos similares
        for (let i = 0; i < allFacts.length; i++) {
            if (processedIds.has(allFacts[i].id)) continue;

            const fact1 = allFacts[i];
            const relatedFacts: typeof allFacts = [];

            // Buscar hechos similares
            for (let j = i + 1; j < allFacts.length; j++) {
                if (processedIds.has(allFacts[j].id)) continue;

                const fact2 = allFacts[j];
                const similarity = calculateSimilarity(fact1.fact_content, fact2.fact_content);

                // Si similitud > 70%, son duplicados o muy relacionados
                if (similarity > 0.7) {
                    relatedFacts.push(fact2);
                }
            }

            // Si encontramos hechos relacionados, consolidar
            if (relatedFacts.length > 0) {
                console.log(`[AdvancedMemory] Found ${relatedFacts.length} related facts for: ${fact1.fact_content}`);

                // Crear hecho consolidado combinando información
                const allContents = [fact1.fact_content, ...relatedFacts.map(f => f.fact_content)];
                const uniqueWords = [...new Set(allContents.join(' ').split(/\s+/))];
                const consolidatedContent = uniqueWords.join(' ').substring(0, 200);

                // Importancia = promedio ponderado
                const totalMentions = fact1.mentioned_count + relatedFacts.reduce((sum, f) => sum + f.mentioned_count, 0);
                const avgImportance = Math.round(
                    (fact1.importance * fact1.mentioned_count +
                        relatedFacts.reduce((sum, f) => sum + (f.importance * f.mentioned_count), 0)) / totalMentions
                );

                // Actualizar el primer hecho con info consolidada
                await supabase
                    .from('ex_memory_facts')
                    .update({
                        fact_content: consolidatedContent,
                        importance: Math.min(10, avgImportance + 1), // +1 bonus por consolidación
                        mentioned_count: totalMentions,
                        last_mentioned_at: new Date().toISOString()
                    })
                    .eq('id', fact1.id);

                // Desactivar los hechos duplicados
                for (const relatedFact of relatedFacts) {
                    await supabase
                        .from('ex_memory_facts')
                        .update({ is_active: false })
                        .eq('id', relatedFact.id);

                    processedIds.add(relatedFact.id);
                    deactivated++;
                }

                consolidated++;
                processedIds.add(fact1.id);
            }
        }

        console.log(`[AdvancedMemory] ✅ Consolidated ${consolidated} facts, deactivated ${deactivated} duplicates`);
        return { consolidated, deactivated };

    } catch (error) {
        console.error('[AdvancedMemory] ❌ Error consolidating memory:', error);
        return { consolidated: 0, deactivated: 0 };
    }
}

/**
 * ADVANCED: Aplicar decay a la importancia basado en tiempo
 */
export async function applyMemoryDecay(
    exProfileId: string
): Promise<number> {
    try {
        console.log('[AdvancedMemory] ⏰ Applying memory decay...');

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Obtener hechos que no se han mencionado en 30+ días
        const { data: oldFacts, error } = await supabase
            .from('ex_memory_facts')
            .select('*')
            .eq('ex_profile_id', exProfileId)
            .eq('is_active', true)
            .lt('last_mentioned_at', thirtyDaysAgo.toISOString())
            .gt('importance', 3); // Solo aplicar decay si importancia > 3

        if (error || !oldFacts) throw error;

        let decayedCount = 0;

        for (const fact of oldFacts) {
            const daysSinceLastMention = Math.floor(
                (now.getTime() - new Date(fact.last_mentioned_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Decay: -1 importancia cada 30 días
            const decayAmount = Math.floor(daysSinceLastMention / 30);
            const newImportance = Math.max(1, fact.importance - decayAmount);

            if (newImportance < fact.importance) {
                await supabase
                    .from('ex_memory_facts')
                    .update({ importance: newImportance })
                    .eq('id', fact.id);

                console.log(`[AdvancedMemory] Decayed "${fact.fact_content}" from ${fact.importance} to ${newImportance}`);
                decayedCount++;
            }
        }

        console.log(`[AdvancedMemory] ✅ Applied decay to ${decayedCount} facts`);
        return decayedCount;

    } catch (error) {
        console.error('[AdvancedMemory] ❌ Error applying decay:', error);
        return 0;
    }
}

/**
 * ADVANCED: Búsqueda contextual de memoria
 */
export async function searchMemoryByContext(
    exProfileId: string,
    context: {
        userMessage?: string;
        emotionalState?: 'happy' | 'sad' | 'angry' | 'neutral';
        topics?: string[];
    }
): Promise<MemoryFact[]> {
    try {
        console.log('[AdvancedMemory] 🔍 Searching memory by context:', context);

        // Cargar todos los hechos activos
        const allFacts = await loadMemoryFacts(exProfileId, 50);

        if (allFacts.length === 0) return [];

        // Calcular relevancia de cada hecho
        const scoredFacts = allFacts.map(fact => {
            let score = fact.importance; // Base score

            // Boost si menciona topics del contexto
            if (context.topics) {
                for (const topic of context.topics) {
                    if (fact.factContent.toLowerCase().includes(topic.toLowerCase())) {
                        score += 3;
                    }
                }
            }

            // Boost si es relevante al mensaje del usuario
            if (context.userMessage) {
                const similarity = calculateSimilarity(fact.factContent, context.userMessage);
                score += similarity * 5; // Max +5 por similitud
            }

            // Boost por tipo de hecho según estado emocional
            if (context.emotionalState === 'sad' && fact.factType === 'preference') {
                score += 2; // Hablar de gustos puede animar
            }
            if (context.emotionalState === 'happy' && fact.factType === 'event') {
                score += 2; // Compartir eventos en buen mood
            }

            // Boost por recencia
            const daysSinceLastMention = Math.floor(
                (Date.now() - fact.lastMentionedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastMention < 7) score += 2; // Mencionado esta semana

            return { fact, score };
        });

        // Ordenar por score y retornar top 5
        const topFacts = scoredFacts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.fact);

        console.log(`[AdvancedMemory] ✅ Found ${topFacts.length} contextually relevant facts`);
        return topFacts;

    } catch (error) {
        console.error('[AdvancedMemory] ❌ Error searching memory:', error);
        return [];
    }
}

/**
 * ADVANCED: Auto-consolidación periódica (llamar cada 50 mensajes)
 */
export async function performPeriodicMemoryMaintenance(
    exProfileId: string
): Promise<void> {
    console.log('[AdvancedMemory] 🔧 Starting periodic maintenance...');

    // 1. Consolidar hechos similares
    await consolidateMemory(exProfileId);

    // 2. Aplicar decay
    await applyMemoryDecay(exProfileId);

    // 3. Desactivar hechos con importancia muy baja (<2)
    try {
        const { error } = await supabase
            .from('ex_memory_facts')
            .update({ is_active: false })
            .eq('ex_profile_id', exProfileId)
            .lt('importance', 2);

        if (!error) {
            console.log('[AdvancedMemory] ✅ Deactivated low-importance facts');
        }
    } catch (error) {
        console.error('[AdvancedMemory] ❌ Error deactivating facts:', error);
    }

    console.log('[AdvancedMemory] ✅ Periodic maintenance complete');
}
