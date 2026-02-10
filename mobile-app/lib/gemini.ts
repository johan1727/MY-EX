import { supabase } from './supabase';

/**
 * Main function to chat with Gemini via Edge Function (Secure)
 */
export async function sendMessageToAGI(
    message: string,
    imageBase64?: string | null,
    userId?: string,
    previousMessages: any[] = [],
    conversationId?: string
) {
    try {
        console.log('[Gemini] Invoking mobile-chat edge function...');

        const { data, error } = await supabase.functions.invoke('mobile-chat', {
            body: {
                message,
                imageBase64,
                userId,
                previousMessages,
                conversationId
            }
        });

        if (error) {
            console.error('[Gemini] Edge Function Error:', error);
            throw new Error(error.message || 'Error connecting to AI service');
        }

        return {
            text: data.text,
            suggestedReplies: data.suggestedReplies || [],
            error: null
        };

    } catch (error: any) {
        console.error('[Gemini] Client Error:', error);
        return {
            text: 'Lo siento, tuve un problema de conexión. Por favor intenta de nuevo.',
            suggestedReplies: [],
            error: error.message
        };
    }
}

/**
 * Check for crisis keywords locally (Immediate check)
 */
export function checkForCrisisKeywords(message: string) {
    const keywords = ['suicid', 'matarme', 'morir', 'acabar con todo', 'no quiero vivir'];
    const isCrisis = keywords.some(k => message.toLowerCase().includes(k));

    if (isCrisis) {
        return {
            isCrisis: true,
            resources: `🆘 Estoy preocupado por ti. Por favor busca ayuda inmediata:
- Línea de la Vida (México): 800 911 2000
- Emergencias: 911
- Habla con alguien de confianza ahora mismo.`
        };
    }
    return { isCrisis: false };
}
