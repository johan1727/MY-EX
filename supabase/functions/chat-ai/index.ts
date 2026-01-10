
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { message, image, history, systemPrompt, model: requestedModel } = await req.json();

        if (!GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in server environment");
        }

        const modelName = requestedModel || "gemini-1.5-flash";
        console.log(`[Edge Function] Using model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        let result;
        if (image) {
            // Multimodal request (Text + Image)
            const prompt = message;
            const imagePart = {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg",
                },
            };

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;
            result = await model.generateContent([fullPrompt, imagePart]);
        } else {
            // Text-only request (Chat)
            let chatHistory = [];
            if (history && Array.isArray(history)) {
                chatHistory = history;
            } else if (systemPrompt) {
                // Initialize with system prompt if no history
                chatHistory = [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood." }],
                    },
                ];
            }

            const chat = model.startChat({
                history: chatHistory,
            });

            result = await chat.sendMessage(message);
        }

        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error in chat-ai function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
