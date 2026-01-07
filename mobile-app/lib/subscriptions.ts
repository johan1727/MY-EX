import { supabase } from './supabase';

export enum SubscriptionTier {
    SURVIVOR = 'survivor',
    EXPLORER = 'explorer',
    WARRIOR = 'warrior',
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
            '30 mensajes al día',
            '10 mensajes cada 3 horas',
            'Una prueba del simulador'
        ],
        limits: {
            dailyTokens: 9000,
            messageDecoder: 3,
            moodJournal: true,
            analytics: 'none',
            panicButton: 'basic',
            notifications: 0,
            vault: false,
            exportDiary: false,
            simulatorAnalyses: 1,
            simulatorChatMessages: 20
        }
    },
    [SubscriptionTier.EXPLORER]: {
        name: 'Explorer',
        price: 4.99,
        yearlyPrice: 40,
        badge: 'Explorer',
        color: '#06b6d4',
        features: [
            '150 mensajes al día',
            '50 mensajes cada 3 horas',
            'Crea múltiples perfiles de ex',
            'Decodificador avanzado',
            'Bóveda de secretos privada',
            'Exporta tu diario emocional'
        ],
        limits: {
            dailyTokens: 45000,
            messageDecoder: 50,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 75,
            vault: true,
            exportDiary: true,
            simulatorAnalyses: 50,
            simulatorChatMessages: 100
        }
    },
    [SubscriptionTier.WARRIOR]: {
        name: 'Warrior',
        price: 9.99,
        yearlyPrice: 80,
        badge: 'Warrior',
        color: '#3b82f6',
        features: [
            '500 mensajes al día',
            '150 mensajes cada 3 horas',
            'Uso extendido sin interrupciones',
            'Respuestas más largas y detalladas',
            'Análisis diario de tu progreso'
        ],
        limits: {
            dailyTokens: 150000,
            messageDecoder: 200,
            moodJournal: true,
            analytics: 'weekly',
            panicButton: 'advanced',
            notifications: 200,
            vault: true,
            exportDiary: true,
            simulatorAnalyses: 200,
            simulatorChatMessages: 500
        }
    },
    [SubscriptionTier.PHOENIX]: {
        name: 'Phoenix',
        price: 24.99,
        yearlyPrice: 150,
        badge: 'Phoenix',
        color: '#ec4899',
        features: [
            '2000 mensajes al día',
            '400 mensajes cada 3 horas',
            'Coaching personalizado con IA avanzada',
            'Análisis de capturas de pantalla',
            'Predicciones de comportamiento',
            'Soporte VIP prioritario 24/7'
        ],
        limits: {
            dailyTokens: 600000,
            messageDecoder: 1000,
            moodJournal: true,
            analytics: 'daily',
            panicButton: 'advanced',
            notifications: -1,
            vault: true,
            exportDiary: true,
            coachingSessions: true,
            prioritySupport: true,
            earlyAccess: true,
            simulatorAnalyses: 1000,
            simulatorChatMessages: 2000
        }
    }
};

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status, subscription_expires_at')
            .eq('id', userId)
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
