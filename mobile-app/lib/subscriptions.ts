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
            'Explora REMI gratis',
            '30 mensajes cada 8 horas',
            'Una prueba del simulador'
        ],
        limits: {
            dailyTokens: 6000,
            messageDecoder: 3,
            moodJournal: true,
            analytics: 'none',
            panicButton: 'basic',
            notifications: 0,
            vault: false,
            exportDiary: false,
            simulatorAnalyses: 1,
            simulatorChatMessages: 30
        }
    },
    [SubscriptionTier.STARTER]: {
        name: 'Starter',
        price: 2.49,
        yearlyPrice: 20,
        badge: 'Starter',
        color: '#10b981',
        features: [
            'Chatea con REMI sobre tu proceso',
            '450 mensajes cada 8 horas',
            'Simula conversaciones con tu ex',
            'Decodificador de mensajes semanal'
        ],
        limits: {
            dailyTokens: 75000, // x5
            messageDecoder: 30, // x5
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'basic',
            notifications: 30, // x5
            vault: false,
            exportDiary: false,
            simulatorAnalyses: 45, // x5
            simulatorChatMessages: -1
        }
    },
    [SubscriptionTier.EXPLORER]: {
        name: 'Explorer',
        price: 4.99,
        yearlyPrice: 40,
        badge: 'Explorer',
        color: '#06b6d4',
        features: [
            '750 mensajes cada 8 horas',
            'Crea múltiples perfiles de ex',
            'Decodificador ilimitado',
            'Bóveda de secretos privada',
            'Exporta tu diario emocional'
        ],
        limits: {
            dailyTokens: 120000, // x5
            messageDecoder: 75, // x5
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 75, // x5
            vault: true,
            exportDiary: true,
            simulatorAnalyses: 150, // x5
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
            '1,500 mensajes cada 8 horas',
            'Uso extendido sin interrupciones',
            'Respuestas más largas y detalladas',
            'Análisis diario de tu progreso'
        ],
        limits: {
            dailyTokens: 150000, // x5
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 75,
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
            '4,500 mensajes cada 8 horas',
            'Contexto profundo en cada chat',
            'Detección inteligente de red flags',
            'Simulaciones de escenarios complejos',
            'Acceso beta a nuevas funciones'
        ],
        limits: {
            dailyTokens: 750000, // x5
            messageDecoder: -1,
            moodJournal: true,
            analytics: 'daily',
            panicButton: 'advanced',
            notifications: 150, // x5
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
            '✨ Sin límites de mensajes',
            'Coaching personalizado con IA avanzada',
            'Análisis de capturas de pantalla',
            'Predicciones de comportamiento',
            'Soporte VIP prioritario 24/7'
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
            simulatorAnalyses: -1,
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
