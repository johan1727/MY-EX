import { supabase } from './supabase';

/**
 * Supabase helpers for Master Prompt System
 */

export interface MasterPromptData {
    id?: string;
    exProfileId: string;
    masterPrompt: string;
    tokenCount: number;
    version: number;
    analysisDurationSeconds: number;
    learnedFacts?: Array<{
        fact: string;
        learnedAt: string;
        fromConversationId?: string;
        confidence: number;
    }>;
    categoriesAnalyzed: Record<string, boolean>;
}

/**
 * Guardar Master Prompt en Supabase
 */
export async function saveMasterPrompt(data: MasterPromptData): Promise<string> {
    console.log('[Supabase] Saving master prompt...', {
        tokenCount: data.tokenCount,
        exProfileId: data.exProfileId
    });

    const { data: result, error } = await supabase
        .from('ex_profiles_master_prompt')
        .insert({
            ex_profile_id: data.exProfileId,
            master_prompt: data.masterPrompt,
            token_count: data.tokenCount,
            version: data.version || 1,
            analysis_duration_seconds: data.analysisDurationSeconds,
            learned_facts: data.learnedFacts || [],
            categories_analyzed: data.categoriesAnalyzed
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Supabase] Error saving master prompt:', error);
        throw new Error(`Error guardando Master Prompt: ${error.message}`);
    }

    console.log('[Supabase] ✅ Master prompt saved:', result.id);
    return result.id;
}

/**
 * Cargar Master Prompt desde Supabase
 */
export async function loadMasterPrompt(exProfileId: string): Promise<MasterPromptData | null> {
    console.log('[Supabase] Loading master prompt for profile:', exProfileId);

    const { data, error } = await supabase
        .from('ex_profiles_master_prompt')
        .select('*')
        .eq('ex_profile_id', exProfileId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows found
            console.log('[Supabase] No master prompt found for profile');
            return null;
        }
        console.error('[Supabase] Error loading master prompt:', error);
        throw new Error(`Error cargando Master Prompt: ${error.message}`);
    }

    console.log('[Supabase] ✅ Master prompt loaded:', {
        tokenCount: data.token_count,
        version: data.version
    });

    return {
        id: data.id,
        exProfileId: data.ex_profile_id,
        masterPrompt: data.master_prompt,
        tokenCount: data.token_count,
        version: data.version,
        analysisDurationSeconds: data.analysis_duration_seconds,
        learnedFacts: data.learned_facts || [],
        categoriesAnalyzed: data.categories_analyzed || {}
    };
}

/**
 * Actualizar Master Prompt (aprendizaje continuo)
 */
export async function updateMasterPrompt(
    exProfileId: string,
    newFacts: Array<{ fact: string; fromConversationId?: string; confidence: number }>
): Promise<void> {
    console.log('[Supabase] Updating master prompt with new learned facts...');

    // Cargar actual
    const current = await loadMasterPrompt(exProfileId);
    if (!current) {
        throw new Error('No existe Master Prompt para actualizar');
    }

    // Agregar nuevos hechos
    const updatedFacts = [
        ...(current.learnedFacts || []),
        ...newFacts.map(f => ({
            ...f,
            learnedAt: new Date().toISOString()
        }))
    ];

    // Actualizar en Supabase (esto incrementa versión automáticamente por trigger)
    const { error } = await supabase
        .from('ex_profiles_master_prompt')
        .update({
            learned_facts: updatedFacts
        })
        .eq('id', current.id);

    if (error) {
        console.error('[Supabase] Error updating master prompt:', error);
        throw new Error(`Error actualizando Master Prompt: ${error.message}`);
    }

    console.log('[Supabase] ✅ Master prompt updated with', newFacts.length, 'new facts');
}

/**
 * Guardar conversación en simulation_sessions
 */
export async function saveSimulationSession(
    userId: string,
    exProfileId: string,
    messages: Array<{ role: string; content: string; timestamp: Date }>,
    learnedFacts?: Array<{ fact: string; confidence: number }>
): Promise<string> {
    console.log('[Supabase] Saving simulation session...');

    const { data, error } = await supabase
        .from('simulation_sessions')
        .insert({
            user_id: userId,
            ex_profile_id: exProfileId,
            messages: messages.map(m => ({
                ...m,
                timestamp: m.timestamp.toISOString()
            })),
            learned_facts: learnedFacts || [],
            duration_seconds: Math.floor((new Date().getTime() - messages[0].timestamp.getTime()) / 1000)
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Supabase] Error saving session:', error);
        throw new Error(`Error guardando sesión: ${error.message}`);
    }

    console.log('[Supabase] ✅ Session saved:', data.id);

    // Si hay hechos aprendidos, actualizar el Master Prompt
    if (learnedFacts && learnedFacts.length > 0) {
        await updateMasterPrompt(
            exProfileId,
            learnedFacts.map(f => ({ ...f, fromConversationId: data.id }))
        );
    }

    return data.id;
}
