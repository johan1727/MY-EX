/**
 * SIMULATION STATE
 * Sistema de estados emocionales dinámicos para simulación de conversaciones vivas
 * 
 * Este módulo define las interfaces y funciones para mantener el estado
 * emocional de una simulación a través de múltiples mensajes.
 */

import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ===== TIPOS DE EMOCIONES =====
export type PrimaryEmotion =
    | 'neutral'
    | 'happy'
    | 'annoyed'
    | 'sad'
    | 'defensive'
    | 'loving'
    | 'jealous'
    | 'withdrawn'
    | 'angry'
    | 'excited'
    | 'vulnerable';

// ===== ESTADO EMOCIONAL =====
export interface EmotionalState {
    primary: PrimaryEmotion;
    secondary?: PrimaryEmotion;      // Emoción subyacente
    intensity: number;               // 0-1
    valence: number;                 // -1 (negativo) a +1 (positivo)
    arousal: number;                 // 0 (calmado) a 1 (activado)
    decayRate: number;               // Velocidad de retorno a neutral (0.01-0.1)
    lastUpdated: string;             // ISO timestamp
    lastTransitionAt: string;        // Para evitar ping-pong emocional
    triggerMessage?: string;         // Qué causó este estado
}

// ===== ESTADO DE FATIGA =====
export interface FatigueState {
    level: number;                   // 0-1
    messageCount: number;            // Total de mensajes en sesión
    emotionalDrain: number;          // Acumulado de intensidades emocionales
    peakReached: boolean;            // Si alcanzó fatiga alta
    lastRest: string;                // Timestamp del último "descanso"
}

// ===== MEMORIA DE CONVERSACIÓN =====
export interface ConversationMemory {
    keyMoments: string[];            // Momentos importantes (max 5)
    currentTopic: string | null;
    topicHistory: string[];          // Últimos 3 temas
    tensionLevel: number;            // 0-1
    positiveInteractions: number;
    negativeInteractions: number;
}

// ===== SESIÓN DE SIMULACIÓN COMPLETA =====
export interface SimulationSession {
    id: string;
    profileId: string;
    userId: string;
    startedAt: string;
    lastMessageAt: string;

    // Estado dinámico
    currentEmotion: EmotionalState;
    emotionHistory: EmotionalState[];  // Últimos 10 estados

    // Fatiga
    fatigue: FatigueState;

    // Memoria de conversación
    memory: ConversationMemory;

    // Configuración de respuesta
    responseConfig: {
        minDelayMs: number;              // 2000
        maxDelayMs: number;              // 6000
        interestLevel: number;           // 0-1 afecta delays
    };
}

// ===== FUNCIONES DE CREACIÓN =====

/**
 * Crea un estado emocional inicial neutral
 */
export function createInitialEmotionalState(): EmotionalState {
    const now = new Date().toISOString();
    return {
        primary: 'neutral',
        secondary: undefined,
        intensity: 0.3,
        valence: 0,
        arousal: 0.3,
        decayRate: 0.05,
        lastUpdated: now,
        lastTransitionAt: now,
        triggerMessage: undefined
    };
}

/**
 * Crea un estado de fatiga inicial
 */
export function createInitialFatigueState(): FatigueState {
    return {
        level: 0,
        messageCount: 0,
        emotionalDrain: 0,
        peakReached: false,
        lastRest: new Date().toISOString()
    };
}

/**
 * Crea una memoria de conversación inicial
 */
export function createInitialConversationMemory(): ConversationMemory {
    return {
        keyMoments: [],
        currentTopic: null,
        topicHistory: [],
        tensionLevel: 0,
        positiveInteractions: 0,
        negativeInteractions: 0
    };
}

/**
 * Crea una nueva sesión de simulación
 */
export function createSimulationSession(
    profileId: string,
    userId: string
): SimulationSession {
    const now = new Date().toISOString();

    return {
        id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        profileId,
        userId,
        startedAt: now,
        lastMessageAt: now,

        currentEmotion: createInitialEmotionalState(),
        emotionHistory: [],

        fatigue: createInitialFatigueState(),

        memory: createInitialConversationMemory(),

        responseConfig: {
            minDelayMs: 2000,
            maxDelayMs: 6000,
            interestLevel: 0.7
        }
    };
}

