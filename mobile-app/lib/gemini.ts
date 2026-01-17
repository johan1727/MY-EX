import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { supabase } from './supabase';

// Initialize Gemini
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Use the faster, cheaper Flash 2.0 model
const MODEL_NAME = 'gemini-2.0-flash';

interface UserProfile {
    name?: string;
    breakup_date?: string;
    who_ended?: string;
    current_mood?: number;
    onboarding_data?: any;
    main_struggles?: string[];
}

// Helper to calculate days since breakup
function calculateDaysSince(dateString: string): number {
    const breakupDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - breakupDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Build the system prompt (Ported from openai.ts)
function buildPersonalizedPrompt(userProfile: UserProfile): string {
    const daysSinceBreakup = userProfile.breakup_date
        ? calculateDaysSince(userProfile.breakup_date)
        : 30;

    let tone = "";
    let specificGuidance = "";

    if (daysSinceBreakup < 7) {
        tone = "CONTENCIÓN INMEDIATA y VALIDACIÓN";
        specificGuidance = `La herida está muy fresca (solo ${daysSinceBreakup} días). 
- Evita frases como "ya pasará" o "hay más peces en el mar"
- Enfócate en que se sienta escuchado/a
- Ofrece técnicas de grounding y manejo de crisis
- Valida que el dolor es real y normal
- No presiones para "seguir adelante" todavía`;
    } else if (daysSinceBreakup < 30) {
        tone = "APOYO ACTIVO y ESTRUCTURA";
        specificGuidance = `Ya pasó la crisis inicial (${daysSinceBreakup} días). 
- Ayúdale a establecer rutinas saludables
- Enfócate en autocuidado básico (dormir, comer, ejercicio)
- Procesar emociones de forma constructiva
- Pequeños pasos hacia la normalidad
- Está bien tener días malos`;
    } else if (daysSinceBreakup < 90) {
        tone = "EMPODERAMIENTO SUAVE y RECONSTRUCCIÓN";
        specificGuidance = `Ya hay cierta distancia (${daysSinceBreakup} días). 
- Enfócate en reconstrucción de identidad
- Redescubrimiento de intereses y pasiones
- Establecer nuevas metas pequeñas
- Celebrar el progreso visible
- Explorar lecciones aprendidas (sin culpa)`;
    } else {
        tone = "CRECIMIENTO y NUEVAS METAS";
        specificGuidance = `Ya hay perspectiva (${daysSinceBreakup} días). 
- Puedes ser más directo/a sobre patrones a cambiar
- Enfócate en el futuro y nuevas posibilidades
- Ayúdale a cerrar ciclos pendientes
- Hablar de nuevas relaciones (si está listo/a)
- Transformar el dolor en sabiduría`;
    }

    let endingContext = "";
    if (userProfile.who_ended === 'them') {
        endingContext = `Su ex terminó la relación. Puede sentir rechazo, abandono o baja autoestima. 
- Refuerza su valor como persona
- Ayúdale a no personalizar el rechazo
- Trabaja en aceptación sin auto-culpa`;
    } else if (userProfile.who_ended === 'me') {
        endingContext = `Ellos terminaron la relación. Puede sentir culpa, duda o arrepentimiento. 
- Valida que tomar decisiones difíciles es valiente
- Ayúdale a confiar en su decisión
- Trabaja en soltar la culpa`;
    } else {
        endingContext = `Fue una decisión mutua. Puede haber menos conflicto pero igual dolor. 
- Valida que el dolor es real aunque haya sido mutuo
- Enfócate en el duelo saludable
- Ayúdale a honrar lo que fue sin idealizarlo`;
    }

    const strugglesText = userProfile.main_struggles && userProfile.main_struggles.length > 0
        ? `\nLuchas principales: ${userProfile.main_struggles.join(', ')}.\nCuando sea relevante, ofrece estrategias específicas para estas dificultades.`
        : '';

    const userName = userProfile.name || 'friend';

    return `Eres un Coach Emocional empático especializado en sanación de rupturas amorosas. Tu nombre es "Ex Coach", una IA avanzada potenciada por Gemini 2.0.

CONTEXTO DEL USUARIO:
- Nombre: ${userName}
- Días desde la ruptura: ${daysSinceBreakup} días
- Quién terminó: ${endingContext}
- Estado de ánimo actual: ${userProfile.current_mood || 'desconocido'}/10${strugglesText}

TONO Y ENFOQUE ACTUAL:
Tu tono debe ser: ${tone}

${specificGuidance}

PRINCIPIOS FUNDAMENTALES:
1. **Conexión Personal**: Usa su nombre (${userName}) ocasionalmente.
2. **Contexto Temporal**: Ajusta tus consejos según el tiempo transcurrido.
3. **Empatía Activa**: Valida emociones sin juzgar.
4. **Escucha Profunda**: Detecta lo no dicho.
5. **Consejos Accionables**: Pasos concretos y pequeños.
6. **Memoria Contextual**: Usa la información que se te provee.

TU OBJETIVO: Ser un refugio seguro y una guía sabia para transformar su dolor en crecimiento.`;
}

/**
 * Main function to chat with Gemini
 */
export async function sendMessageToAGI(
    message: string,
    imageBase64?: string | null,
    userId?: string,
    previousMessages: any[] = [],
    conversationId?: string
) {
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            // Safety settings to prevent blocking legitimate emotional support discussions
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ]
        });

        let userProfile: UserProfile = {};
        let longTermMemory = "";
        let chatHistory = [];

        // 1. Fetch User Data & Memory
        if (userId) {
            const { data } = await supabase
                .from('profiles')
                .select('name, breakup_date, who_ended, current_mood, onboarding_data, main_struggles')
                .eq('id', userId)
                .single();

            if (data) userProfile = data;

            // Fetch Memory
            const { data: memoryData } = await supabase
                .from('user_memory')
                .select('key_fact, category')
                .eq('user_id', userId)
                .order('importance_score', { ascending: false })
                .limit(15);

            if (memoryData?.length) {
                longTermMemory = "\n\nMEMORIA A LARGO PLAZO (Hechos clave):\n" +
                    memoryData.map(m => `- [${m.category}] ${m.key_fact}`).join('\n');
            }

            // Fetch History
            if (conversationId) {
                const { data: historicalData } = await supabase
                    .from('chat_messages')
                    .select('content, sender, created_at')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false }) // Get newest first
                    .limit(20); // Limit context window

                if (historicalData) {
                    // Convert to Gemini format (user/model) and reverse to be chronological
                    chatHistory = historicalData.reverse().map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }));
                }
            } else if (previousMessages.length > 0) {
                chatHistory = previousMessages.map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));
            }
        }

        // 2. Start Chat Session
        const systemInstruction = buildPersonalizedPrompt(userProfile) + longTermMemory +
            "\n\nIMPORTANTE: No inventes hechos sobre el usuario. Mantén coherencia con lo que te dicen.";

        // For Gemini, we often just prepend system instructions if using the chat API, 
        // or use the system_instruction param (available in newer SDK versions/models).
        // The simplistic approach is a robust system message at the start.

        // We'll use the chat object
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: "SYSTEM_INSTRUCTION_HIDDEN: " + systemInstruction }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Entendido. Actuaré como el Ex Coach según estas instrucciones." }]
                },
                ...chatHistory
            ]
        });

        // 3. Prepare User Message (Text + Image support)
        let parts: any[] = [{ text: message }];

        if (imageBase64) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                }
            });
        }

        // 4. Send Message
        const result = await chat.sendMessage(parts);
        const responseText = result.response.text();

        // 5. Background: Extract Memories (Fire and forget)
        if (userId) {
            extractKeyFacts(message, userId).then(async (facts) => {
                if (facts?.length) {
                    await supabase.from('user_memory').insert(
                        facts.map((f: any) => ({
                            user_id: userId,
                            key_fact: f.fact,
                            category: f.category,
                            importance_score: f.importance
                        }))
                    );
                }
            });
        }

        // 6. Generate Suggestions
        const suggestedReplies = await generateSuggestedReplies(responseText, message);

        return {
            text: responseText,
            suggestedReplies,
            error: null
        };

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return {
            text: 'Lo siento, tuve un problema de conexión. Por favor intenta de nuevo.',
            suggestedReplies: [],
            error: error.message
        };
    }
}

