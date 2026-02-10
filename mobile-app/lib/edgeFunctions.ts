import { supabase } from './supabase';

export async function generateChatResponse(userMessage: string, systemPrompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 30000) // 30s timeout
    );

    try {
        console.log('[EdgeFunctions] Generating response via Supabase...');

        // Call Supabase Edge Function instead of Gemini directly
        const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

        const apiCall = supabase.functions.invoke('chat-ai', {
            body: {
                message: fullPrompt,
                model: 'gemini-2.0-flash'
            }
        });

        const { data, error } = await Promise.race([
            apiCall,
            timeoutPromise
        ]);

        if (error) {
            console.error('[EdgeFunctions] Supabase function error:', error);
            throw new Error(error.message || 'Error de conexión con el backend');
        }

        if (!data || !data.text) {
            throw new Error('Respuesta inválida del servidor');
        }

        console.log('[EdgeFunctions] Response generated successfully');
        return data.text;
    } catch (error: any) {
        if (error.message === 'TIMEOUT') {
            console.error('[EdgeFunctions] Request timed out');
            throw new Error('La respuesta está tardando demasiado. Intenta de nuevo en unos segundos.');
        }
        console.error('[EdgeFunctions] Error generating response:', error);
        throw error;
    }
}
