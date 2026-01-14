/**
 * AI Content Moderation
 * Google Play compliance for apps with generative AI
 * Required: In-app reporting for AI-generated content
 */

import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface FlaggedContent {
    message_id: string;
    content: string;
    user_id: string;
    context: 'ex_simulator' | 'analysis' | 'coach';
    reason?: string;
    timestamp: string;
}

/**
 * Report inappropriate AI-generated content
 * Required by Google Play AI policy
 */
export async function reportAIContent(
    messageId: string,
    content: string,
    context: 'ex_simulator' | 'analysis' | 'coach',
    userId: string,
    reason?: string
): Promise<boolean> {
    try {
        const { error } = await supabase.from('ai_flagged_content').insert({
            message_id: messageId,
            content: content,
            user_id: userId,
            context: context,
            reason: reason || 'user_flagged',
            timestamp: new Date().toISOString(),
        });

        if (error) {
            console.error('Error reporting AI content:', error);
            return false;
        }

        // Show success message
        Alert.alert(
            'Gracias por tu reporte',
            'Tu reporte ha sido recibido. Revisaremos este contenido y mejoraremos nuestros filtros de IA.\n\nTu feedback nos ayuda a mantener Remi seguro y útil para todos.',
            [{ text: 'OK' }]
        );

        return true;
    } catch (error) {
        console.error('Exception reporting AI content:', error);
        return false;
    }
}

/**
 * Show AI disclaimer (required on first use)
 */
export function showAIDisclaimer(onAccept: () => void) {
    Alert.alert(
        '🤖 Acerca de la Inteligencia Artificial',
        'Remi utiliza Google Gemini para generar respuestas.\n\n' +
        '• Las respuestas son simulaciones basadas en tus datos\n' +
        '• Pueden no ser 100% precisas\n' +
        '• Esto es una herramienta de sanación, no terapia profesional\n' +
        '• Puedes reportar cualquier respuesta inapropiada\n\n' +
        '¿Entiendes y aceptas continuar?',
        [
            {
                text: 'No',
                style: 'cancel',
            },
            {
                text: 'Sí, entiendo',
                onPress: onAccept,
            },
        ]
    );
}

/**
 * Check if user has seen AI disclaimer
 */
export async function hasSeenAIDisclaimer(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('ai_disclaimer_seen')
            .eq('user_id', userId)
            .single();

        if (error) return false;
        return data?.ai_disclaimer_seen === true;
    } catch (error) {
        return false;
    }
}

/**
 * Mark AI disclaimer as seen
 */
export async function markAIDisclaimerSeen(userId: string): Promise<void> {
    try {
        await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                ai_disclaimer_seen: true,
                updated_at: new Date().toISOString(),
            });
    } catch (error) {
        console.error('Error marking AI disclaimer seen:', error);
    }
}
