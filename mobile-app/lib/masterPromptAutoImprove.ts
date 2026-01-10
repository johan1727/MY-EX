/**
 * AUTO-MEJORA DEL MASTER PROMPT
 * 
 * Sistema que aprende de las correcciones del usuario durante la simulación
 * y actualiza el Master Prompt automáticamente.
 */

import { supabase } from './supabase';
import { generateAIResponse } from './gemini';
import { storage } from './storage';

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
 * Guarda una corrección del usuario en storage + Supabase con análisis IA
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function saveUserCorrection(
    profileId: string,
    correction: Omit<UserCorrection, 'id' | 'timestamp'>
): Promise<void> {
    const key = CORRECTIONS_KEY + profileId;
    const existingStr = await storage.getItem(key);
    const existing: UserCorrection[] = existingStr ? JSON.parse(existingStr) : [];

    const newCorrection: UserCorrection = {
        ...correction,
        id: `corr_${Date.now()}`,
        timestamp: new Date().toISOString()
    };

    // Mantener máximo 20 correcciones localmente
    const updated = [...existing, newCorrection].slice(-20);
    await storage.setItem(key, JSON.stringify(updated));

    console.log('[AutoMejora] ✅ Corrección guardada localmente:', newCorrection.category);

    // Sync to Supabase with AI analysis (background, non-blocking)
    syncCorrectionToSupabase(profileId, newCorrection).catch(err =>
        console.log('[AutoMejora] ⚠️ Supabase sync failed:', err)
    );
}

/**
 * Sincroniza una corrección a Supabase con análisis de IA
 */
async function syncCorrectionToSupabase(
    profileId: string,
    correction: UserCorrection
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('[AutoMejora] No user logged in, skipping Supabase sync');
        return;
    }

    // Analyze correction with AI
    const aiAnalysis = await analyzeCorrection(correction);

    const { error } = await supabase
        .from('user_corrections')
        .insert({
            user_id: user.id,
            profile_id: profileId,
            category: correction.category,
            original_response: correction.originalResponse,
            user_feedback: correction.userFeedback,
            corrected_behavior: correction.correctedBehavior || null,
            ai_analysis: aiAnalysis
        });

    if (error) {
        console.error('[AutoMejora] Supabase insert error:', error);
        return;
    }

    console.log('[AutoMejora] ✅ Corrección sincronizada a Supabase');
}

/**
 * Analiza una corrección con IA para entender el problema y sugerir mejoras
 */