// ===== HELPERS =====

/**
 * Obtiene el tiempo desde el último mensaje en milisegundos
 */
export function getTimeSinceLastMessage(session: SimulationSession): number {
    return Date.now() - new Date(session.lastMessageAt).getTime();
}

/**
 * Obtiene la hora actual (0-23) para afectar comportamiento
 */
export function getCurrentHour(): number {
    return new Date().getHours();
}

/**
 * Determina si es hora nocturna (22:00 - 06:00)
 */
export function isNightTime(): boolean {
    const hour = getCurrentHour();
    return hour >= 22 || hour <= 6;
}

/**
 * Serializa la sesión para localStorage
 */
export function serializeSession(session: SimulationSession): string {
    return JSON.stringify(session);
}

/**
 * Deserializa la sesión desde localStorage
 */
export function deserializeSession(data: string): SimulationSession | null {
    try {
        return JSON.parse(data) as SimulationSession;
    } catch {
        return null;
    }
}

/**
 * Clave de localStorage para una sesión
 */
export function getSessionStorageKey(profileId: string): string {
    return `simulation_session_${profileId}`;
}

// ===============================================
// 💾 SUPABASE SESSION PERSISTENCE (NUEVO)
// ===============================================

// Imports moved to top of file

/**
 * Guarda la sesión de simulación en Supabase
 * Permite recuperar el estado emocional entre sesiones
 */
export async function saveSessionToSupabase(session: SimulationSession): Promise<boolean> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            console.warn('[SessionPersistence] No user logged in, skipping Supabase save');
            return false;
        }

        const { error } = await supabase
            .from('simulation_sessions')
            .upsert({
                id: session.id,
                user_id: session.userId,
                ex_profile_id: session.profileId,
                started_at: session.startedAt,
                last_message_at: session.lastMessageAt,
                current_emotion: session.currentEmotion,
                emotion_history: session.emotionHistory,
                fatigue: session.fatigue,
                memory: session.memory,
                response_config: session.responseConfig,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.error('[SessionPersistence] Supabase save error:', error);
            return false;
        }

        console.log('[SessionPersistence] ✅ Session saved to Supabase:', session.id);
        return true;
    } catch (e) {
        console.error('[SessionPersistence] Error saving to Supabase:', e);
        return false;
    }
}

/**
 * Carga la sesión más reciente desde Supabase para un perfil
 */
export async function loadSessionFromSupabase(profileId: string): Promise<SimulationSession | null> {
    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) {
            console.warn('[SessionPersistence] No user logged in');
            return null;
        }

        const { data, error } = await supabase
            .from('simulation_sessions')
            .select('*')
            .eq('user_id', user.user.id)
            .eq('ex_profile_id', profileId)
            .order('last_message_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            console.log('[SessionPersistence] No previous session found');
            return null;
        }

        // Verificar que la sesión no sea muy antigua (más de 24 horas)
        const lastMessageTime = new Date(data.last_message_at).getTime();
        const ageHours = (Date.now() - lastMessageTime) / (1000 * 60 * 60);

        if (ageHours > 24) {
            console.log('[SessionPersistence] Session too old (>24h), starting fresh');
            return null;
        }

        console.log('[SessionPersistence] ✅ Session loaded from Supabase:', data.id);

        return {
            id: data.id,
            profileId: data.ex_profile_id,
            userId: data.user_id,
            startedAt: data.started_at,
            lastMessageAt: data.last_message_at,
            currentEmotion: data.current_emotion,
            emotionHistory: data.emotion_history || [],
            fatigue: data.fatigue,
            memory: data.memory,
            responseConfig: data.response_config
        };
    } catch (e) {
        console.error('[SessionPersistence] Error loading from Supabase:', e);
        return null;
    }
}

// ===============================================
// 🤖 TENSION ANALYSIS WITH AI (NUEVO)
// ===============================================

/**
 * Calcula la tensión de la conversación usando IA
 * Analiza el tono de los últimos mensajes y determina el nivel de tensión
 */
