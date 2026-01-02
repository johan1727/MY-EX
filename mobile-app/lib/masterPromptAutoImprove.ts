/**
 * AUTO-MEJORA DEL MASTER PROMPT
 * 
 * Sistema que aprende de las correcciones del usuario durante la simulación
 * y actualiza el Master Prompt automáticamente.
 */

import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ===============================================
// TIPOS
// ===============================================

export interface UserCorrection {
    id: string;
    timestamp: string;
    originalResponse: string;  // Lo que la IA dijo
    userFeedback: string;      // "Ella no diría eso" o corrección específica
    correctedBehavior?: string; // Cómo DEBERÍA haber respondido
    category: 'tone' | 'content' | 'timing' | 'vocabulary' | 'personality';
}

export interface MasterPromptUpdate {
    originalPrompt: string;
    corrections: UserCorrection[];
    updatedPrompt: string;
    changesApplied: string[];
    version: number;
}

// ===============================================
// ALMACENAMIENTO DE CORRECCIONES
// ===============================================

const CORRECTIONS_KEY = 'ex_simulator_corrections_';

/**
 * Guarda una corrección del usuario en localStorage
 */
export function saveUserCorrection(
    profileId: string,
    correction: Omit<UserCorrection, 'id' | 'timestamp'>
): void {
    const key = CORRECTIONS_KEY + profileId;
    const existingStr = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    const existing: UserCorrection[] = existingStr ? JSON.parse(existingStr) : [];

    const newCorrection: UserCorrection = {
        ...correction,
        id: `corr_${Date.now()}`,
        timestamp: new Date().toISOString()
    };

    // Mantener máximo 20 correcciones
    const updated = [...existing, newCorrection].slice(-20);

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updated));
    }

    console.log('[AutoMejora] ✅ Corrección guardada:', newCorrection.category);
}

/**
 * Obtiene todas las correcciones pendientes
 */
export function getPendingCorrections(profileId: string): UserCorrection[] {
    const key = CORRECTIONS_KEY + profileId;
    const existingStr = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return existingStr ? JSON.parse(existingStr) : [];
}

/**
 * Limpia las correcciones después de aplicarlas
 */
export function clearCorrections(profileId: string): void {
    const key = CORRECTIONS_KEY + profileId;
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
    }
}

// ===============================================
// AUTO-MEJORA CON IA
// ===============================================

/**
 * Actualiza el Master Prompt basándose en las correcciones del usuario
 * Se llama cuando hay 5+ correcciones acumuladas
 */
export async function updateMasterPromptWithCorrections(
    profileId: string,
    currentMasterPrompt: string
): Promise<MasterPromptUpdate | null> {
    const corrections = getPendingCorrections(profileId);

    if (corrections.length < 5) {
        console.log('[AutoMejora] No hay suficientes correcciones (${corrections.length}/5)');
        return null;
    }

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('[AutoMejora] No API key');
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Construir resumen de correcciones
        const correctionsSummary = corrections.map(c =>
            `- Categoría: ${c.category}
   IA dijo: "${c.originalResponse.substring(0, 100)}..."
   Usuario: "${c.userFeedback}"
   Correcto: "${c.correctedBehavior || 'No especificado'}"`
        ).join('\n\n');

        const prompt = `Eres un experto en ajustar prompts de simulación de personalidad.

MASTER PROMPT ACTUAL:
${currentMasterPrompt}

CORRECCIONES DEL USUARIO (lo que la simulación hizo mal):
${correctionsSummary}

Tu tarea:
1. Analiza cada corrección y entiende qué patrones la IA está haciendo mal
2. Modifica el Master Prompt para corregir estos errores
3. Mantén el estilo y formato del prompt original
4. Agrega reglas específicas para evitar los errores detectados

Responde con JSON:
{
    "updatedPrompt": "El nuevo Master Prompt completo...",
    "changesApplied": [
        "Agregada regla: no usar 'jajaja' cuando está molesta",
        "Corregido: el tono ahora es más seco cuando ignoran mensajes"
    ]
}`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Limpiar correcciones aplicadas
        clearCorrections(profileId);

        // Guardar nuevo Master Prompt en Supabase
        await saveMasterPromptUpdate(profileId, result.updatedPrompt, corrections.length);

        console.log('[AutoMejora] ✅ Master Prompt actualizado con', result.changesApplied?.length || 0, 'cambios');

        return {
            originalPrompt: currentMasterPrompt,
            corrections,
            updatedPrompt: result.updatedPrompt,
            changesApplied: result.changesApplied || [],
            version: Date.now()
        };

    } catch (e: any) {
        console.error('[AutoMejora] Error:', e?.message || e);
        return null;
    }
}

