/**
 * SIMULATION ENGINE
 * Orquestador principal del sistema de simulación conversacional viva
 * 
 * Este módulo coordina todos los sistemas:
 * - Estados emocionales
 * - State machine
 * - Fatiga
 * - Delays
 * - Construcción de prompts
 * - Persistencia
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
    SimulationSession,
    EmotionalState,
    PrimaryEmotion,
    createSimulationSession,
    getSessionStorageKey,
    serializeSession,
    deserializeSession,
    getTimeSinceLastMessage
} from './simulationState';

import {
    canTransition,
    findValidTransition,
    applyEmotionalDecay,
    getEmotionDimensions
} from './emotionStateMachine';

import {
    updateFatigue,
    applyFatigueRecovery,
    getFatigueModifiers,
    shouldEndConversation,
    getFatigueBasedEnding
} from './fatigue';

import {
    calculateResponseDelay,
    calculateMessageComplexity,
    calculateInterestLevel,
    DelayFactors
} from './responseDelay';

import {
    buildSimulationPrompt,
    buildEmotionAnalysisPrompt,
    ExProfileWithMasterPrompt
} from './promptBuilder';

// === NUEVOS MÓDULOS DE COMPORTAMIENTO AVANZADO ===
import {
    getCircadianModifier,
    applyCognitiveDissonance,
    updateStressLevel,
    applyStressToResponse,
    detectDefenseMechanism,
    applyGuiltTripping,
    refineEmotion,
    calculateDistraction,
    applyDistraction,
    checkDelayedReaction,
    PendingReaction
} from './advancedBehaviors';

import {
    calculateMentalEnergy,
    getEnergyModifiers,
    applyEnergyToResponse,
    checkSaturationOverride
} from './mentalEconomy';

import {
    analyzeMessageSubtext,
    addSubtextToResponse,
    shouldStrategicSilence
} from './subtextEngine';

import {
    selectiveRecall,
    distortMemory,
    MemoryItem
} from './memorySystem';

import {
    initializeLatentStates,
    checkTriggers,
    decayLatentStates,
    accumulateTension,
    LatentState
} from './latentStates';

import {
    calculateDegradation,
    getDegradationModifiers,
    applyDegradation,
    detectRevivalAttempt,
    shouldEndConversation as shouldEndByDegradation,
    DegradationState
} from './conversationDegradation';

import { supabase } from './supabase';

// Type alias for convenience
type ExProfile = ExProfileWithMasterPrompt;

// ===== CONFIGURACIÓN =====
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ===== TIPOS =====
interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SimulationResponse {
    message: string;
    delayMs: number;
    session: SimulationSession;
    shouldEndConversation: boolean;
    endingReason?: string;
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Obtiene o crea una sesión de simulación
 */
export async function getOrCreateSession(
    profileId: string,
    userId: string
): Promise<SimulationSession> {
    // Intentar cargar de localStorage
    const storageKey = getSessionStorageKey(profileId);

    try {
        let stored: string | null = null;

        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            stored = localStorage.getItem(storageKey);
        } else if (Platform.OS !== 'web') {
            stored = await SecureStore.getItemAsync(storageKey);
        }

        if (stored) {
            const session = deserializeSession(stored);
            if (session && session.profileId === profileId) {
                console.log('[SimEngine] Sesión existente cargada');
                return session;
            }
        }
    } catch (e) {
        console.warn('[SimEngine] Error cargando sesión:', e);
    }

    // Crear nueva sesión
    console.log('[SimEngine] Creando nueva sesión');
    return createSimulationSession(profileId, userId);
}

/**
 * Guarda la sesión en localStorage y Supabase
 */
export async function saveSession(session: SimulationSession): Promise<void> {
    const storageKey = getSessionStorageKey(session.profileId);
    const serialized = serializeSession(session);

    // Guardar en localStorage
    try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, serialized);
        } else if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync(storageKey, serialized);
        }
    } catch (e) {
        console.warn('[SimEngine] Error guardando en localStorage:', e);
    }

    // Guardar en Supabase (async, no bloquear)
    syncSessionToSupabase(session).catch(e =>
        console.warn('[SimEngine] Error sincronizando con Supabase:', e)
    );
}

/**
 * Sincroniza la sesión con Supabase
 */