async function analyzeCorrection(correction: UserCorrection): Promise<{
    understood_issue: string;
    improvement_applied: string;
    confidence: number;
    pattern_detected: string;
}> {

    try {
        const prompt = `Analiza esta corrección de usuario a una simulación de ex-pareja:

CATEGORÍA: ${correction.category}
RESPUESTA DE LA IA: "${correction.originalResponse}"
FEEDBACK DEL USUARIO: "${correction.userFeedback}"
COMPORTAMIENTO CORRECTO: "${correction.correctedBehavior || 'No especificado'}"

Responde SOLO con JSON:
{
    "understood_issue": "explicación breve del problema detectado",
    "improvement_applied": "cómo se debe ajustar el comportamiento de la simulación",
    "confidence": 0.0-1.0,
    "pattern_detected": "patrón general si existe (ej: 'demasiado formal', 'falta de emojis', 'tono incorrecto')"
}`;

        const text = await generateAIResponse(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e: any) {
        console.log('[AutoMejora] AI analysis failed:', e?.message);
    }

    return {
        understood_issue: correction.userFeedback,
        improvement_applied: 'Ajustar según feedback',
        confidence: 0.5,
        pattern_detected: correction.category
    };
}


/**
 * Obtiene todas las correcciones pendientes
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function getPendingCorrections(profileId: string): Promise<UserCorrection[]> {
    const key = CORRECTIONS_KEY + profileId;
    const existingStr = await storage.getItem(key);
    return existingStr ? JSON.parse(existingStr) : [];
}

/**
 * Limpia las correcciones después de aplicarlas
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function clearCorrections(profileId: string): Promise<void> {
    const key = CORRECTIONS_KEY + profileId;
    await storage.removeItem(key);
}

// ===============================================
// AUTO-MEJORA CON IA
// ===============================================

/**
 * Actualiza el Master Prompt basándose en las correcciones del usuario
 * NUEVO: Ahora también analiza patrones conversacionales y se activa con 3+ correcciones
 */
export async function updateMasterPromptWithCorrections(
    profileId: string,
    currentMasterPrompt: string,
    recentConversation?: { user: string; ex: string }[] // NUEVO: Conversation context
): Promise<MasterPromptUpdate | null> {
    const corrections = await getPendingCorrections(profileId);

    // CAMBIO: 3+ correcciones (antes 5)
    if (corrections.length < 3) {
        console.log(`[AutoMejora] No hay suficientes correcciones (${corrections.length}/3)`);
        return null;
    }

    try {
        // Construir resumen de correcciones
        const correctionsSummary = corrections.map((c, i) =>
            `${i + 1}. Categoría: ${c.category}
   IA dijo: "${c.originalResponse.substring(0, 150)}..."
   Usuario: "${c.userFeedback}"
   Correcto: "${c.correctedBehavior || 'No especificado'}`
        ).join('\n\n');

        // NUEVO: Agregar contexto conversacional si existe
        let conversationContext = '';
        if (recentConversation && recentConversation.length > 0) {
            conversationContext = `\n\nCONTEXTO CONVERSACIONAL RECIENTE (últimos ${recentConversation.length} mensajes):
${recentConversation.map(msg => `Usuario: ${msg.user}\nEx: ${msg.ex}`).join('\n---\n')}

ANÁLISIS REQUERIDO:
- ¿El tono de la IA es consistente con el Master Prompt?
- ¿Hay patrones que el prompt no está capturando?
- ¿El usuario parece frustrado con algo específico?`;
        }

        const prompt = `Eres un experto en ajustar prompts de simulación de personalidad con IA avanzada.

MASTER PROMPT ACTUAL:
${currentMasterPrompt}

CORRECCIONES DEL USUARIO (lo que la simulación hizo mal):
${correctionsSummary}
${conversationContext}

Tu tarea:
1. Analiza cada corrección y entiende qué patrones la IA está haciendo mal
2. Identifica si hay inconsistencias entre el Master Prompt y el comportamiento real esperado
3. Modifica el Master Prompt para corregir estos errores DE FORMA ESPECÍFICA
4. Mantén el estilo y formato del prompt original
5. Agrega reglas MUY ESPECÍFICAS para evitar los errores detectados

REGLAS CRÍTICAS:
- Si el usuario dice "ella no diría eso" → Agrega ejemplos DE LO QUE SÍ DIRÍA
- Si el error es de tono → Especifica EXACTAMENTE qué tono usar en qué situación
- Si el error es de vocabulario → Lista palabras PROHIBIDAS y palabras REQUERIDAS
- NO hagas cambios genéricos, sé QUIRÚRGICO

Responde con JSON:
{
    "updatedPrompt": "El nuevo Master Prompt completo mejorado...",
    "changesApplied": [
        "Agregada regla específica: 'Cuando el usuario la ignora, responde con 'ok.' (punto incluido) después de 2+ horas, no con 'jajaja''",
        "Vocabulario prohibido: ['osea', 'tipo'] (nunca los usa). Vocabulario requerido: ['ntp', 'ajá', 'sip']",
        "Tono corregido: Al hablar de su ex anterior, siempre menciona que 'fue lo mejor que le pasó' (sarcasmo)"
    ],
    "detectedPatterns": [
        "La IA es demasiado amigable cuando debería estar molesta",
        "Falta el uso de puntos suspensivos (...) que ella usa cuando está pensando"
    ],
    "confidence": 0.0-1.0
}`;

        console.log('[AutoMejora] 🤖 Enviando prompt a IA para análisis...');
        const responseText = await generateAIResponse(prompt);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Limpiar correcciones aplicadas
        await clearCorrections(profileId);

        // Guardar nuevo Master Prompt en Supabase
        await saveMasterPromptUpdate(profileId, result.updatedPrompt, corrections.length);

        console.log('[AutoMejora] ✅ Master Prompt actualizado con', result.changesApplied?.length || 0, 'cambios');
        console.log('[AutoMejora] 📊 Confidence:', result.confidence);
        console.log('[AutoMejora] 🔍 Patrones detectados:', result.detectedPatterns);

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

// ===============================================
// 🤖 ANÁLISIS PROACTIVO CON IA
// ===============================================

/**
 * NUEVA FUNCIÓN: Analiza conversación cada 10 mensajes para detectar patrones
 * y mejorar el Master Prompt automáticamente SIN esperar correcciones del usuario
 */
export async function analyzeConversationPatterns(
    profileId: string,
    currentMasterPrompt: string,
    conversation: { user: string; ex: string; timestamp: string }[]
): Promise<{
    needsUpdate: boolean;
    suggestedChanges?: string[];
    detectedIssues?: string[];
    confidence?: number;
} | null> {
    if (conversation.length < 10) {
        return null;
    }

    try {
        // Tomar últimos 20 mensajes para análisis
        const recentConvo = conversation.slice(-20);
        const convoText = recentConvo.map((msg, i) =>
            `[${i + 1}] Usuario: ${msg.user}\n    Ex: ${msg.ex}`
        ).join('\n');

        const prompt = `Eres un experto en análisis de personalidad simulada con IA.

MASTER PROMPT ACTUAL:
${currentMasterPrompt.substring(0, 3000)} ${currentMasterPrompt.length > 3000 ? '... (truncado)' : ''}

CONVERSACIÓN RECIENTE (últimos ${recentConvo.length} mensajes):
${convoText}

Tu tarea:
Analiza si la IA está simulando **CONSISTENTEMENTE** el comportamiento descrito en el Master Prompt.

PREGUNTAS CRÍTICAS:
1. ¿El tono emocional es consistente con lo descrito?
2. ¿Usa las palabras/frases que debería usar?
3. ¿Hay patrones de comportamiento que el prompt NO está capturando?
4. ¿La IA parece "genérica" en lugar de personalizada?
5. ¿Hay inconsistencias evidentes?

REGLAS:
- Si TODO está bien → needsUpdate: false
- Si hay 2+ problemas menores → needsUpdate: true
- Si hay 1 problema grave (ej: tono completamente equivocado) → needsUpdate: true
- SÉ **CONSERVADOR**: Solo sugerir cambios si es REALMENTE necesario

Responde con JSON:
{
    "needsUpdate": true/false,
    "detectedIssues": [
        "La IA usa 'jajaja' pero en el Master Prompt dice que usa 'jaja' (sin repetición)",
        "El tono es demasiado formal, debería ser más casual"
    ],
    "suggestedChanges": [
        "Cambiar 'risa: jajaja' por 'risa: jaja (2-3 veces máximo)'",
        "Agregar: 'Tono: casual, nunca formal. Ejemplo: ntp, sip, aja'"
    ],
    "confidence": 0.0-1.0
}`;

        console.log('[AutoMejora] 🔍 Analizando conversación proactivamente...');
        const responseText = await generateAIResponse(prompt);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('[AutoMejora] ⚠️ No JSON en respuesta de IA');
            return null;
        }

        const result = JSON.parse(jsonMatch[0]);

        if (result.needsUpdate) {
            console.log('[AutoMejora] ⚠️ Análisis detectó', result.detectedIssues?.length || 0, 'problemas');
            console.log('[AutoMejora] 💡 Confianza:', result.confidence);

            // Auto-guardar como correcciones "sintéticas" si confidence > 0.7
            if (result.confidence > 0.7 && result.detectedIssues) {
                for (const issue of result.detectedIssues.slice(0, 2)) { // Max 2
                    await saveUserCorrection(profileId, {
                        originalResponse: '(Auto-detectado por IA)',
                        userFeedback: issue,
                        correctedBehavior: result.suggestedChanges?.[0] || 'Ver análisis',
                        category: 'personality'
                    });
                }
                console.log('[AutoMejora] ✅ Correcciones sintéticas guardadas');
            }
        } else {
            console.log('[AutoMejora] ✅ Conversación consistente con Master Prompt');
        }

        return result;

    } catch (e: any) {
        console.error('[AutoMejora] Error en análisis proactivo:', e?.message);
        return null;
    }
}

/**
 * Trigger automático: Llama cada 10 mensajes
 */
export async function shouldTriggerProactiveAnalysis(
    profileId: string,
    messageCount: number
): Promise<boolean> {
    // Trigger cada 10 mensajes
    if (messageCount % 10 !== 0) return false;

    // No analizar si ya hay correcciones pendientes (evitar duplicados)
    const pending = await getPendingCorrections(profileId);
    if (pending.length >= 3) {
        console.log('[AutoMejora] 🔄 Ya hay correcciones pendientes, saltando análisis proactivo');
        return false;
    }

    return true;
}

