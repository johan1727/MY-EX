import { supabase } from './supabase';

export enum SubscriptionTier {
    SURVIVOR = 'survivor',
    STARTER = 'starter',
    EXPLORER = 'explorer',
    WARRIOR = 'warrior',
    PREMIUM = 'premium',
    PHOENIX = 'phoenix'
}

export interface SubscriptionLimits {
    dailyTokens: number; // -1 = unlimited
    messageDecoder: number; // per week, -1 = unlimited
    moodJournal: boolean;
    analytics: 'none' | 'weekly' | 'daily';
    panicButton: 'basic' | 'advanced';
    notifications: number; // per week, -1 = unlimited
    vault: boolean;
    exportDiary: boolean;
    coachingSessions?: boolean;
    prioritySupport?: boolean;
    earlyAccess?: boolean;
    simulatorAnalyses: number; // per month, -1 = unlimited, 0 = none
    simulatorChatMessages: number; // per conversation, -1 = unlimited
}

export const SUBSCRIPTION_CONFIG: Record<SubscriptionTier, {
    name: string;
    price: number;
    yearlyPrice: number;
    badge: string;
    color: string;
    features: string[];
    limits: SubscriptionLimits;
}> = {
    [SubscriptionTier.SURVIVOR]: {
        name: 'Gratuito',
        price: 0,
        yearlyPrice: 0,
        badge: 'Survivor',
        color: '#9ca3af',
        features: [
            'Límite de tokens básico',
            'Memoria de conversación a corto plazo',
            'Acceso al simulador estándar'
        ],
        limits: {
            dailyTokens: 2000,
            messageDecoder: 1,
            moodJournal: true,
            analytics: 'none',
            panicButton: 'basic',
            notifications: 0,
            vault: false,
            exportDiary: false,
            simulatorAnalyses: 1, // FREE: 1 try
            simulatorChatMessages: 10 // Limited messages to hook
        }
    },
    [SubscriptionTier.STARTER]: {
        name: 'Starter',
        price: 2.49,
        yearlyPrice: 20,
        badge: 'Starter',
        color: '#10b981',
        features: [
            'Respuestas mejoradas',
            'Memoria de conversación básica',
            'Acceso al decodificador (2/semana)',
            'Análisis semanal'
        ],
        limits: {
            dailyTokens: 5000,
            messageDecoder: 2,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'basic',
            notifications: 2,
            vault: false,
            exportDiary: false,
            simulatorAnalyses: 3, // 3 analyses/month
            simulatorChatMessages: -1 // Unlimited chat
        }
    },
    [SubscriptionTier.EXPLORER]: {
        name: 'Explorer',
        price: 4.99,
        yearlyPrice: 40,
        badge: 'Explorer',
        color: '#06b6d4',
        features: [
            'Respuestas rápidas',
            'Memoria extendida',
            'Decodificador ilimitado',
            'Bóveda de secretos',
            'Exportar diario'
        ],
        limits: {
            dailyTokens: 8000,
            messageDecoder: 5,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 5,
            vault: true,
            exportDiary: true,
            simulatorAnalyses: 10,
            simulatorChatMessages: -1
        }
    },
    [SubscriptionTier.WARRIOR]: {
        name: 'Warrior',
        price: 9.99,
        yearlyPrice: 80,
        badge: 'Warrior',
        color: '#3b82f6',
        features: [
            'Respuestas rápidas y empáticas',
            'Memoria de conversación extendida',
            'Análisis diario de progreso',
            'Acceso prioritario al simulador'
        ],
        limits: {
            dailyTokens: 10000,
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 5,
            vault: true,
            exportDiary: true,
            simulatorAnalyses: -1,
            simulatorChatMessages: -1
        }
    },
    [SubscriptionTier.PREMIUM]: {
        name: 'Premium',
        price: 14.99,
        yearlyPrice: 100,
        badge: 'Premium',
        color: '#8b5cf6',
        features: [
            'Todo lo de Warrior incluido',
            'Detección de patrones de comportamiento',
            'Simulaciones de escenarios complejos',
            'Prioridad de respuesta alta',
            'Historial de chat con mayor contexto'
        ],
        limits: {
            dailyTokens: 50000,
            messageDecoder: 5,
            moodJournal: true,
            analytics: 'daily',
            panicButton: 'advanced',
            notifications: 10,
            vault: true,
            exportDiary: true,
            prioritySupport: true,
            simulatorAnalyses: -1,
            simulatorChatMessages: -1
        }
    },
    [SubscriptionTier.PHOENIX]: {
        name: 'Phoenix',
        price: 24.99,
        yearlyPrice: 150,
        badge: 'Phoenix',
        color: '#ec4899',
        features: [
            'Todo lo de Premium incluido',
            'Interacción por voz y audio',
            'Análisis de capturas de pantalla',
            'Predicciones de comportamiento avanzadas',
            'Coaching 1:1 via chat prioritario'
        ],
        limits: {
            dailyTokens: -1,
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'daily',
            panicButton: 'advanced',
            notifications: -1,
            vault: true,
            exportDiary: true,
            coachingSessions: true,
            prioritySupport: true,
            earlyAccess: true,
            simulatorAnalyses: -1, // Unlimited
            simulatorChatMessages: -1
        }
    }
};

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status, subscription_expires_at')
            .eq('user_id', userId)
            .single();

        if (!data || data.subscription_status !== 'active') {
            return SubscriptionTier.SURVIVOR;
        }

        // Check if subscription has expired
        if (data.subscription_expires_at) {
            const expiresAt = new Date(data.subscription_expires_at);
            if (expiresAt < new Date()) {
                // Subscription expired, downgrade to free
                await supabase
                    .from('profiles')
                    .update({
                        subscription_tier: SubscriptionTier.SURVIVOR,
                        subscription_status: 'expired'
                    })
                    .eq('user_id', userId);

                return SubscriptionTier.SURVIVOR;
            }
        }

        return data.subscription_tier as SubscriptionTier;
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        return SubscriptionTier.SURVIVOR;
    }
}
