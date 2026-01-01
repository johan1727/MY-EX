/**
 * FATIGUE SYSTEM
 * Sistema de cansancio cognitivo para simulación
 * 
 * Simula cómo las personas responden de forma más corta y menos elaborada
 * cuando llevan mucho tiempo en una conversación.
 */

import { FatigueState, SimulationSession, isNightTime, getCurrentHour } from './simulationState';

// Re-export FatigueState for convenience
export type { FatigueState } from './simulationState';

// ===== UMBRALES DE FATIGA =====
export const FATIGUE_THRESHOLDS = {
    NONE: 0,
    MILD: 0.25,
    MODERATE: 0.5,
    HIGH: 0.7,
    EXHAUSTED: 0.9
} as const;

// ===== MODIFICADORES DE RESPUESTA =====
export interface FatigueModifiers {
    maxMessageLength: number;      // Caracteres máximos
    emojiProbability: number;      // 0-1 probabilidad de usar emojis
    elaborationLevel: number;      // 0-1 cuánto desarrolla ideas
    responseDelayMultiplier: number; // 1 = normal, 2 = doble tiempo
    typoChance: number;            // 0-1 probabilidad de errores de tipeo
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Actualiza el estado de fatiga después de un mensaje
 */
export function updateFatigue(
    current: FatigueState,
    emotionalIntensity: number,
    userMessageLength: number
): FatigueState {
    // Impacto base por mensaje
    const messageImpact = 0.015;

    // Impacto adicional por intensidad emocional (conversaciones intensas cansan más)
    const emotionalImpact = emotionalIntensity * 0.025;

    // Impacto por complejidad de respuesta requerida
    const complexityImpact = Math.min(userMessageLength / 1000, 0.02);

    // Impacto por hora del día
    const hourImpact = isNightTime() ? 0.01 : 0;

    // Calcular nuevo nivel
    const totalImpact = messageImpact + emotionalImpact + complexityImpact + hourImpact;
    const newLevel = Math.min(1, current.level + totalImpact);

    // Detectar si alcanzamos pico
    const peakReached = newLevel >= FATIGUE_THRESHOLDS.HIGH;

    return {
        level: newLevel,
        messageCount: current.messageCount + 1,
        emotionalDrain: current.emotionalDrain + emotionalIntensity,
        peakReached: current.peakReached || peakReached,
        lastRest: current.lastRest
    };
}

/**
 * Aplica recuperación de fatiga basada en tiempo sin mensajes
 */
export function applyFatigueRecovery(
    current: FatigueState,
    timeSinceLastMessageMs: number
): FatigueState {
    // No recuperar si ha pasado poco tiempo
    if (timeSinceLastMessageMs < 60000) return current; // Mínimo 1 minuto

    // Recuperación gradual
    const minutesPassed = timeSinceLastMessageMs / 60000;

    // Recuperación más rápida si ha pasado mucho tiempo
    const recoveryRate = minutesPassed > 30 ? 0.02 : 0.01;
    const recovery = recoveryRate * minutesPassed;

    const newLevel = Math.max(0, current.level - recovery);

    return {
        ...current,
        level: newLevel,
        lastRest: timeSinceLastMessageMs > 300000 ? new Date().toISOString() : current.lastRest // Reset si > 5 min
    };
}

/**
 * Obtiene los modificadores de respuesta basados en fatiga y hora
 */
export function getFatigueModifiers(fatigue: FatigueState): FatigueModifiers {
    const hour = getCurrentHour();
    const isNight = isNightTime();

    // Modificadores base por nivel de fatiga
    let mods: FatigueModifiers;

    if (fatigue.level < FATIGUE_THRESHOLDS.MILD) {
        mods = {
            maxMessageLength: 350,
            emojiProbability: 0.85,
            elaborationLevel: 0.95,
            responseDelayMultiplier: 1,
            typoChance: 0.02
        };
    } else if (fatigue.level < FATIGUE_THRESHOLDS.MODERATE) {
        mods = {
            maxMessageLength: 250,
            emojiProbability: 0.65,
            elaborationLevel: 0.75,
            responseDelayMultiplier: 1.1,
            typoChance: 0.05
        };
    } else if (fatigue.level < FATIGUE_THRESHOLDS.HIGH) {
        mods = {
            maxMessageLength: 150,
            emojiProbability: 0.4,
            elaborationLevel: 0.5,
            responseDelayMultiplier: 1.25,
            typoChance: 0.08
        };
    } else if (fatigue.level < FATIGUE_THRESHOLDS.EXHAUSTED) {
        mods = {
            maxMessageLength: 80,
            emojiProbability: 0.2,
            elaborationLevel: 0.3,
            responseDelayMultiplier: 1.4,
            typoChance: 0.12
        };
    } else {
        mods = {
            maxMessageLength: 40,
            emojiProbability: 0.05,
            elaborationLevel: 0.15,
            responseDelayMultiplier: 1.6,
            typoChance: 0.15
        };
    }

    // Ajustar por hora de la noche
    if (isNight) {
        mods.maxMessageLength = Math.floor(mods.maxMessageLength * 0.8);
        mods.emojiProbability *= 0.7;
        mods.elaborationLevel *= 0.8;
        mods.responseDelayMultiplier *= 1.15;
        mods.typoChance = Math.min(0.2, mods.typoChance * 1.5);
    }

    return mods;
}

/**
 * Obtiene descripción textual del nivel de fatiga
 */
export function getFatigueLabel(fatigue: FatigueState): string {
    if (fatigue.level < FATIGUE_THRESHOLDS.MILD) return 'fresca';
    if (fatigue.level < FATIGUE_THRESHOLDS.MODERATE) return 'normal';
    if (fatigue.level < FATIGUE_THRESHOLDS.HIGH) return 'algo cansada';
    if (fatigue.level < FATIGUE_THRESHOLDS.EXHAUSTED) return 'cansada';
    return 'agotada';
}

/**
 * Determina si debería terminar la conversación por fatiga
 */
export function shouldEndConversation(fatigue: FatigueState): boolean {
    // Probabilidad de querer terminar aumenta con fatiga
    if (fatigue.level >= FATIGUE_THRESHOLDS.EXHAUSTED) {
        return Math.random() < 0.4; // 40% chance
    }
    if (fatigue.level >= FATIGUE_THRESHOLDS.HIGH) {
        return Math.random() < 0.15; // 15% chance
    }
    return false;
}

/**
 * Genera sugerencia de "terminar conversación" si corresponde
 */
export function getFatigueBasedEnding(): string[] {
    const endings = [
        "bueno, ya me voy a dormir",
        "oye tengo que hacer algo, hablamos luego",
        "ya me dio sueño, bye",
        "voy a dejar el cel un rato",
        "luego te escribo",
        "ok ya me voy"
    ];

    return endings;
}
