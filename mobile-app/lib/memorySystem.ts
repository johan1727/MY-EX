/**
 * memorySystem.ts
 * 
 * Memoria selectiva e "injustamente humana".
 * Recuerda lo que dolió, olvida lo irrelevante, distorsiona para justificarse.
 */

// ============= TYPES =============

export interface MemoryItem {
    content: string;
    timestamp: Date;
    emotionalWeight: number;    // 0-1: qué tan emocionalmente cargado
    emotionType: 'positive' | 'negative' | 'neutral';
    mentioned: number;          // Veces que se ha recordado
    distortedVersion?: string;  // Versión distorsionada por sesgo
}

export interface MemoryBank {
    items: MemoryItem[];
    maxSize: number;
    forgettingRate: number;     // 0-1: qué tan rápido olvida
}

// ============= SELECTIVE RECALL =============

/**
 * Decide qué recuerdos son accesibles según estado emocional actual
 */
export function selectiveRecall(
    memories: MemoryItem[],
    currentEmotion: string,
    emotionIntensity: number
): MemoryItem[] {
    const accessible: MemoryItem[] = [];

    for (const memory of memories) {
        // Probabilidad base de recordar
        let recallProbability = memory.emotionalWeight * 0.5;

        // Sesgo de congruencia emocional
        // Si estoy triste, recuerdo más cosas tristes
        if (currentEmotion === 'sad' || currentEmotion === 'hurt') {
            if (memory.emotionType === 'negative') {
                recallProbability += 0.3;
            } else if (memory.emotionType === 'positive') {
                recallProbability -= 0.2;
            }
        }

        // Si estoy feliz, acceso a recuerdos positivos
        if (currentEmotion === 'happy' || currentEmotion === 'loving') {
            if (memory.emotionType === 'positive') {
                recallProbability += 0.3;
            }
        }

        // Si estoy enojado, recuerdo agravios
        if (currentEmotion === 'angry' || currentEmotion === 'resentful') {
            if (memory.emotionType === 'negative') {
                recallProbability += 0.4;
            }
        }

        // Recuerdos muy emocionales siempre más accesibles
        if (memory.emotionalWeight > 0.8) {
            recallProbability += 0.2;
        }

        // Recuerdos mencionados frecuentemente más accesibles
        if (memory.mentioned > 3) {
            recallProbability += 0.15;
        }

        // Antigüedad reduce acceso (forgetting curve)
        const ageInDays = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const agePenalty = Math.min(0.3, ageInDays * 0.01);
        recallProbability -= agePenalty;

        if (Math.random() < recallProbability) {
            accessible.push(memory);
        }
    }

    return accessible;
}

// ============= MEMORY DISTORTION =============

type BiasType = 'self_serving' | 'negativity' | 'positivity' | 'victimization';

/**
 * Distorsiona un recuerdo según sesgo
 */
export function distortMemory(
    originalFact: string,
    biasType: BiasType,
    intensity: number  // 0-1
): string {
    if (intensity < 0.3) return originalFact;

    switch (biasType) {
        case 'self_serving':
            // Minimiza responsabilidad propia
            return applyDistortion(originalFact, [
                { find: /yo.*dije/i, replace: 'mencioné' },
                { find: /me enojé/i, replace: 'me molesté un poco' },
                { find: /grité/i, replace: 'levanté la voz' },
                { find: /olvidé/i, replace: 'no me acordé bien' }
            ]);

        case 'negativity':
            // Recuerda peor de lo que fue
            return applyDistortion(originalFact, [
                { find: /un poco/i, replace: 'muy' },
                { find: /molesto/i, replace: 'furioso' },
                { find: /dijo/i, replace: 'me gritó' },
                { find: /comentó/i, replace: 'reclamó' }
            ]);

        case 'positivity':
            // Recuerda mejor de lo que fue
            return applyDistortion(originalFact, [
                { find: /discutimos/i, replace: 'platicamos' },
                { find: /enojado/i, replace: 'serio' },
                { find: /problema/i, replace: 'situación' }
            ]);

        case 'victimization':
            // Se posiciona como víctima
            return applyDistortion(originalFact, [
                { find: /me dijo/i, replace: 'me atacó diciendo' },
                { find: /respondí/i, replace: 'solo me defendí' },
                { find: /pasó/i, replace: 'me hizo' }
            ]);
    }

    return originalFact;
}

function applyDistortion(
    text: string,
    replacements: { find: RegExp; replace: string }[]
): string {
    let result = text;
    for (const { find, replace } of replacements) {
        result = result.replace(find, replace);
    }
    return result;
}

// ============= FORGETTING =============

/**
 * Aplica olvido selectivo a la memoria
 * Las cosas sin carga emocional se olvidan más rápido
 */
export function applyForgetting(
    memories: MemoryItem[],
    forgettingRate: number
): MemoryItem[] {
    return memories.filter(memory => {
        // Nunca olvidar recuerdos muy emocionales
        if (memory.emotionalWeight > 0.8) return true;

        // Probabilidad de olvidar aumenta con el tiempo
        const ageInDays = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const forgetProbability = forgettingRate * (ageInDays / 30) * (1 - memory.emotionalWeight);

        return Math.random() > forgetProbability;
    });
}

// ============= INCONSISTENT MEMORY =============

/**
 * A veces recuerda cosas "mal" - inconsistencia humana
 */
export function createInconsistentRecall(
    original: string,
    inconsistencyLevel: number  // 0-1
): string {
    if (Math.random() > inconsistencyLevel * 0.3) {
        return original;
    }

    const inconsistencies = [
        // Cambiar detalles menores
        { pattern: /lunes/gi, replacement: 'martes' },
        { pattern: /martes/gi, replacement: 'miércoles' },
        { pattern: /3/g, replacement: '4' },
        { pattern: /5/g, replacement: '6' },
        { pattern: /mañana/gi, replacement: 'tarde' },
        { pattern: /café/gi, replacement: 'restaurante' }
    ];

    // Aplicar una inconsistencia aleatoria
    const toApply = inconsistencies[Math.floor(Math.random() * inconsistencies.length)];
    return original.replace(toApply.pattern, toApply.replacement);
}

// ============= REMEMBER WRONGS =============

/**
 * Recuerda errores ajenos más que propios
 */
export function getRelevantGrievances(
    memories: MemoryItem[],
    targetPerson: 'self' | 'other'
): MemoryItem[] {
    return memories.filter(m => {
        if (targetPerson === 'other') {
            // Recuerda más los errores del otro
            return m.emotionType === 'negative' && Math.random() < 0.7;
        } else {
            // Recuerda menos los errores propios
            return m.emotionType === 'negative' && Math.random() < 0.3;
        }
    });
}
