import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function generateChatResponse(userMessage: string, systemPrompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 20000)
    );

    try {
        console.log('[EdgeFunctions] Generating response with Gemini...');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

        const result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
        ]);

        const response = (result as any).response;
        const text = response.text();

        console.log('[EdgeFunctions] Response generated successfully');
        return text;
    } catch (error: any) {
        if (error.message === 'TIMEOUT') {
            console.error('[EdgeFunctions] Gemini request timed out');
            throw new Error('La respuesta está tardando demasiado. Intenta de nuevo en unos segundos.');
        }
        console.error('[EdgeFunctions] Error generating response:', error);
        throw error;
    }
}
