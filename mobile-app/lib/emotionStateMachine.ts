/**
 * EMOTION STATE MACHINE
 * Sistema de transiciones emocionales válidas
 * 
 * Evita saltos irreales de emoción (ej: de neutral a loving sin transición)
 */

import { PrimaryEmotion, EmotionalState } from './simulationState';

// ===== GRAFO DE TRANSICIONES VÁLIDAS =====
// Define qué emociones pueden seguir a cuáles
const EMOTION_TRANSITIONS: Record<PrimaryEmotion, PrimaryEmotion[]> = {
    'neutral': ['happy', 'annoyed', 'sad', 'excited', 'loving'],
    'happy': ['neutral', 'loving', 'excited', 'annoyed'],
    'excited': ['happy', 'neutral', 'annoyed'],
    'loving': ['happy', 'neutral', 'jealous', 'vulnerable', 'sad'],
    'annoyed': ['neutral', 'defensive', 'angry', 'sad'],
    'defensive': ['withdrawn', 'angry', 'annoyed', 'neutral'],
    'angry': ['defensive', 'withdrawn', 'sad', 'annoyed'],
    'withdrawn': ['neutral', 'sad', 'defensive'],
    'sad': ['neutral', 'withdrawn', 'vulnerable', 'annoyed'],
    'jealous': ['annoyed', 'defensive', 'sad', 'angry', 'loving'],
    'vulnerable': ['sad', 'loving', 'withdrawn', 'neutral']
};

// Tiempo mínimo entre transiciones (evita ping-pong emocional)
const MIN_TRANSITION_INTERVAL_MS = 15000; // 15 segundos

// Intensidad mínima para cambiar de estado
const TRANSITION_THRESHOLD = 0.35;

// ===== MAPEO EMOCIÓN → VALENCE/AROUSAL =====
const EMOTION_DIMENSIONS: Record<PrimaryEmotion, { valence: number; arousal: number }> = {
    'neutral': { valence: 0, arousal: 0.3 },
    'happy': { valence: 0.7, arousal: 0.6 },
    'excited': { valence: 0.8, arousal: 0.9 },
    'loving': { valence: 0.9, arousal: 0.5 },
    'annoyed': { valence: -0.4, arousal: 0.5 },
    'defensive': { valence: -0.5, arousal: 0.7 },
    'angry': { valence: -0.8, arousal: 0.9 },
    'withdrawn': { valence: -0.3, arousal: 0.2 },
    'sad': { valence: -0.6, arousal: 0.3 },
    'jealous': { valence: -0.5, arousal: 0.7 },
    'vulnerable': { valence: -0.2, arousal: 0.4 }
};

// ===== FUNCIONES PRINCIPALES =====

/**
 * Verifica si una transición emocional es válida
 */
export function canTransition(
    from: PrimaryEmotion,
    to: PrimaryEmotion,
    intensity: number,
    lastTransitionTime: string
): boolean {
    // Mismo estado siempre es válido
    if (from === to) return true;

    // Verificar grafo de transiciones
    const allowedTargets = EMOTION_TRANSITIONS[from] || [];
    if (!allowedTargets.includes(to)) return false;

    // Verificar intensidad mínima
    if (intensity < TRANSITION_THRESHOLD) return false;

    // Verificar tiempo mínimo entre transiciones
    const timeSinceLastTransition = Date.now() - new Date(lastTransitionTime).getTime();
    if (timeSinceLastTransition < MIN_TRANSITION_INTERVAL_MS) return false;

    return true;
}

/**
 * Encuentra el mejor estado de transición válido hacia el objetivo
 */
export function findValidTransition(
    current: PrimaryEmotion,
    target: PrimaryEmotion,
    intensity: number,
    lastTransitionTime: string
): PrimaryEmotion {
    // Si podemos ir directo, ir directo
    if (canTransition(current, target, intensity, lastTransitionTime)) {
        return target;
    }

    // Si no, buscar estado intermedio
    const currentAllowed = EMOTION_TRANSITIONS[current] || [];
    const targetAllowed = Object.entries(EMOTION_TRANSITIONS)
        .filter(([_, targets]) => targets.includes(target))
        .map(([from]) => from as PrimaryEmotion);

    // Encontrar intersección (estados que pueden conectar current → X → target)
    const intermediates = currentAllowed.filter(e => targetAllowed.includes(e));

    if (intermediates.length > 0) {
        // Elegir el intermedio más cercano en valence/arousal
        return findClosestEmotion(intermediates, target);
    }

    // Si no hay camino, quedarse en current
    return current;
}

