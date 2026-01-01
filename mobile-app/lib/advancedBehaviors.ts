/**
 * advancedBehaviors.ts
 * 
 * Comportamientos avanzados de simulación para hacer respuestas ultra-realistas.
 * Incluye: cognitive dissonance, circadian patterns, defense mechanisms, 
 * social behaviors (breadcrumbing, hot-cold, guilt-tripping, etc.)
 */

import { EmotionalState, SimulationSession } from './simulationState';

// ============= TYPES =============

export interface CircadianModifier {
    irritability: number;       // -1 to 1
    openness: number;           // -1 to 1
    energyLevel: number;        // 0 to 1
    verbosity: number;          // 0 to 1
}

export interface DefenseMechanism {
    type: 'denial' | 'projection' | 'rationalization' | 'deflection' | 'sarcasm';
    trigger: string;
    response: string;
}

export interface SocialBehavior {
    type: string;
    probability: number;    // 0 to 1
    modifier: string;       // Text to add/modify
}

export type AttachmentStyle = 'seguro' | 'ansioso' | 'evitativo' | 'desorganizado';

// ============= CIRCADIAN PATTERNS =============

/**
 * Calcula modificadores de humor según hora del día
 * - Mañana temprano: irritable, baja energía
 * - Mediodía: neutro
 * - Tarde: más abierto
 * - Noche: vulnerable, cariñoso
 * - Madrugada: errático
 */
export function getCircadianModifier(hour: number): CircadianModifier {
    // Mañana temprano (5-9): irritable, baja energía
    if (hour >= 5 && hour < 9) {
        return {
            irritability: 0.3,
            openness: -0.2,
            energyLevel: 0.4,
            verbosity: 0.5
        };
    }

    // Mañana (9-12): normal
    if (hour >= 9 && hour < 12) {
        return {
            irritability: 0,
            openness: 0,
            energyLevel: 0.8,
            verbosity: 0.7
        };
    }

    // Tarde (12-18): más energía
    if (hour >= 12 && hour < 18) {
        return {
            irritability: -0.1,
            openness: 0.2,
            energyLevel: 0.9,
            verbosity: 0.8
        };
    }

    // Noche (18-23): más abierto, vulnerable
    if (hour >= 18 && hour < 23) {
        return {
            irritability: -0.2,
            openness: 0.4,
            energyLevel: 0.6,
            verbosity: 0.9
        };
    }

    // Madrugada (23-5): errático, vulnerable
    return {
        irritability: 0.1,
        openness: 0.5,
        energyLevel: 0.3,
        verbosity: 0.6
    };
}

// ============= COGNITIVE DISSONANCE =============

/**
 * Aplica contradicción sutil cuando hay conflicto emocional interno
 * Ej: "Te amo... bueno, o sea, no sé" cuando hay ambivalencia
 */
export function applyCognitiveDissonance(
    response: string,
    emotionalConflict: number  // 0-1
): string {
    if (emotionalConflict < 0.4) return response;

    const dissonanceMarkers = [
        '... bueno, o sea, no sé',
        ', aunque realmente...',
        '... ay no sé',
        ', pero tampoco es como que...',
        '... whatever',
        ', bueno no importa',
        '... forget it'
    ];

    // Mayor conflicto = mayor probabilidad de contradicción
    if (Math.random() < emotionalConflict * 0.5) {
        const marker = dissonanceMarkers[Math.floor(Math.random() * dissonanceMarkers.length)];

        // Insertar en medio o al final
        if (response.length > 50 && Math.random() > 0.5) {
            const midPoint = Math.floor(response.length * 0.6);
            const insertPoint = response.indexOf(' ', midPoint);
            if (insertPoint > 0) {
                return response.slice(0, insertPoint) + marker + response.slice(insertPoint);
            }
        }
        return response + marker;
    }

    return response;
}

// ============= STRESS ACCUMULATION =============

/**
 * Actualiza nivel de estrés acumulado
 */
