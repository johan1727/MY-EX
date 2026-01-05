import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function generateChatResponse(userMessage: string, systemPrompt: string): Promise<string> {
    try {
        console.log('[EdgeFunctions] Generating response with Gemini...');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('[EdgeFunctions] Response generated successfully');
        return text;
    } catch (error) {
        console.error('[EdgeFunctions] Error generating response:', error);
        throw error;
    }
}
