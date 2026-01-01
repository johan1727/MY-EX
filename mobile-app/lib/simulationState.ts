/**
 * SIMULATION STATE
 * Sistema de estados emocionales dinámicos para simulación de conversaciones vivas
 * 
 * Este módulo define las interfaces y funciones para mantener el estado
 * emocional de una simulación a través de múltiples mensajes.
 */

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