export function updateStressLevel(
    currentStress: number,
    messageImpact: number,  // -1 (calma) to 1 (estresa)
    timeSinceLastMessage: number  // minutos
): number {
    // El estrés decae con el tiempo
    const decayRate = 0.02;  // 2% por minuto
    const decayedStress = currentStress * Math.max(0, 1 - (decayRate * timeSinceLastMessage));

    // Agregar impacto del mensaje actual
    const newStress = Math.max(0, Math.min(1, decayedStress + messageImpact * 0.15));

    return newStress;
}

/**
 * Modifica respuesta según nivel de estrés
 */
export function applyStressToResponse(response: string, stressLevel: number): string {
    if (stressLevel < 0.3) return response;

    // Alto estrés = respuestas más cortas y secas
    if (stressLevel > 0.7) {
        // Eliminar emojis
        response = response.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
        // Acortar si es muy largo
        if (response.length > 100) {
            const sentences = response.split(/[.!?]+/);
            return sentences[0] + '.';
        }
    }

    return response;
}

// ============= DEFENSE MECHANISMS =============

/**
 * Detecta si se activó un mecanismo de defensa
 */
export function detectDefenseMechanism(
    userMessage: string,
    attachmentStyle: AttachmentStyle,
    stressLevel: number
): DefenseMechanism | null {
    const messageLower = userMessage.toLowerCase();

    // Triggers comunes
    const accusationTriggers = ['siempre', 'nunca', 'por tu culpa', 'tú eres'];
    const vulnerabilityTriggers = ['te extraño', 'me haces falta', 'te necesito'];
    const abandonmentTriggers = ['ya no', 'me voy', 'terminamos', 'bye'];

    // Según estilo de apego, diferentes defensas
    if (attachmentStyle === 'evitativo') {
        if (vulnerabilityTriggers.some(t => messageLower.includes(t))) {
            return {
                type: 'deflection',
                trigger: 'vulnerability',
                response: 'Ay, no seas exagerado/a'
            };
        }
    }

    if (attachmentStyle === 'ansioso' && stressLevel > 0.5) {
        if (abandonmentTriggers.some(t => messageLower.includes(t))) {
            return {
                type: 'projection',
                trigger: 'abandonment',
                response: 'Tú eres el/la que siempre [proyección]'
            };
        }
    }

    if (stressLevel > 0.6 && accusationTriggers.some(t => messageLower.includes(t))) {
        const defenses = ['denial', 'rationalization', 'sarcasm'] as const;
        return {
            type: defenses[Math.floor(Math.random() * defenses.length)],
            trigger: 'accusation',
            response: ''
        };
    }

    return null;
}

// ============= SOCIAL BEHAVIORS =============

/**
 * Breadcrumbing: Respuestas vagas que mantienen interés
 */
export function applyBreadcrumbing(response: string, probability: number): string {
    if (Math.random() > probability) return response;

    const breadcrumbs = [
        'Ya te cuento después',
        'Luego te explico',
        'Es largo de contar',
        'Después hablamos bien',
        'Ahorita no puedo pero...',
        'Te debo la explicación'
    ];

    return breadcrumbs[Math.floor(Math.random() * breadcrumbs.length)];
}

/**
 * Hot-Cold Dynamics: Alternar entre interesado y distante
 */
export function calculateHotColdState(
    recentInteractionQuality: number,  // -1 to 1
    daysSinceLastPositive: number,
    attachmentStyle: AttachmentStyle
): 'hot' | 'cold' | 'neutral' {
    // Evitativo tiende a cold después de mucha intimidad
    if (attachmentStyle === 'evitativo' && recentInteractionQuality > 0.7) {
        return 'cold';
    }

    // Ansioso tiende a hot cuando siente distancia
    if (attachmentStyle === 'ansioso' && daysSinceLastPositive > 2) {
        return 'hot';
    }

    return 'neutral';
}

/**
 * Guilt-Tripping: Manipulación emocional (solo si apego ansioso)
 */
export function applyGuiltTripping(
    response: string,
    attachmentStyle: AttachmentStyle,
    perceivedRejection: number  // 0-1
): string {
    if (attachmentStyle !== 'ansioso' || perceivedRejection < 0.5) {
        return response;
    }

    if (Math.random() < perceivedRejection * 0.3) {
        const guiltPhrases = [
            'Pero bueno, si no quieres...',
            'Ya sé que no te importo tanto',
            'Siempre es igual contigo',
            'No sé por qué me esfuerzo',
            'Está bien, no te preocupes por mí'
        ];
        return response + ' ' + guiltPhrases[Math.floor(Math.random() * guiltPhrases.length)];
    }

    return response;
}

