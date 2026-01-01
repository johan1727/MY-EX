/**
 * USE SIMULATION ENGINE HOOK
 * 
 * Hook que integra el nuevo sistema de simulación con la UI existente.
 * Proporciona una interfaz simple para usar el motor de simulación.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    SimulationSession,
    getOrCreateSession,
    saveSession,
    processUserMessage,
    resetSession
} from './simulationEngine';
import { ExProfile } from './exSimulator';

export interface UseSimulationEngineOptions {
    profileId: string;
    userId: string | null;
    profile: ExProfile | null;
}

export interface SimulationState {
    session: SimulationSession | null;
    isTyping: boolean;
    typingStartedAt: number | null;
    delayMs: number;
}

export function useSimulationEngine(options: UseSimulationEngineOptions) {
    const { profileId, userId, profile } = options;

    const [session, setSession] = useState<SimulationSession | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingDelay, setTypingDelay] = useState(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cargar sesión al montar
    useEffect(() => {
        if (profileId && userId) {
            getOrCreateSession(profileId, userId)
                .then(setSession)
                .catch(e => console.error('[useSimEngine] Error loading session:', e));
        }
    }, [profileId, userId]);

    /**
     * Procesa un mensaje del usuario y devuelve la respuesta con delay
     */
    const sendMessage = useCallback(async (
        userMessage: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<{
        response: string;
        delayMs: number;
        shouldEnd: boolean;
        emotionalState: string;
        fatigueLevel: number;
    } | null> => {
        if (!session || !profile) {
            console.warn('[useSimEngine] No session or profile available');
            return null;
        }

        try {
            const result = await processUserMessage(
                userMessage,
                profile,
                session,
                conversationHistory
            );

            // Actualizar sesión local
            setSession(result.session);
            setTypingDelay(result.delayMs);

            return {
                response: result.message,
                delayMs: result.delayMs,
                shouldEnd: result.shouldEndConversation,
                emotionalState: result.session.currentEmotion.primary,
                fatigueLevel: result.session.fatigue.level
            };
        } catch (error) {
            console.error('[useSimEngine] Error processing message:', error);
            return null;
        }
    }, [session, profile]);

    /**
     * Inicia el efecto de "escribiendo" con el delay calculado
     */
    const startTypingEffect = useCallback((delayMs: number): Promise<void> => {
        return new Promise((resolve) => {
            setIsTyping(true);
            setTypingDelay(delayMs);

            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                resolve();
            }, delayMs);
        });
    }, []);

    /**
     * Cancela el efecto de escribiendo
     */
    const cancelTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        setIsTyping(false);
    }, []);

    /**
     * Resetea la sesión de simulación
     */
    const reset = useCallback(async () => {
        if (profileId && userId) {
            const newSession = await resetSession(profileId, userId);
            setSession(newSession);
        }
    }, [profileId, userId]);

    /**
     * Obtiene información del estado actual
     */
    const getEmotionalInfo = useCallback(() => {
        if (!session) return null;

        return {
            emotion: session.currentEmotion.primary,
            intensity: session.currentEmotion.intensity,
            fatigue: session.fatigue.level,
            messageCount: session.fatigue.messageCount,
            tensionLevel: session.memory.tensionLevel
        };
    }, [session]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return {
        // Estado
        session,
        isTyping,
        typingDelay,

        // Acciones
        sendMessage,
        startTypingEffect,
        cancelTyping,
        reset,

        // Helpers
        getEmotionalInfo,

        // Estado emocional directo (para UI)
        emotionalState: session?.currentEmotion.primary || 'neutral',
        fatigueLevel: session?.fatigue.level || 0,
        messageCount: session?.fatigue.messageCount || 0
    };
}

export default useSimulationEngine;
