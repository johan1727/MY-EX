// Edge Function: extract-key-facts
// Extracts important facts from user messages for long-term memory
// Using Gemini API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createGeminiClient, generateWithRetry, safeParseJSON } from '../_shared/gemini-client.ts';
import type { ExtractKeyFactsRequest, ExtractKeyFactsResponse, KeyFact } from '../_shared/types.ts';

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
        const { message, userId }: ExtractKeyFactsRequest = await req.json();

        console.log('[extract-key-facts] Request received:', {
            userId,
            messageLength: message.length
        });

        // Validate required fields
        if (!message || !userId) {
            throw new Error('Missing required fields: message, userId');
        }

        const prompt = `Extract key facts from this message that should be remembered long-term.
Return ONLY a JSON array of facts, or an empty array if none.
Format: [{"fact": "...", "category": "relationship_detail|trigger|progress|pattern", "importance": 1-10}]

Examples:
- "My ex's name is Sarah" -> [{"fact": "Ex's name is Sarah", "category": "relationship_detail", "importance": 9}]
- "We broke up because of trust issues" -> [{"fact": "Breakup reason: trust issues", "category": "relationship_detail", "importance": 8}]
- "I always feel sad when I hear our song" -> [{"fact": "Trigger: hearing their song makes user sad", "category": "trigger", "importance": 7}]

Message to analyze: "${message}"`;

        const genAI = createGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        console.log('[extract-key-facts] Calling Gemini...');
        const responseText = await generateWithRetry(model, prompt);

        // Parse JSON response
        const facts: KeyFact[] = safeParseJSON<KeyFact[]>(responseText, []);

        console.log('[extract-key-facts] Extracted', facts.length, 'facts');

        const result: ExtractKeyFactsResponse = { facts };

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('[extract-key-facts] Error:', error);

        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
                facts: []
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