/**
 * Vulnerability Hangover: Distante después de abrirse
 */
export function checkVulnerabilityHangover(
    previousMessages: { content: string; wasVulnerable: boolean }[]
): number {
    // Buscar vulnerabilidad reciente
    const recentVulnerable = previousMessages
        .slice(-5)
        .filter(m => m.wasVulnerable);

    if (recentVulnerable.length === 0) return 0;

    // Distancia proporcional a cuán reciente fue la vulnerabilidad
    const lastVulnerableIndex = previousMessages.findIndex(m => m.wasVulnerable);
    const recency = 1 - (lastVulnerableIndex / previousMessages.length);

    return recency * 0.5;  // 0-0.5 modifier
}

// ============= EMOTIONAL GRANULARITY =============

/**
 * Refina emoción base a variación más específica
 */
export function refineEmotion(
    baseEmotion: string,
    intensity: number,
    context: 'conflict' | 'intimacy' | 'casual'
): string {
    const emotionVariations: Record<string, { low: string; mid: string; high: string }> = {
        'sad': { low: 'melancólico', mid: 'desanimado', high: 'desolado' },
        'angry': { low: 'molesto', mid: 'frustrado', high: 'furioso' },
        'happy': { low: 'contento', mid: 'feliz', high: 'eufórico' },
        'anxious': { low: 'inquieto', mid: 'nervioso', high: 'angustiado' },
        'hurt': { low: 'herido', mid: 'dolido', high: 'destrozado' }
    };

    const variations = emotionVariations[baseEmotion];
    if (!variations) return baseEmotion;

    if (intensity < 0.33) return variations.low;
    if (intensity < 0.66) return variations.mid;
    return variations.high;
}

// ============= SPLIT ATTENTION =============

/**
 * Simula que está distraído/ocupado
 */
export function calculateDistraction(
    hour: number,
    dayOfWeek: number  // 0=Sunday
): { level: number; reason?: string } {
    // Trabajo (lunes-viernes 9-18)
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWorkHour = hour >= 9 && hour < 18;

    if (isWorkday && isWorkHour) {
        return { level: 0.6, reason: 'trabajo' };
    }

    // Comidas
    if ((hour >= 13 && hour < 15) || (hour >= 20 && hour < 22)) {
        return { level: 0.4, reason: 'comiendo' };
    }

    // Madrugada
    if (hour >= 0 && hour < 6) {
        return { level: 0.2, reason: 'cansado' };
    }

    return { level: 0, reason: undefined };
}

export function applyDistraction(response: string, distractionLevel: number): string {
    if (distractionLevel < 0.3) return response;

    // Acortar respuesta
    if (response.length > 50 && distractionLevel > 0.5) {
        const words = response.split(' ');
        const shortVersion = words.slice(0, Math.ceil(words.length * 0.5)).join(' ');
        return shortVersion + (Math.random() > 0.5 ? '...' : '');
    }

    return response;
}

// ============= DELAYED EMOTIONAL PROCESSING =============

export interface PendingReaction {
    emotion: string;
    intensity: number;
    triggerMessage: string;
    messageCountdown: number;  // Cuántos mensajes faltan para reaccionar
}

/**
 * Verifica si hay reacción pendiente que debe activarse
 */
export function checkDelayedReaction(
    pendingReactions: PendingReaction[]
): PendingReaction | null {
    const ready = pendingReactions.find(r => r.messageCountdown <= 0);
    return ready || null;
}

/**
 * Crea una reacción retardada
 */
export function createDelayedReaction(
    emotion: string,
    intensity: number,
    triggerMessage: string
): PendingReaction {
    // Retraso de 1-3 mensajes según intensidad
    const delay = Math.ceil((1 - intensity) * 3) + 1;
    return {
        emotion,
        intensity,
        triggerMessage,
        messageCountdown: delay
    };
}
