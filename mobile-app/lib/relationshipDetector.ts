
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage } from './exSimulator';

// Initialize Gemini
// We reuse the same API key logic as other files
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Detects the relationship type based on chat content using Gemini Flash 1.5
 * Optimized for speed and low cost.
 */
export async function detectRelationshipType(
    messages: ParsedMessage[],
    exName: string
): Promise<'partner' | 'ex' | 'friend' | 'family' | 'deceased' | null> {
    try {
        if (!API_KEY) {
            console.warn('[RelationshipDetector] No API key found');
            return null;
        }

        // Use efficient sampling: 50 messages from middle-end
        const sampleSize = 50;
        const startIdx = Math.max(0, Math.floor(messages.length / 2) - sampleSize / 2);
        const sample = messages
            .slice(startIdx, startIdx + sampleSize)
            .map(m => `${m.sender}: ${m.content}`)
            .join('\n');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza este chat de WhatsApp y determina la relación entre las personas.
        Participante objetivo: "${exName}"
        
        Muestra:
        ${sample}
        
        Clasifica la relación de "${exName}" con la otra persona en UNA de estas categorías:
        - partner (pareja actual)
        - ex (ex pareja, ruptura reciente o antigua)
        - friend (amistad, bestie)
        - family (padre, madre, hermano, primo)
        - deceased (persona fallecida, el usuario le escribe recordando)
        
        Responde SOLO con la categoría (ej: "ex"). Si no estás seguro, devuelve "ex".`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().toLowerCase();

        console.log('[RelationshipDetector] AI detected:', text);

        if (text.includes('partner')) return 'partner';
        if (text.includes('ex')) return 'ex';
        if (text.includes('friend')) return 'friend';
        if (text.includes('family')) return 'family';
        if (text.includes('deceased')) return 'deceased';

        return 'ex'; // Default fallback

    } catch (error) {
        console.error('[RelationshipDetector] Error detecting relationship:', error);
        return null;
    }
}