async function syncSessionToSupabase(session: SimulationSession): Promise<void> {
    try {
        const { error } = await supabase
            .from('simulation_sessions')
            .upsert({
                id: session.id,
                profile_id: session.profileId,
                user_id: session.userId,
                current_emotion: session.currentEmotion,
                fatigue_level: session.fatigue.level,
                message_count: session.fatigue.messageCount,
                tension_level: session.memory.tensionLevel,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.warn('[SimEngine] Error Supabase:', error.message);
        }
    } catch (e) {
        // Silenciar errores de Supabase, localStorage es suficiente
    }
}

/**
 * Procesa un mensaje del usuario y genera respuesta
 */
export async function processUserMessage(
    userMessage: string,
    profile: ExProfile,
    session: SimulationSession,
    conversationHistory: Message[]
): Promise<SimulationResponse> {
    console.log('[SimEngine] Procesando mensaje del usuario...');

    // 1. Aplicar decay emocional y recuperación de fatiga
    const timeSinceLastMessage = getTimeSinceLastMessage(session);
    let updatedSession = { ...session };

    updatedSession.currentEmotion = applyEmotionalDecay(
        updatedSession.currentEmotion,
        timeSinceLastMessage
    );

    updatedSession.fatigue = applyFatigueRecovery(
        updatedSession.fatigue,
        timeSinceLastMessage
    );

    // 2. Analizar impacto emocional del mensaje
    const emotionImpact = await analyzeEmotionalImpact(
        userMessage,
        updatedSession.currentEmotion,
        profile
    );

    // 3. Actualizar estado emocional
    updatedSession.currentEmotion = updateEmotionalState(
        updatedSession.currentEmotion,
        emotionImpact
    );

    // 4. Actualizar memoria y fatiga
    updatedSession.memory = updateConversationMemory(
        updatedSession.memory,
        emotionImpact,
        userMessage
    );

    updatedSession.fatigue = updateFatigue(
        updatedSession.fatigue,
        updatedSession.currentEmotion.intensity,
        userMessage.length
    );

    // 5. Verificar si debería terminar la conversación
    const shouldEnd = shouldEndConversation(updatedSession.fatigue);

    // 6. Calcular delay de respuesta
    const delayFactors: DelayFactors = {
        emotionalState: updatedSession.currentEmotion,
        fatigue: updatedSession.fatigue,
        messageComplexity: calculateMessageComplexity(userMessage),
        interestLevel: calculateInterestLevel(
            updatedSession.memory.tensionLevel,
            updatedSession.memory.positiveInteractions,
            updatedSession.memory.negativeInteractions,
            updatedSession.fatigue.messageCount
        )
    };

    const delayMs = calculateResponseDelay(delayFactors);

    // === PROCESOS AVANZADOS ===

    // 7a. Modificador circadiano (hora del día)
    const currentHour = new Date().getHours();
    const circadianMod = getCircadianModifier(currentHour);

    // 7b. Energía mental
    const mentalEnergy = calculateMentalEnergy(
        currentHour,
        updatedSession.fatigue.messageCount,
        updatedSession.currentEmotion.intensity,
        new Date().getDay()
    );
    const energyMods = getEnergyModifiers(mentalEnergy);

    // 7c. Check saturación
    const saturationOverride = checkSaturationOverride(mentalEnergy, updatedSession.fatigue.messageCount);

    // 7d. Analizar subtexto del mensaje del usuario
    const subtext = analyzeMessageSubtext(
        userMessage,
        conversationHistory.slice(-5).map(m => m.content)
    );

    // 7e. Distracción
    const distraction = calculateDistraction(currentHour, new Date().getDay());

    // 8. Obtener modificadores de fatiga
    const fatigueMods = getFatigueModifiers(updatedSession.fatigue);

    // 9. Construir prompt y generar respuesta
    const prompt = buildSimulationPrompt(
        profile,
        updatedSession,
        conversationHistory.slice(-5),
        fatigueMods
    );

    let responseMessage: string;

    if (saturationOverride) {
        // Respuesta genérica por saturación
        responseMessage = saturationOverride;
    } else if (shouldEnd) {
        // Generar mensaje de despedida
        const endings = getFatigueBasedEnding();
        responseMessage = endings[Math.floor(Math.random() * endings.length)];
    } else {
        responseMessage = await generateResponse(prompt, fatigueMods.maxMessageLength);

        // === POST-PROCESAMIENTO AVANZADO ===

        // Aplicar estrés
        responseMessage = applyStressToResponse(responseMessage, updatedSession.memory.tensionLevel);

        // Aplicar energía mental
        responseMessage = applyEnergyToResponse(responseMessage, energyMods);

        // Aplicar distracción
        responseMessage = applyDistraction(responseMessage, distraction.level);

        // Cognitive dissonance si hay conflicto
        if (updatedSession.memory.tensionLevel > 0.5) {
            responseMessage = applyCognitiveDissonance(responseMessage, updatedSession.memory.tensionLevel);
        }

        // Subtexto si hay emoción oculta
        if (subtext.hiddenEmotion) {
            const subtextResponse = addSubtextToResponse(
                responseMessage,
                subtext.hiddenEmotion,
                updatedSession.currentEmotion.intensity
            );
            responseMessage = subtextResponse.text;
        }
    }

    // 9. Actualizar timestamp y guardar
    updatedSession.lastMessageAt = new Date().toISOString();

    // Agregar a historial de emociones
    updatedSession.emotionHistory = [
        ...updatedSession.emotionHistory.slice(-9),
        updatedSession.currentEmotion
    ];

    // Guardar sesión
    await saveSession(updatedSession);

    console.log('[SimEngine] Respuesta generada:', {
        emotion: updatedSession.currentEmotion.primary,
        intensity: updatedSession.currentEmotion.intensity.toFixed(2),
        fatigue: updatedSession.fatigue.level.toFixed(2),
        delayMs
    });

    return {
        message: responseMessage,
        delayMs,
        session: updatedSession,
        shouldEndConversation: shouldEnd,
        endingReason: shouldEnd ? 'fatigue' : undefined
    };
}

/**
 * Analiza el impacto emocional de un mensaje usando Gemini
 */
async function analyzeEmotionalImpact(
    userMessage: string,
    currentEmotion: EmotionalState,
    profile: ExProfile
): Promise<{
    targetEmotion: PrimaryEmotion;
    intensity: number;
    valenceChange: number;
    isPositiveInteraction: boolean;
    keyMoment: string | null;
    tensionDelta: number;
}> {
    try {
        const prompt = buildEmotionAnalysisPrompt(userMessage, currentEmotion, profile);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200
            }
        });

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parsear JSON de la respuesta
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                targetEmotion: parsed.targetEmotion || 'neutral',
                intensity: Math.max(0, Math.min(1, parsed.intensity || 0.5)),
                valenceChange: Math.max(-0.5, Math.min(0.5, parsed.valenceChange || 0)),
                isPositiveInteraction: parsed.isPositiveInteraction ?? true,
                keyMoment: parsed.keyMoment || null,
                tensionDelta: Math.max(-0.2, Math.min(0.2, parsed.tensionDelta || 0))
            };
        }
    } catch (e) {
        console.warn('[SimEngine] Error analizando impacto emocional:', e);
    }

    // Fallback: mantener emoción actual
    return {
        targetEmotion: currentEmotion.primary,
        intensity: currentEmotion.intensity,
        valenceChange: 0,
        isPositiveInteraction: true,
        keyMoment: null,
        tensionDelta: 0
    };
}

