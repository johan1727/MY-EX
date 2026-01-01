/**
 * conversationDegradation.ts
 * 
 * Las conversaciones reales mueren naturalmente.
 * Simula degradación: respuestas más cortas, menos engagement, "jaja" vacío.
 */

// ============= TYPES =============

export interface DegradationState {
    level: number;              // 0-1: qué tan degradada está la conversación
    cause: 'natural' | 'conflict' | 'boredom' | 'exhaustion';
    turnsWithoutEngagement: number;
    lastMeaningfulExchange: number;
}

export interface DegradationModifiers {
    shortenResponse: number;    // 0-1
    removeEmojis: boolean;
    useGenericResponse: boolean;
    askQuestionsBack: boolean;
    addElaboration: boolean;
}

// ============= DEGRADATION CALCULATION =============

/**
 * Calcula nivel de degradación de la conversación
 */
export function calculateDegradation(
    messageCountInSession: number,
    engagementScores: number[],  // Últimos N mensajes, 0-1 cada uno
    timeSinceStart: number,      // Minutos
    emotionalIntensity: number   // 0-1
): DegradationState {
    let degradation = 0;
    let cause: DegradationState['cause'] = 'natural';

    // Degradación natural por tiempo/cantidad
    const timeFactor = Math.min(0.3, timeSinceStart / 120);  // Max 30% por 2 horas
    const countFactor = Math.min(0.3, messageCountInSession / 50);  // Max 30% por 50 msgs
    degradation += timeFactor + countFactor;

    // Engagement bajo acelera degradación
    const avgEngagement = engagementScores.length > 0
        ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
        : 0.5;

    if (avgEngagement < 0.3) {
        degradation += 0.2;
        cause = 'boredom';
    }

    // Intensidad emocional alta previene degradación
    if (emotionalIntensity > 0.6) {
        degradation *= 0.5;  // Más emoción = menos degradación
    }

    // Turnos sin engagement real
    const turnsWithoutEngagement = countLowEngagementStreak(engagementScores);
    if (turnsWithoutEngagement > 5) {
        degradation += 0.15;
        cause = 'exhaustion';
    }

    return {
        level: Math.min(1, degradation),
        cause,
        turnsWithoutEngagement,
        lastMeaningfulExchange: findLastMeaningful(engagementScores)
    };
}