/**
 * Extract facts using JSON mode
 */
export async function extractKeyFacts(message: string, userId: string) {
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: { responseMimeType: "application/json" } // Force JSON
        });

        const prompt = `Analyzer this user message: "${message}"
        Extract meaningful facts for long-term memory about their relationship, breakup, or emotional state.
        Return a JSON array: [{ "fact": string, "category": "relationship|trigger|progress", "importance": 1-10 }]
        If no facts, return []`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (e) {
        console.error('Fact extraction failed:', e);
        return [];
    }
}

/**
 * Generate quick replies
 */
async function generateSuggestedReplies(aiResponse: string, userMessage: string): Promise<string[]> {
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Based on User: "${userMessage}" and AI Coach: "${aiResponse}", 
        Generate 3 short, natural Spanish reply options (max 6 words) for the user.
        Return JSON array: ["option1", "option2", "option3"]`;

        const result = await model.generateContent(prompt);
        const suggestions = JSON.parse(result.response.text());

        return Array.isArray(suggestions) ? suggestions.slice(0, 3) : ["Cuéntame más", "Entiendo", "¿Qué hago?"];
    } catch (e) {
        return ["Cuéntame más", "¿Qué sugieres?", "Gracias"];
    }
}

export function checkForCrisisKeywords(message: string) {
    const keywords = ['suicid', 'matarme', 'morir', 'acabar con todo', 'no quiero vivir'];
    const isCrisis = keywords.some(k => message.toLowerCase().includes(k));

    if (isCrisis) {
        return {
            isCrisis: true,
            resources: `🆘 Estoy preocupado por ti. Por favor busca ayuda inmediata:
- Línea de la Vida (México): 800 911 2000
- Emergencias: 911
- Habla con alguien de confianza ahora mismo.`
        };
    }
    return { isCrisis: false };
}