/**
 * Actualiza el estado emocional basado en el impacto analizado
 */
function updateEmotionalState(
    current: EmotionalState,
    impact: {
        targetEmotion: PrimaryEmotion;
        intensity: number;
        valenceChange: number;
        isPositiveInteraction: boolean;
        keyMoment: string | null;
        tensionDelta: number;
    }
): EmotionalState {
    // Verificar si podemos hacer la transición
    const validTarget = findValidTransition(
        current.primary,
        impact.targetEmotion,
        impact.intensity,
        current.lastTransitionAt
    );

    const targetDimensions = getEmotionDimensions(validTarget);

    // Interpolar hacia el nuevo estado (no saltar directamente)
    const lerpFactor = 0.4; // 40% hacia el nuevo estado

    return {
        primary: validTarget,
        secondary: validTarget !== impact.targetEmotion ? impact.targetEmotion : undefined,
        intensity: current.intensity * (1 - lerpFactor) + impact.intensity * lerpFactor,
        valence: Math.max(-1, Math.min(1, current.valence + impact.valenceChange)),
        arousal: current.arousal * (1 - lerpFactor) + targetDimensions.arousal * lerpFactor,
        decayRate: current.decayRate,
        lastUpdated: new Date().toISOString(),
        lastTransitionAt: validTarget !== current.primary ? new Date().toISOString() : current.lastTransitionAt,
        triggerMessage: impact.keyMoment || undefined
    };
}

/**
 * Actualiza la memoria de conversación
 */
function updateConversationMemory(
    memory: SimulationSession['memory'],
    impact: {
        isPositiveInteraction: boolean;
        keyMoment: string | null;
        tensionDelta: number;
    },
    userMessage: string
): SimulationSession['memory'] {
    const updated = { ...memory };

    // Actualizar contadores
    if (impact.isPositiveInteraction) {
        updated.positiveInteractions++;
    } else {
        updated.negativeInteractions++;
    }

    // Actualizar tensión
    updated.tensionLevel = Math.max(0, Math.min(1, updated.tensionLevel + impact.tensionDelta));

    // Agregar momento clave si existe
    if (impact.keyMoment) {
        updated.keyMoments = [
            ...updated.keyMoments.slice(-4),
            impact.keyMoment
        ];
    }

    return updated;
}

/**
 * Genera la respuesta usando Gemini
 */
async function generateResponse(prompt: string, maxLength: number): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.8, // Más variabilidad para respuestas naturales
                maxOutputTokens: Math.ceil(maxLength / 3) // Aproximado
            }
        });

        const result = await model.generateContent(prompt);
        let response = result.response.text().trim();

        // Truncar si es muy largo
        if (response.length > maxLength) {
            response = response.substring(0, maxLength - 3) + '...';
        }

        return response;
    } catch (e) {
        console.error('[SimEngine] Error generando respuesta:', e);
        return 'perdón, me distraje un momento jaja';
    }
}

/**
 * Resetea la sesión de simulación
 */
export async function resetSession(profileId: string, userId: string): Promise<SimulationSession> {
    const storageKey = getSessionStorageKey(profileId);

    // Limpiar localStorage
    try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.removeItem(storageKey);
        } else if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync(storageKey);
        }
    } catch (e) {
        console.warn('[SimEngine] Error limpiando sesión:', e);
    }

    // Crear nueva sesión
    return createSimulationSession(profileId, userId);
}
