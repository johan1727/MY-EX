import { supabase } from "./supabase";
import { checkProhibitedContent } from "./contentModeration";

// Generic function to allow other modules (deepAnalysis, exSimulator) to use the secure Edge Function
export async function generateAIResponse(prompt: string, systemPrompt?: string, imageBase64?: string | null, model: string = 'gemini-1.5-flash') {
    console.log('[Gemini] Invoking secure Edge Function chat-ai...', { hasImage: !!imageBase64, model });

    // Updated for High-Context (400k+ tokens): Relying on server-side timeout configuration
    const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
            message: prompt,
            image: imageBase64,
            systemPrompt: systemPrompt,
            model: model
        }
    });

    if (error) {
        console.error('[Gemini] Edge Function Error:', error);
        throw new Error(error.message || 'Error connecting to AI service');
    }

    if (!data || !data.text) {
        console.error('[Gemini] Invalid response from Edge Function:', data);
        throw new Error('Invalid response from AI service');
    }

    return data.text;
}

// allow passing model
export async function sendMessageToGemini(message: string, imageBase64?: string | null, model: string = 'gemini-1.5-flash') {
    try {
        // Google Play AI Policy: Check for prohibited content
        const contentCheck = checkProhibitedContent(message);
        if (contentCheck.isProhibited) {
            return {
                text: `❌ ${contentCheck.message}\n\nLas políticas de Google Play prohíben generar contenido ${contentCheck.category}.`,
                error: true
            };
        }

        // System instruction to act as a relationship coach
        const defaultSystemPrompt = "You are an empathetic, wise, and supportive relationship coach named 'Ex Coach'. Your goal is to help the user heal from a breakup, maintain no-contact, and grow. Analyze any text or images (like screenshots of texts) they send to provide psychological insight. Be concise but warm.";

        const text = await generateAIResponse(message, defaultSystemPrompt, imageBase64, model);
        return { text, error: false };

    } catch (error: any) {
        console.error("Gemini Error:", error);
        return {
            text: "Sorry, I'm having trouble connecting to my brain right now. Please try again.",
            error: true
        };
    }
}
