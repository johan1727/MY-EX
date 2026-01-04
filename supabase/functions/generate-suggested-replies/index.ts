// Edge Function: generate-suggested-replies
// Generates 3 contextual quick reply suggestions
// Using Gemini API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createGeminiClient, generateWithRetry, safeParseJSON } from '../_shared/gemini-client.ts';
import type { GenerateSuggestedRepliesRequest, GenerateSuggestedRepliesResponse } from '../_shared/types.ts';

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
        const { aiMessage, userMessage, userProfile }: GenerateSuggestedRepliesRequest = await req.json();

        console.log('[generate-suggested-replies] Request received');

        // Validate required fields
        if (!aiMessage || !userMessage) {
            throw new Error('Missing required fields: aiMessage, userMessage');
        }

        const prompt = `Eres un asistente que genera respuestas sugeridas para el usuario.
Basándote en el mensaje del AI Coach y el contexto emocional del usuario, genera EXACTAMENTE 3 opciones de respuesta cortas (máximo 8 palabras cada una) que el usuario podría querer decir.

Las respuestas deben ser:
- Naturales y conversacionales
- Relevantes al tema actual
- Variadas en tono (una reflexiva, una emocional, una práctica)
- En español

Retorna SOLO un array JSON de strings, sin explicaciones.
Ejemplo: ["Tienes razón, me cuesta aceptarlo", "¿Qué hago si vuelve a escribirme?", "Necesito consejos para distraerme"]

Mensaje del usuario: "${userMessage}"
Respuesta del AI: "${aiMessage}"`;

        const genAI = createGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        console.log('[generate-suggested-replies] Calling Gemini...');
        const responseText = await generateWithRetry(model, prompt);

        // Parse JSON response with fallback
        const fallback = [
            "Cuéntame más sobre eso",
            "¿Qué puedo hacer ahora?",
            "Necesito tu consejo"
        ];

        const parsed = safeParseJSON<string[]>(responseText, fallback);
        const suggestions = Array.isArray(parsed) && parsed.length >= 3
            ? parsed.slice(0, 3)
            : fallback;

        console.log('[generate-suggested-replies] Generated', suggestions.length, 'suggestions');

        const result: GenerateSuggestedRepliesResponse = { suggestions };

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('[generate-suggested-replies] Error:', error);

        // Return fallback suggestions on error
        return new Response(
            JSON.stringify({
                suggestions: [
                    "Cuéntame más",
                    "¿Qué me sugieres?",
                    "Gracias por tu apoyo"
                ]
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 // Return 200 with fallback instead of error
            }
        );
    }
});
