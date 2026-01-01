/**
 * RESPONSE DELAY SYSTEM
 * Sistema de delays variables para respuestas más humanas
 * 
 * Delays entre 2-6 segundos basados en emoción, fatiga, interés y hora
 */

import { EmotionalState, PrimaryEmotion, isNightTime } from './simulationState';
import { FatigueState } from './fatigue';

// ===== CONFIGURACIÓN DE DELAYS =====
const MIN_DELAY_MS = 2000; // 2 segundos mínimo
const MAX_DELAY_MS = 6000; // 6 segundos máximo

// Delays base por emoción (min, max en ms)
const EMOTION_DELAYS: Record<PrimaryEmotion, [number, number]> = {
    'happy': [2000, 3500],       // Responde rápido cuando feliz
    'excited': [1800, 3000],     // Muy rápido cuando emocionada
    'loving': [2500, 4000],      // Piensa bien lo que dice
    'neutral': [2500, 4500],     // Normal
    'annoyed': [3500, 5500],     // Más lento, pensando qué decir
    'defensive': [3000, 5000],   // Variable
    'angry': [2000, 4000],       // Respuesta reactiva rápida
    'withdrawn': [4500, 6000],   // Tarda mucho, no quiere hablar
    'sad': [3500, 5500],         // Lento, sin energía
    'jealous': [2500, 4500],     // Normal a lento
    'vulnerable': [3000, 5000]   // Pensando mucho
};

// ===== INTERFAZ =====
export interface DelayFactors {
    emotionalState: EmotionalState;
    fatigue: FatigueState;
    messageComplexity: number;    // 0-1 basado en longitud del mensaje del usuario
    interestLevel: number;        // 0-1 qué tan interesada está
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Calcula el delay de respuesta basado en múltiples factores
 * Garantiza que esté entre 2-6 segundos
 */
export function calculateResponseDelay(factors: DelayFactors): number {
    const { emotionalState, fatigue, messageComplexity, interestLevel } = factors;

    // 1. Obtener rango base por emoción
    const [emotionMin, emotionMax] = EMOTION_DELAYS[emotionalState.primary] || [2500, 4500];

    // 2. Generar delay base aleatorio dentro del rango
    let delay = emotionMin + Math.random() * (emotionMax - emotionMin);

    // 3. Ajustar por intensidad emocional (emociones fuertes → más rápido o más lento según tipo)
    const intensityFactor = emotionalState.intensity;
    if (emotionalState.valence > 0) {
        // Emociones positivas + intensas = más rápido
        delay *= (1 - intensityFactor * 0.2);
    } else {
        // Emociones negativas + intensas = más lento
        delay *= (1 + intensityFactor * 0.15);
    }

    // 4. Ajustar por fatiga
    delay *= (1 + fatigue.level * 0.3);

    // 5. Ajustar por complejidad del mensaje (mensajes largos = más tiempo pensando)
    delay *= (1 + messageComplexity * 0.2);

    // 6. Ajustar por interés (menos interés = más lento)
    delay *= (1.3 - interestLevel * 0.3);

    // 7. Ajustar por hora nocturna
    if (isNightTime()) {
        delay *= 1.15;
    }

    // 8. Añadir variación aleatoria (±10%)
    const variation = 0.9 + Math.random() * 0.2;
    delay *= variation;

    // 9. Clampear al rango permitido (2s - 6s)
    return Math.round(Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, delay)));
}

/**
 * Calcula la complejidad de un mensaje (0-1)
 */
export function calculateMessageComplexity(message: string): number {
    const length = message.length;

    // Longitud contribuye
    const lengthScore = Math.min(length / 500, 1);

    // Preguntas contribuyen
    const questionCount = (message.match(/\?/g) || []).length;
    const questionScore = Math.min(questionCount * 0.15, 0.3);

    // Palabras emocionales/importantes contribuyen
    const emotionalWords = ['siento', 'amor', 'odio', 'extraño', 'perdón', 'celos', 'triste', 'feliz'];
    const emotionalScore = emotionalWords.some(w => message.toLowerCase().includes(w)) ? 0.2 : 0;

    return Math.min(1, lengthScore + questionScore + emotionalScore);
}

/**
 * Calcula el nivel de interés basado en el historial de la conversación
 */
export function calculateInterestLevel(
    tensionLevel: number,
    positiveInteractions: number,
    negativeInteractions: number,
    messageCount: number
): number {
    // Base de interés
    let interest = 0.6;

    // Tensión aumenta interés (drama es interesante)
    interest += tensionLevel * 0.2;

    // Interacciones positivas aumentan interés
    const positiveRatio = messageCount > 0 ? positiveInteractions / messageCount : 0;
    interest += positiveRatio * 0.15;

    // Muchas interacciones negativas reducen interés
    const negativeRatio = messageCount > 0 ? negativeInteractions / messageCount : 0;
    interest -= negativeRatio * 0.2;

    // Conversaciones muy largas reducen interés
    if (messageCount > 30) {
        interest -= (messageCount - 30) * 0.01;
    }

    return Math.max(0.2, Math.min(1, interest));
}

/**
 * Ejecuta el delay con la posibilidad de cancelar
 */
export function createDelayedResponse(
    delayMs: number,
    onTypingStart: () => void,
    onTypingEnd: () => void
): { promise: Promise<void>; cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const promise = new Promise<void>((resolve) => {
        // Empezar a "escribir" inmediatamente
        onTypingStart();

        timeoutId = setTimeout(() => {
            if (!cancelled) {
                onTypingEnd();
                resolve();
            }
        }, delayMs);
    });

    const cancel = () => {
        cancelled = true;
        clearTimeout(timeoutId);
        onTypingEnd();
    };

    return { promise, cancel };
}

/**
 * Formatea el delay para mostrar al desarrollador
 */
export function formatDelay(delayMs: number): string {
    return `${(delayMs / 1000).toFixed(1)}s`;
}
