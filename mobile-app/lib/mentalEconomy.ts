/**
 * mentalEconomy.ts
 * 
 * Economía del esfuerzo mental.
 * Las personas no siempre "piensan bonito" - simula cansancio real.
 */

// ============= TYPES =============

export interface MentalEnergyState {
    level: number;          // 0-1
    cause: 'cansado' | 'motivado' | 'saturado' | 'normal';
}

export interface EnergyModifiers {
    messageLength: number;      // Multiplier 0.3-1.5
    emojiUsage: number;         // Multiplier 0-1
    typoRate: number;           // 0-0.3
    elaboration: number;        // 0-1
    askQuestionsBack: boolean;
}

// ============= ENERGY CALCULATION =============

/**
 * Calcula energía mental actual
 */
export function calculateMentalEnergy(
    hour: number,
    messageCountInSession: number,
    emotionalLoadAverage: number,  // 0-1
    dayOfWeek: number  // 0=Sunday
): MentalEnergyState {
    let baseEnergy = 0.7;  // Neutral

    // Hora del día
    if (hour >= 6 && hour < 10) {
        baseEnergy = 0.5;  // Mañana = menos energía
    } else if (hour >= 10 && hour < 14) {
        baseEnergy = 0.9;  // Mediodía = pico
    } else if (hour >= 14 && hour < 17) {
        baseEnergy = 0.6;  // Post-comida = bajón
    } else if (hour >= 17 && hour < 21) {
        baseEnergy = 0.8;  // Tarde = segundo pico
    } else if (hour >= 21 || hour < 2) {
        baseEnergy = 0.5;  // Noche = cansancio
    } else {
        baseEnergy = 0.3;  // Madrugada = muy bajo
    }

    // Día de la semana
    if (dayOfWeek === 1) {  // Lunes
        baseEnergy *= 0.85;
    } else if (dayOfWeek === 5) {  // Viernes
        baseEnergy *= 1.1;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {  // Fin de semana
        baseEnergy *= 1.05;
    }

    // Fatiga por conversación larga
    const conversationFatigue = Math.min(0.3, messageCountInSession * 0.01);
    baseEnergy -= conversationFatigue;

    // Carga emocional drena energía
    const emotionalDrain = emotionalLoadAverage * 0.2;
    baseEnergy -= emotionalDrain;

    // Clamp
    const finalEnergy = Math.max(0.1, Math.min(1, baseEnergy));

    // Determinar causa
    let cause: MentalEnergyState['cause'] = 'normal';
    if (finalEnergy < 0.3) {
        cause = 'cansado';
    } else if (finalEnergy > 0.8) {
        cause = 'motivado';
    } else if (messageCountInSession > 40) {
        cause = 'saturado';
    }

    return { level: finalEnergy, cause };
}

// ============= APPLY ENERGY TO RESPONSE =============

/**
 * Obtiene modificadores según energía
 */
export function getEnergyModifiers(energy: MentalEnergyState): EnergyModifiers {
    const { level, cause } = energy;

    // Cansado: corto, menos emojis, más typos
    if (cause === 'cansado' || level < 0.3) {
        return {
            messageLength: 0.4,
            emojiUsage: 0.2,
            typoRate: 0.15,
            elaboration: 0.2,
            askQuestionsBack: false
        };
    }

    // Saturado: genérico, abrupto
    if (cause === 'saturado') {
        return {
            messageLength: 0.5,
            emojiUsage: 0.3,
            typoRate: 0.1,
            elaboration: 0.3,
            askQuestionsBack: false
        };
    }

    // Motivado: largo, preguntas, engagement
    if (cause === 'motivado' || level > 0.8) {
        return {
            messageLength: 1.3,
            emojiUsage: 1,
            typoRate: 0.02,
            elaboration: 0.9,
            askQuestionsBack: true
        };
    }

    // Normal
    return {
        messageLength: 1,
        emojiUsage: 0.7,
        typoRate: 0.05,
        elaboration: 0.6,
        askQuestionsBack: Math.random() > 0.5
    };
}

/**
 * Aplica modificadores de energía a la respuesta
 */
export function applyEnergyToResponse(
    response: string,
    modifiers: EnergyModifiers
): string {
    let modified = response;

    // Acortar si baja energía
    if (modifiers.messageLength < 0.7 && modified.length > 60) {
        const words = modified.split(' ');
        const targetLength = Math.ceil(words.length * modifiers.messageLength);
        modified = words.slice(0, targetLength).join(' ');

        // Agregar indicador de corte
        if (!modified.endsWith('.') && !modified.endsWith('...')) {
            modified += Math.random() > 0.5 ? '...' : '';
        }
    }

    // Reducir emojis si baja energía
    if (modifiers.emojiUsage < 0.5) {
        // Remover algunos emojis
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu;
        const emojis = modified.match(emojiRegex) || [];

        if (emojis.length > 0) {
            const keepCount = Math.ceil(emojis.length * modifiers.emojiUsage);
            let removed = 0;
            modified = modified.replace(emojiRegex, (match) => {
                if (removed >= emojis.length - keepCount) {
                    return match;
                }
                removed++;
                return '';
            });
        }
    }

    // Agregar typos ocasionales
    if (modifiers.typoRate > 0 && Math.random() < modifiers.typoRate) {
        modified = addRandomTypo(modified);
    }

    return modified.trim();
}

/**
 * Agrega un typo realista
 */
function addRandomTypo(text: string): string {
    const typoTypes = [
        // Letras duplicadas
        (s: string) => {
            const i = Math.floor(Math.random() * s.length);
            return s.slice(0, i) + s[i] + s.slice(i);
        },
        // Letras faltantes
        (s: string) => {
            const i = Math.floor(Math.random() * s.length);
            return s.slice(0, i) + s.slice(i + 1);
        },
        // Letras intercambiadas
        (s: string) => {
            const i = Math.floor(Math.random() * (s.length - 1));
            return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
        }
    ];

    // Solo aplicar a una palabra
    const words = text.split(' ');
    if (words.length < 2) return text;

    const wordIndex = Math.floor(Math.random() * words.length);
    const word = words[wordIndex];

    if (word.length < 3) return text;  // No modificar palabras cortas

    const typoFn = typoTypes[Math.floor(Math.random() * typoTypes.length)];
    words[wordIndex] = typoFn(word);

    return words.join(' ');
}

// ============= SATURATION INDICATORS =============

/**
 * Respuestas genéricas cuando está saturado
 */
export const SATURATED_RESPONSES = [
    'jaja sí',
    'va',
    'ok',
    'sí',
    'ajá',
    'ándale',
    'ps sí',
    'ya ví',
    'ah ok',
    'está bien'
];

/**
 * Si está saturado, puede reemplazar respuesta por algo genérico
 */
export function checkSaturationOverride(
    energy: MentalEnergyState,
    messageCountRecent: number
): string | null {
    if (energy.cause !== 'saturado') return null;

    // 30% chance de respuesta genérica si saturado
    if (Math.random() < 0.3) {
        return SATURATED_RESPONSES[Math.floor(Math.random() * SATURATED_RESPONSES.length)];
    }

    return null;
}