/**
 * Guarda la actualización del Master Prompt en Supabase
 */
async function saveMasterPromptUpdate(
    profileId: string,
    newPrompt: string,
    correctionCount: number
): Promise<void> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return;

        // Obtener versión actual
        const { data: current } = await supabase
            .from('ex_profiles_master_prompt')
            .select('version')
            .eq('ex_profile_id', profileId)
            .single();

        const newVersion = (current?.version || 0) + 1;

        await supabase
            .from('ex_profiles_master_prompt')
            .upsert({
                ex_profile_id: profileId,
                master_prompt: newPrompt,
                token_count: Math.ceil(newPrompt.length / 4),
                version: newVersion,
                learned_facts: { correctionCount, lastUpdate: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'ex_profile_id'
            });

        console.log('[AutoMejora] ✅ Versión', newVersion, 'guardada en Supabase');
    } catch (e) {
        console.error('[AutoMejora] Error guardando en Supabase:', e);
    }
}

// ===============================================
// DETECCIÓN DE CORRECCIONES AUTOMÁTICA
// ===============================================

/**
 * Detecta si el mensaje del usuario es una corrección
 */
export function detectUserCorrection(userMessage: string): { isCorrection: boolean; category?: UserCorrection['category'] } {
    const correctionPhrases = [
        { patterns: ['no diría', 'ella no dice', 'él no dice', 'no habla así'], category: 'tone' as const },
        { patterns: ['eso no es cierto', 'eso nunca pasó', 'inventaste'], category: 'content' as const },
        { patterns: ['no usaría', 'nunca dice', 'no dice así'], category: 'vocabulary' as const },
        { patterns: ['no es su personalidad', 'no es así', 'es más'], category: 'personality' as const },
        { patterns: ['tardaría más', 'respondería antes', 'muy rápido', 'muy lento'], category: 'timing' as const }
    ];

    const messageLower = userMessage.toLowerCase();

    for (const { patterns, category } of correctionPhrases) {
        if (patterns.some(p => messageLower.includes(p))) {
            return { isCorrection: true, category };
        }
    }

    return { isCorrection: false };
}

// ===============================================
// MEMORIA SELECTIVA
// ===============================================

/**
 * Aplica memoria selectiva basada en neuroticismo
 * - Alto neuroticismo: Recuerda TODO, especialmente lo negativo
 * - Bajo neuroticismo: Olvida detalles pequeños
 */
export function applySelectiveMemory(
    facts: string[],
    neuroticismLevel: number,
    memorySelectivity?: {
        retentionRate: number;
        exaggeratesNegative: boolean;
        typicallyForgets: string[];
    }
): string[] {
    if (!memorySelectivity) {
        return facts;
    }

    // Si neuroticismo alto (>7), recuerda todo
    if (neuroticismLevel > 7) {
        return facts;
    }

    // Si neuroticismo bajo (<4), olvida algunos hechos
    const retentionRate = memorySelectivity.retentionRate || 0.7;

    return facts.filter(() => Math.random() < retentionRate);
}

/**
 * Modifica hechos basado en memoria selectiva
 * Ej: Si exaggeratesNegative=true, los conflictos se recuerdan peor de lo que fueron
 */
export function modifyFactsByMemory(
    fact: string,
    memorySelectivity?: {
        exaggeratesNegative: boolean;
        remembersBothGoodAndBad: boolean;
    }
): string {
    if (!memorySelectivity) return fact;

    // Si exagera lo negativo
    if (memorySelectivity.exaggeratesNegative) {
        const negativeKeywords = ['pelea', 'enojo', 'problema', 'mal', 'nunca'];
        const hasNegative = negativeKeywords.some(k => fact.toLowerCase().includes(k));

        if (hasNegative) {
            return fact + ' (y fue peor de lo que parece)';
        }
    }

    return fact;
}
