/**
 * latentStates.ts
 * 
 * Estados latentes: emociones que NO se ven pero afectan.
 * base (neutro) → latente (resentimiento) → activo (explota)
 */

// ============= TYPES =============

export interface LatentState {
    type: string;               // 'resentment', 'guilt', 'longing', 'distrust'
    intensity: number;          // 0-1
    triggers: string[];         // Palabras/temas que lo activan
    origin?: string;            // De dónde viene
    lastActivated?: Date;
    activationCount: number;
}

export interface LatentStateBank {
    states: LatentState[];
    thresholdForActivation: number;  // 0-1
}

export interface ActivationResult {
    activated: boolean;
    state?: LatentState;
    response?: string;
}

// ============= PREDEFINED LATENT STATES =============

export const COMMON_LATENT_STATES: Partial<LatentState>[] = [
    {
        type: 'resentment',
        triggers: ['siempre', 'nunca', 'otra vez', 'igual que antes'],
        intensity: 0.5
    },
    {
        type: 'jealousy',
        triggers: ['amigo', 'amiga', 'saliste', 'con quién', 'te vi'],
        intensity: 0.4
    },
    {
        type: 'abandonment_fear',
        triggers: ['me voy', 'necesito espacio', 'no sé si', 'cansado de'],
        intensity: 0.6
    },
    {
        type: 'guilt',
        triggers: ['por tu culpa', 'me hiciste', 'me prometiste'],
        intensity: 0.5
    },
    {
        type: 'longing',
        triggers: ['antes', 'cuando éramos', 'te acuerdas', 'extraño'],
        intensity: 0.3
    },
    {
        type: 'distrust',
        triggers: ['mentira', 'no te creo', 'seguro', 'en serio'],
        intensity: 0.4
    }
];

// ============= STATE MANAGEMENT =============

/**
 * Inicializa estados latentes según perfil
 */
export function initializeLatentStates(
    attachmentStyle: string,
    conflictHistory: number  // 0-1: cuánto conflicto ha habido
): LatentState[] {
    const states: LatentState[] = [];

    // Según estilo de apego, diferentes estados latentes
    if (attachmentStyle === 'ansioso') {
        states.push({
            type: 'abandonment_fear',
            intensity: 0.7,
            triggers: ['me voy', 'necesito tiempo', 'no sé', 'bye', 'hablamos después'],
            activationCount: 0
        });
        states.push({
            type: 'jealousy',
            intensity: 0.5,
            triggers: ['amiga', 'amigo', 'salí', 'fiesta', 'me escribió'],
            activationCount: 0
        });
    }

    if (attachmentStyle === 'evitativo') {
        states.push({
            type: 'overwhelm',
            intensity: 0.6,
            triggers: ['necesito que', 'tienes que', 'por qué no', 'explícame'],
            activationCount: 0
        });
    }

    // Resentimiento según historial de conflicto
    if (conflictHistory > 0.5) {
        states.push({
            type: 'resentment',
            intensity: conflictHistory * 0.8,
            triggers: ['siempre', 'nunca', 'otra vez', 'como siempre'],
            activationCount: 0
        });
    }

    return states;
}

// ============= TRIGGER CHECK =============

/**
 * Verifica si un mensaje activa un estado latente
 */
export function checkTriggers(
    message: string,
    latentStates: LatentState[],
    threshold: number = 0.5
): ActivationResult {
    const messageLower = message.toLowerCase();

    for (const state of latentStates) {
        if (state.intensity < threshold) continue;

        for (const trigger of state.triggers) {
            if (messageLower.includes(trigger.toLowerCase())) {
                // Aumentar intensidad al activarse
                state.intensity = Math.min(1, state.intensity + 0.1);
                state.lastActivated = new Date();
                state.activationCount++;

                return {
                    activated: true,
                    state: state,
                    response: generateTriggerResponse(state)
                };
            }
        }
    }

    return { activated: false };
}

/**
 * Genera respuesta cuando se activa un estado latente
 */
function generateTriggerResponse(state: LatentState): string {
    const responses: Record<string, string[]> = {
        'resentment': [
            'Aquí vamos de nuevo...',
            'Ya sabía que ibas a decir algo así',
            'Es increíble, siempre lo mismo',
            '*respira profundo*'
        ],
        'jealousy': [
            'Ah, ¿sí? Qué interesante.',
            '¿Y qué más?',
            'Mmm',
            '...'
        ],
        'abandonment_fear': [
            'Espera, ¿qué quieres decir?',
            'No entiendo',
            '¿Estás diciendo que...?',
            'O sea que básicamente me estás dejando'
        ],
        'guilt': [
            'Ah, entonces ahora es mi culpa',
            'Claro, yo soy el/la malo/a',
            'Ya, ¿qué más hice mal?'
        ],
        'overwhelm': [
            'Ya, ok',
            'Necesito un momento',
            'Es mucho',
            'Después hablamos'
        ],
        'distrust': [
            '¿En serio?',
            'Si tú lo dices...',
            'Ajá',
            'Mmm, ok'
        ]
    };

    const options = responses[state.type] || ['...'];
    return options[Math.floor(Math.random() * options.length)];
}

// ============= DECAY =============

/**
 * Los estados latentes decaen con el tiempo si no se activan
 */
export function decayLatentStates(
    states: LatentState[],
    hoursSinceLastInteraction: number
): LatentState[] {
    const decayRate = 0.01;  // 1% por hora

    return states.map(state => ({
        ...state,
        intensity: Math.max(0.1, state.intensity - (decayRate * hoursSinceLastInteraction))
    }));
}

// ============= ACCUMULATION =============

/**
 * Acumula tensión en estados latentes sin activarlos
 */
export function accumulateTension(
    states: LatentState[],
    negativeInteractionIntensity: number
): LatentState[] {
    return states.map(state => {
        // Diferentes estados acumulan diferente
        let accumulation = negativeInteractionIntensity * 0.05;

        // Resentimiento acumula más fácil
        if (state.type === 'resentment') {
            accumulation *= 1.5;
        }

        return {
            ...state,
            intensity: Math.min(1, state.intensity + accumulation)
        };
    });
}

// ============= EMOTIONAL THRESHOLD =============

/**
 * Calcula cuántos mensajes aguanta antes de explotar
 */
export function calculateToleranceThreshold(
    basePatience: number,  // 1-10 de personalidad
    currentStress: number,
    latentStates: LatentState[]
): number {
    let threshold = basePatience * 3;  // 3-30 mensajes base

    // Estrés reduce tolerancia
    threshold *= (1 - currentStress * 0.5);

    // Estados latentes intensos reducen tolerancia
    const maxLatentIntensity = Math.max(...latentStates.map(s => s.intensity), 0);
    threshold *= (1 - maxLatentIntensity * 0.3);

    return Math.max(2, Math.floor(threshold));
}
