/**
 * FACT EMBEDDINGS
 * 
 * Sistema para convertir hechos extraídos en embeddings (vectores numéricos)
 * y guardarlos en Supabase para búsqueda semántica.
 * 
 * IMPORTANTE: NO guardamos mensajes crudos, solo hechos anonimizados.
 */

import { supabase } from './supabase';

// ===============================================
// TIPOS
// ===============================================

export interface ExtractedFact {
    factType: 'personal' | 'relationship' | 'preference' | 'routine';
    content: string;
    importance: number; // 1-10
}

export interface FactEmbedding {
    id?: string;
    user_id: string;
    ex_profile_id: string;
    fact_type: string;
    content: string;
    importance: number;
    embedding?: number[]; // Vector de 768 dimensiones (Gemini)
    created_at?: string;
}

// ===============================================
// GUARDAR HECHOS EN SUPABASE (SIN EMBEDDINGS POR AHORA)
// ===============================================

/**
 * Guarda los hechos extraídos en la tabla ex_memory_facts
 * Esta tabla YA EXISTE en tu schema
 */
export async function saveExtractedFacts(
    profileId: string,
    facts: ExtractedFact[]
): Promise<boolean> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            console.warn('[FactEmbeddings] No user logged in');
            return false;
        }

        // Mapear hechos al formato de la tabla ex_memory_facts
        const factsToInsert = facts.map(fact => ({
            user_id: user.user.id,
            ex_profile_id: profileId,
            fact_type: fact.factType,
            fact_content: fact.content,
            importance: fact.importance,
            mentioned_count: 1,
            first_mentioned_at: new Date().toISOString(),
            last_mentioned_at: new Date().toISOString(),
            is_active: true
        }));

        // Insertar en batch
        const { error } = await supabase
            .from('ex_memory_facts')
            .insert(factsToInsert);

        if (error) {
            console.error('[FactEmbeddings] Error guardando:', error);
            return false;
        }

        console.log('[FactEmbeddings] ✅', facts.length, 'hechos guardados');
        return true;

    } catch (e: any) {
        console.error('[FactEmbeddings] Error:', e?.message || e);
        return false;
    }
}

/**
 * Busca hechos relevantes para una consulta (búsqueda simple por keywords)
 * Si tuviéramos embeddings, haríamos búsqueda vectorial aquí
 */
export async function searchFacts(
    profileId: string,
    query: string,
    limit: number = 5
): Promise<ExtractedFact[]> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return [];

        // Búsqueda simple por contenido (ilike)
        // TODO: Cambiar a búsqueda vectorial cuando tengamos embeddings
        const { data, error } = await supabase
            .from('ex_memory_facts')
            .select('fact_type, fact_content, importance')
            .eq('user_id', user.user.id)
            .eq('ex_profile_id', profileId)
            .eq('is_active', true)
            .ilike('fact_content', `%${query}%`)
            .order('importance', { ascending: false })
            .limit(limit);

        if (error || !data) {
            console.error('[FactEmbeddings] Error buscando:', error);
            return [];
        }

        return data.map(d => ({
            factType: d.fact_type as ExtractedFact['factType'],
            content: d.fact_content,
            importance: d.importance
        }));

    } catch (e: any) {
        console.error('[FactEmbeddings] Error:', e?.message || e);
        return [];
    }
}

/**
 * Obtiene todos los hechos de un perfil ordenados por importancia
 */
export async function getAllFacts(
    profileId: string
): Promise<ExtractedFact[]> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return [];

        const { data, error } = await supabase
            .from('ex_memory_facts')
            .select('fact_type, fact_content, importance')
            .eq('user_id', user.user.id)
            .eq('ex_profile_id', profileId)
            .eq('is_active', true)
            .order('importance', { ascending: false });

        if (error || !data) return [];

        return data.map(d => ({
            factType: d.fact_type as ExtractedFact['factType'],
            content: d.fact_content,
            importance: d.importance
        }));

    } catch (e) {
        return [];
    }
}

/**
 * Incrementa el contador de menciones cuando un hecho se usa en conversación
 */
export async function incrementFactMention(
    profileId: string,
    factContent: string
): Promise<void> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return;

        // Buscar el hecho
        const { data } = await supabase
            .from('ex_memory_facts')
            .select('id, mentioned_count')
            .eq('user_id', user.user.id)
            .eq('ex_profile_id', profileId)
            .ilike('fact_content', `%${factContent.substring(0, 50)}%`)
            .limit(1)
            .single();

        if (data) {
            await supabase
                .from('ex_memory_facts')
                .update({
                    mentioned_count: (data.mentioned_count || 0) + 1,
                    last_mentioned_at: new Date().toISOString()
                })
                .eq('id', data.id);
        }
    } catch (e) {
        // Silently fail
    }
}

// ===============================================
// INTEGRACIÓN CON SIMULACIÓN
// ===============================================

/**
 * Busca hechos relevantes basándose en el mensaje del usuario
 * y los devuelve para incluir en el contexto de la respuesta
 */
export async function getRelevantFactsForMessage(
    profileId: string,
    userMessage: string
): Promise<string[]> {
    // Extraer keywords del mensaje
    const keywords = extractKeywords(userMessage);

    if (keywords.length === 0) return [];

    const allRelevantFacts: ExtractedFact[] = [];

    // Buscar por cada keyword
    for (const keyword of keywords.slice(0, 3)) { // Max 3 búsquedas
        const facts = await searchFacts(profileId, keyword, 2);
        allRelevantFacts.push(...facts);
    }

    // Eliminar duplicados y devolver contenido
    const uniqueFacts = [...new Map(allRelevantFacts.map(f => [f.content, f])).values()];

    return uniqueFacts.slice(0, 5).map(f => f.content);
}

/**
 * Extrae keywords relevantes de un mensaje
 */
function extractKeywords(message: string): string[] {
    const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'y', 'a', 'por', 'para', 'con', 'es', 'son', 'me', 'te', 'se'];

    const words = message
        .toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.includes(w));

    // Priorizar palabras clave emocionales/importantes
    const importantWords = ['trabajo', 'familia', 'mamá', 'papá', 'hermano', 'amiga', 'cumpleaños', 'aniversario', 'pelea', 'amor', 'celos', 'miedo', 'problema'];

    const prioritized = words.filter(w => importantWords.some(iw => w.includes(iw)));
    const others = words.filter(w => !importantWords.some(iw => w.includes(iw)));

    return [...prioritized, ...others].slice(0, 5);
}

// ===============================================
// LIMPIEZA Y MANTENIMIENTO
// ===============================================

/**
 * Desactiva hechos que ya no son relevantes (más de 90 días sin mencionar)
 */
export async function cleanupOldFacts(profileId: string): Promise<number> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return 0;

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data, error } = await supabase
            .from('ex_memory_facts')
            .update({ is_active: false })
            .eq('user_id', user.user.id)
            .eq('ex_profile_id', profileId)
            .lt('last_mentioned_at', ninetyDaysAgo.toISOString())
            .select('id');

        if (error) return 0;

        console.log('[FactEmbeddings] 🧹 Limpiados', data?.length || 0, 'hechos antiguos');
        return data?.length || 0;

    } catch (e) {
        return 0;
    }
}
