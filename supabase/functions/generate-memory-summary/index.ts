// Edge Function: generate-memory-summary
// Generates long-term memory summaries from conversation history
// Using Gemini API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createGeminiClient, generateWithRetry } from '../_shared/gemini-client.ts';
import type { GenerateMemorySummaryRequest, GenerateMemorySummaryResponse } from '../_shared/types.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { messages, exName }: GenerateMemorySummaryRequest = await req.json();

        console.log('[generate-memory-summary] Request received:', {
            messageCount: messages.length,
            exName
        });

        // Validate required fields
        if (!messages || messages.length === 0 || !exName) {
            throw new Error('Missing required fields: messages, exName');
        }

        // Take last 50 messages for analysis
        const recentMessages = messages.slice(-50).map(m =>
            `${m.role === 'user' ? 'Usuario' : exName}: ${m.content}`
        ).join('\n');

        const prompt = `Analiza esta conversación y extrae los puntos MÁS IMPORTANTES que ${exName} debería recordar para futuras conversaciones.

Extrae en máximo 8 bullets los siguientes tipos de información:
- Nombres mencionados (personas, lugares, mascotas)
- Fechas o eventos importantes mencionados
- Planes futuros o cosas pendientes
- Promesas o acuerdos hechos
- Información personal nueva compartida
- Momentos emocionales significativos
- Temas que quedaron inconclusos
- El tono general de la conversación

Formato: bullets concisos pero informativos. Máximo 500 caracteres total.

CONVERSACIÓN:
${recentMessages}`;

        const genAI = createGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        console.log('[generate-memory-summary] Calling Gemini...');
        const summary = await generateWithRetry(model, prompt);

        console.log('[generate-memory-summary] Summary generated:', summary.substring(0, 100) + '...');

        const result: GenerateMemorySummaryResponse = {
            summary: summary.trim()
        };

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('[generate-memory-summary] Error:', error);

        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
                summary: ''
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
