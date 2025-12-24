import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkProhibitedContent } from "./contentModeration";

// Initialize Gemini
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function sendMessageToGemini(message: string, imageBase64?: string | null) {
    try {
        if (!API_KEY || API_KEY === "TU_API_KEY_AQUI") {
            return {
                text: "⚠️ Missing API Key. Please add your EXPO_PUBLIC_GEMINI_API_KEY in the .env file.",
                error: true
            };
        }

        // Google Play AI Policy: Check for prohibited content
        const contentCheck = checkProhibitedContent(message);
        if (contentCheck.isProhibited) {
            return {
                text: `❌ ${contentCheck.message}\n\nLas políticas de Google Play prohíben generar contenido ${contentCheck.category}.`,
                error: true
            };
        }

        let prompt = message;
        let imagePart = null;

        if (imageBase64) {
            imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg",
                },
            };
        }

        // System instruction to act as a relationship coach
        const systemPrompt = "You are an empathetic, wise, and supportive relationship coach named 'Ex Coach'. Your goal is to help the user heal from a breakup, maintain no-contact, and grow. Analyze any text or images (like screenshots of texts) they send to provide psychological insight. Be concise but warm.";

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am ready to help you heal and grow." }],
                },
            ],
        });

        let result;
        if (imagePart) {
            // For multimodal, we use generateContent directly as startChat doesn't fully support images in history easily in all SDK versions yet, 
            // or we treat it as a single turn with context.
            // To keep it simple and robust:
            const result = await model.generateContent([systemPrompt + "\nUser: " + message, imagePart]);
            const response = await result.response;
            return { text: response.text(), error: false };
        } else {
            const result = await chat.sendMessage(message);
            const response = await result.response;
            return { text: response.text(), error: false };
        }

    } catch (error: any) {
        console.error("Gemini Error:", error);
        return {
            text: "Sorry, I'm having trouble connecting to my brain right now. Please try again.",
            error: true
        };
    }
}