function countLowEngagementStreak(scores: number[]): number {
    let streak = 0;
    for (let i = scores.length - 1; i >= 0; i--) {
        if (scores[i] < 0.3) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function findLastMeaningful(scores: number[]): number {
    for (let i = scores.length - 1; i >= 0; i--) {
        if (scores[i] > 0.6) return scores.length - i;
    }
    return scores.length;
}

// ============= APPLY DEGRADATION =============

/**
 * Obtiene modificadores según nivel de degradación
 */
export function getDegradationModifiers(state: DegradationState): DegradationModifiers {
    const { level } = state;

    // Baja degradación: normal
    if (level < 0.3) {
        return {
            shortenResponse: 0,
            removeEmojis: false,
            useGenericResponse: false,
            askQuestionsBack: true,
            addElaboration: true
        };
    }

    // Media degradación: señales sutiles
    if (level < 0.6) {
        return {
            shortenResponse: 0.3,
            removeEmojis: Math.random() < 0.3,
            useGenericResponse: Math.random() < 0.2,
            askQuestionsBack: Math.random() < 0.5,
            addElaboration: Math.random() < 0.3
        };
    }

    // Alta degradación: conversación muriendo
    return {
        shortenResponse: 0.6,
        removeEmojis: true,
        useGenericResponse: Math.random() < 0.5,
        askQuestionsBack: false,
        addElaboration: false
    };
}

/**
 * Aplica modificadores de degradación a la respuesta
 */
export function applyDegradation(
    response: string,
    modifiers: DegradationModifiers
): string {
    let modified = response;

    // Usar respuesta genérica
    if (modifiers.useGenericResponse) {
        return getGenericResponse();
    }

    // Acortar respuesta
    if (modifiers.shortenResponse > 0) {
        modified = shortenText(modified, modifiers.shortenResponse);
    }

    // Quitar emojis
    if (modifiers.removeEmojis) {
        modified = modified.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu, '');
    }

    // Quitar elaboración (cortar después del punto)
    if (!modifiers.addElaboration && modified.includes('.')) {
        const firstSentence = modified.split('.')[0];
        modified = firstSentence + '.';
    }

    return modified.trim();
}

function shortenText(text: string, factor: number): string {
    const words = text.split(' ');
    const keepCount = Math.ceil(words.length * (1 - factor));

    if (keepCount < words.length) {
        return words.slice(0, keepCount).join(' ');
    }
    return text;
}

// ============= GENERIC RESPONSES =============

const DYING_CONVERSATION_RESPONSES = [
    'jaja',
    'jaja sí',
    'sí',
    'ajá',
    'mm',
    'ya',
    'ok',
    'va',
    'jajaj',
    'ah ok',
    'ándale',
    'ps sí',
    'bueno',
    '👍',
    'jaja ya'
];

function getGenericResponse(): string {
    return DYING_CONVERSATION_RESPONSES[
        Math.floor(Math.random() * DYING_CONVERSATION_RESPONSES.length)
    ];
}

// ============= CONVERSATION REVIVAL =============

/**
 * Detecta si hubo un intento de revivir la conversación
 */
export function detectRevivalAttempt(
    message: string,
    previousDegradation: number
): boolean {
    const messageLower = message.toLowerCase();

    // Señales de intento de revivir
    const revivalSignals = [
        'oye',
        'hey',
        'qué haces',
        'en qué andas',
        'te cuento',
        'sabes qué',
        'a que no sabes',
        '?'  // Preguntas
    ];

    // Si degradación alta y señal de revival
    if (previousDegradation > 0.5) {
        return revivalSignals.some(signal => messageLower.includes(signal));
    }

    return false;
}

/**
 * Si hay intento de revival exitoso, reduce degradación
 */
export function attemptRevival(
    currentDegradation: DegradationState,
    revivalQuality: number  // 0-1: qué tan bueno es el intento
): DegradationState {
    if (revivalQuality > 0.6) {
        return {
            ...currentDegradation,
            level: Math.max(0, currentDegradation.level - 0.4),
            turnsWithoutEngagement: 0
        };
    }

    // Revival parcial
    if (revivalQuality > 0.3) {
        return {
            ...currentDegradation,
            level: Math.max(0, currentDegradation.level - 0.2)
        };
    }

    // Revival fallido
    return currentDegradation;
}

// ============= MICRO-RITUALS =============

/**
 * Patrones de cierre de conversación según personalidad
 */
export function getClosingPattern(
    personalityType: 'warm' | 'cold' | 'casual'
): string[] {
    switch (personalityType) {
        case 'warm':
            return ['bueno, te dejo', 'descansa', 'cuídate ❤️', 'besos'];
        case 'cold':
            return ['bueno', 'ya', 'bye', 'ok bye'];
        case 'casual':
            return ['va pues', 'al rato', 'ahi hablamos', 'luego te escribo'];
    }
}

/**
 * Detecta si la conversación debería terminar naturalmente
 */
export function shouldEndConversation(
    degradation: DegradationState,
    messageCount: number,
    hourOfDay: number
): { shouldEnd: boolean; reason?: string } {
    // Alta degradación = debería terminar
    if (degradation.level > 0.8) {
        return { shouldEnd: true, reason: 'natural_end' };
    }

    // Hora tardía + degradación media
    if (hourOfDay >= 23 && degradation.level > 0.5) {
        return { shouldEnd: true, reason: 'late_hour' };
    }

    // Muchos mensajes sin engagement
    if (degradation.turnsWithoutEngagement > 8) {
        return { shouldEnd: true, reason: 'no_engagement' };
    }

    return { shouldEnd: false };
}