export async function calculateTensionWithAI(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    currentTension: number
): Promise<{ tensionLevel: number; reason: string; emotionalShift: PrimaryEmotion | null }> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('[TensionAI] No API key, using algorithmic fallback');
        return { tensionLevel: currentTension, reason: 'Sin API', emotionalShift: null };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Construir contexto de últimos 5 mensajes
        const recentMessages = conversationHistory.slice(-5)
            .map(m => `${m.role === 'user' ? 'Usuario' : 'Ex'}: ${m.content}`)
            .join('\n');

        const prompt = `Analiza la tensión emocional de esta conversación.

HISTORIAL RECIENTE:
${recentMessages}

NUEVO MENSAJE DEL USUARIO:
${userMessage}

TENSIÓN ACTUAL: ${Math.round(currentTension * 100)}%

Tu tarea:
1. Evalúa si el mensaje del usuario aumenta, mantiene o reduce la tensión
2. Considera: tono, palabras usadas, contexto previo, posibles conflictos
3. Determina si hay un cambio emocional importante

Responde SOLO con JSON:
{
    "tensionLevel": 0.0-1.0 (nueva tensión, donde 0=calmado, 1=muy tenso),
    "tensionChange": "aumenta" | "mantiene" | "reduce",
    "reason": "explicación breve de por qué",
    "emotionalShift": "happy" | "sad" | "angry" | "jealous" | "defensive" | "loving" | null
}`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();

        // Parsear respuesta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON in response');
        }

        const result = JSON.parse(jsonMatch[0]);

        console.log('[TensionAI] ✅ Analysis:', {
            tension: result.tensionLevel,
            change: result.tensionChange,
            emotion: result.emotionalShift
        });

        return {
            tensionLevel: Math.max(0, Math.min(1, result.tensionLevel || currentTension)),
            reason: result.reason || 'Análisis completado',
            emotionalShift: result.emotionalShift || null
        };

    } catch (e: any) {
        console.error('[TensionAI] Error:', e?.message || e);

        // Fallback algorítmico simple
        const negativeTriggers = ['idiota', 'tonto', 'odio', 'nunca', 'siempre', 'culpa', 'mal', 'problema'];
        const positiveTriggers = ['amor', 'gracias', 'perdón', 'lo siento', 'te quiero', 'bien', 'feliz'];

        const messageLower = userMessage.toLowerCase();
        let newTension = currentTension;

        if (negativeTriggers.some(t => messageLower.includes(t))) {
            newTension = Math.min(1, currentTension + 0.15);
        } else if (positiveTriggers.some(t => messageLower.includes(t))) {
            newTension = Math.max(0, currentTension - 0.1);
        }

        return {
            tensionLevel: newTension,
            reason: 'Análisis algorítmico (fallback)',
            emotionalShift: null
        };
    }
}

/**
 * Actualiza el estado de la sesión con análisis de tensión por IA
 */