/**
 * Encuentra la emoción más cercana dimensionalmente
 */
function findClosestEmotion(options: PrimaryEmotion[], target: PrimaryEmotion): PrimaryEmotion {
    const targetDim = EMOTION_DIMENSIONS[target];

    let closest = options[0];
    let minDistance = Infinity;

    for (const option of options) {
        const optionDim = EMOTION_DIMENSIONS[option];
        const distance = Math.sqrt(
            Math.pow(targetDim.valence - optionDim.valence, 2) +
            Math.pow(targetDim.arousal - optionDim.arousal, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closest = option;
        }
    }

    return closest;
}

/**
 * Aplica decay emocional (volver hacia neutral con el tiempo)
 */
export function applyEmotionalDecay(
    state: EmotionalState,
    timeSinceLastMessageMs: number
): EmotionalState {
    // No aplicar decay si ha pasado poco tiempo
    if (timeSinceLastMessageMs < 30000) return state; // 30 segundos mínimo

    // Calcular decay basado en tiempo y tasa
    const minutesPassed = timeSinceLastMessageMs / 60000;
    const decayAmount = state.decayRate * minutesPassed * 0.1;

    // Reducir intensidad
    const newIntensity = Math.max(0.2, state.intensity - decayAmount);

    // Mover valence y arousal hacia neutral
    const neutralDim = EMOTION_DIMENSIONS['neutral'];
    const valenceDecay = (neutralDim.valence - state.valence) * decayAmount;
    const arousalDecay = (neutralDim.arousal - state.arousal) * decayAmount;

    // Si intensidad es muy baja, cambiar a neutral
    let newPrimary = state.primary;
    if (newIntensity < 0.25 && state.primary !== 'neutral') {
        newPrimary = 'neutral';
    }

    return {
        ...state,
        primary: newPrimary,
        intensity: newIntensity,
        valence: state.valence + valenceDecay,
        arousal: state.arousal + arousalDecay,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Obtiene valence y arousal para una emoción
 */
export function getEmotionDimensions(emotion: PrimaryEmotion): { valence: number; arousal: number } {
    return EMOTION_DIMENSIONS[emotion] || EMOTION_DIMENSIONS['neutral'];
}

/**
 * Determina la emoción basada en valence y arousal
 */
export function emotionFromDimensions(valence: number, arousal: number): PrimaryEmotion {
    let closest: PrimaryEmotion = 'neutral';
    let minDistance = Infinity;

    for (const [emotion, dim] of Object.entries(EMOTION_DIMENSIONS)) {
        const distance = Math.sqrt(
            Math.pow(valence - dim.valence, 2) +
            Math.pow(arousal - dim.arousal, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closest = emotion as PrimaryEmotion;
        }
    }

    return closest;
}

/**
 * Obtiene label descriptivo del estado emocional
 */
export function getEmotionLabel(state: EmotionalState): string {
    const intensityLabel = state.intensity < 0.3 ? 'levemente' :
        state.intensity < 0.6 ? '' :
            state.intensity < 0.8 ? 'muy' : 'extremadamente';

    const emotionLabels: Record<PrimaryEmotion, string> = {
        'neutral': 'tranquila',
        'happy': 'feliz',
        'excited': 'emocionada',
        'loving': 'cariñosa',
        'annoyed': 'molesta',
        'defensive': 'a la defensiva',
        'angry': 'enojada',
        'withdrawn': 'distante',
        'sad': 'triste',
        'jealous': 'celosa',
        'vulnerable': 'vulnerable'
    };

    return `${intensityLabel} ${emotionLabels[state.primary]}`.trim();
}