export async function updateSessionWithAITension(
    session: SimulationSession,
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<SimulationSession> {
    const tensionResult = await calculateTensionWithAI(
        userMessage,
        conversationHistory,
        session.memory.tensionLevel
    );

    // Actualizar memoria con nueva tensión
    const updatedMemory: ConversationMemory = {
        ...session.memory,
        tensionLevel: tensionResult.tensionLevel,
        positiveInteractions: tensionResult.emotionalShift === 'happy' || tensionResult.emotionalShift === 'loving'
            ? session.memory.positiveInteractions + 1
            : session.memory.positiveInteractions,
        negativeInteractions: tensionResult.emotionalShift === 'angry' || tensionResult.emotionalShift === 'sad'
            ? session.memory.negativeInteractions + 1
            : session.memory.negativeInteractions
    };

    // Actualizar emoción si hay cambio
    let updatedEmotion = session.currentEmotion;
    if (tensionResult.emotionalShift) {
        updatedEmotion = {
            ...session.currentEmotion,
            primary: tensionResult.emotionalShift,
            intensity: Math.min(1, session.currentEmotion.intensity + 0.2),
            lastUpdated: new Date().toISOString(),
            triggerMessage: userMessage.substring(0, 50)
        };
    }

    return {
        ...session,
        lastMessageAt: new Date().toISOString(),
        currentEmotion: updatedEmotion,
        memory: updatedMemory
    };
}

// ===============================================
// 🔄 ESTADO EMOCIONAL DINÁMICO CON IA
// ===============================================

/**
 * Re-evalúa el estado emocional completo usando IA
 * Se llama cada 5 mensajes para transiciones no-lineales
 */
export async function reevaluateEmotionalStateWithAI(
    session: SimulationSession,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<SimulationSession> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || conversationHistory.length < 5) {
        console.warn('[EmotionalAI] Skipping (not enough history or no API)');
        return session;
    }

    try {
        // Tomar últimos 10 mensajes para contexto
        const recentMessages = conversationHistory.slice(-10)
            .map(m => `${m.role === 'user' ? 'Usuario' : 'Ex'}: ${m.content}`)
            .join('\n');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza el estado emocional actual de "Ex" en esta conversación.

HISTORIAL RECIENTE:
${recentMessages}

ESTADO ACTUAL:
- Emoción: ${session.currentEmotion.primary}
- Intensidad: ${session.currentEmotion.intensity}
- Tensión: ${Math.round(session.memory.tensionLevel * 100)}%
- Fatiga: ${Math.round(session.fatigue.level * 100)}%

Tu tarea:
1. Evalúa si la emoción actual sigue siendo correcta o debería cambiar
2. Determina si la intensidad debería aumentar/disminuir
3. Considera el contexto acumulado (no solo el último mensaje)
4. Predice hacia dónde se dirige emocionalmente

Responde SOLO con JSON:
{
    "newEmotion": "neutral" | "happy" | "annoyed" | "sad" | "defensive" | "loving" | "jealous" | "withdrawn" | "angry" | "excited" | "vulnerable",
    "newIntensity": 0.0-1.0,
    "emotionChanged": true | false,
    "reasoning": "explicación breve del cambio o por qué se mantiene",
    "prediction": "Si la conversación sigue así, probablemente..."
}`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();

        // Parsear JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found');
        }

        const result = JSON.parse(jsonMatch[0]);

        console.log('[EmotionalAI] ✅ Re-evaluation:', {
            from: session.currentEmotion.primary,
            to: result.newEmotion,
            changed: result.emotionChanged,
            reasoning: result.reasoning?.substring(0, 50)
        });

        // Actualizar estado emocional
        let updatedEmotion = session.currentEmotion;

        if (result.emotionChanged) {
            // Guardar estado anterior en historial
            const newHistory = [
                ...session.emotionHistory,
                { ...session.currentEmotion }
            ].slice(-10); // Mantener solo últimos 10

            updatedEmotion = {
                primary: result.newEmotion,
                secondary: session.currentEmotion.primary, // El anterior se vuelve secundario
                intensity: Math.max(0, Math.min(1, result.newIntensity || 0.5)),
                valence: calculateValence(result.newEmotion),
                arousal: result.newIntensity || session.currentEmotion.arousal,
                decayRate: 0.05,
                lastUpdated: new Date().toISOString(),
                lastTransitionAt: new Date().toISOString(),
                triggerMessage: result.reasoning?.substring(0, 100)
            };

            return {
                ...session,
                currentEmotion: updatedEmotion,
                emotionHistory: newHistory
            };
        } else {
            // Solo ajustar intensidad
            updatedEmotion = {
                ...session.currentEmotion,
                intensity: Math.max(0, Math.min(1, result.newIntensity || session.currentEmotion.intensity)),
                lastUpdated: new Date().toISOString()
            };

            return {
                ...session,
                currentEmotion: updatedEmotion
            };
        }

    } catch (e: any) {
        console.error('[EmotionalAI] Error:', e?.message || e);
        return session;
    }
}

/**
 * Calcula valencia emocional basada en el tipo de emoción
 */
function calculateValence(emotion: PrimaryEmotion): number {
    const valenceMap: Record<PrimaryEmotion, number> = {
        'happy': 0.8,
        'excited': 0.9,
        'loving': 1.0,
        'neutral': 0,
        'annoyed': -0.4,
        'defensive': -0.3,
        'jealous': -0.6,
        'sad': -0.7,
        'angry': -0.9,
        'withdrawn': -0.5,
        'vulnerable': -0.2
    };

    return valenceMap[emotion] || 0;
}


