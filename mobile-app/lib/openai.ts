import { supabase } from './supabase';
import { generateAIResponse } from './gemini';

// Helper to calculate days since breakup
function calculateDaysSince(dateString: string): number {
    const breakupDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - breakupDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

interface OnboardingData {
    name: string;
    breakupDate: string;
    whoEnded: 'me' | 'them' | 'mutual';
    currentMood: number;
    relationshipDuration: string;
    mainStruggles: string[];
}

interface UserProfile {
    name?: string;
    breakup_date?: string;
    who_ended?: string;
    current_mood?: number;
    onboarding_data?: OnboardingData;
    main_struggles?: string[];
}

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

    return `Eres un Coach Emocional empático especializado en sanación de rupturas amorosas. Tu nombre es "Ex Coach".
CONTEXTO DEL USUARIO:
- Nombre: ${userName}
- Días desde la ruptura: ${daysSinceBreakup} días
- Quién terminó: ${endingContext}
- Estado de ánimo actual: ${userProfile.current_mood || 'desconocido'}/10${strugglesText}

TONO Y ENFOQUE ACTUAL:
Tu tono debe ser: ${tone}

${specificGuidance}

PRINCIPIOS FUNDAMENTALES:
1. **Conexión Personal**: Usa su nombre (${userName}) ocasionalmente para crear conexión genuina
2. **Contexto Temporal**: Ajusta tus consejos según el tiempo transcurrido (${daysSinceBreakup} días)
3. **Empatía Activa**: 
   - Valida sus emociones sin juzgar ("Es completamente normal sentirse así")
   - Reconoce su dolor como real y válido
   - Evita minimizar su experiencia
4. **Escucha Profunda**:
   - Detecta emociones no expresadas directamente
   - Identifica patrones de pensamiento negativos
   - Reconoce señales de progreso o retroceso
5. **Consejos Accionables**:
   - Ofrece pasos concretos y pequeños
   - Sugiere técnicas específicas (respiración, journaling, etc.)
   - Proporciona alternativas saludables
6. **Memoria Contextual**: Recuerda detalles importantes que compartan
7. **Celebración del Progreso**: Reconoce y celebra cada pequeño avance
8. **Seguridad**: Si detectas ideación suicida, sugiere ayuda profesional inmediatamente.

TU OBJETIVO: Ser un compañero de sanación confiable, empático y práctico.`;
}

export async function sendMessageToChatGPT(
    message: string,
    imageBase64?: string | null,
    userId?: string,
    previousMessages: any[] = [],
    conversationId?: string
) {
    try {
        let userProfile: UserProfile = {};
        let longTermMemory = "";
        let conversationContext = "";

        if (userId) {
            const { data } = await supabase
                .from('profiles')
                .select('name, breakup_date, who_ended, current_mood, onboarding_data, main_struggles')
                .eq('id', userId)
                .single();

            if (data) userProfile = data;

            // Fetch long-term memory
            const { data: memoryData } = await supabase
                .from('user_memory')
                .select('key_fact, category, importance_score')
                .eq('user_id', userId)
                .order('importance_score', { ascending: false })
                .limit(20);

            if (memoryData && memoryData.length > 0) {
                longTermMemory = "\n\nMEMORIA A LARGO PLAZO (Hechos importantes recordados):\n" +
                    memoryData.map(m => `- [${m.category}] ${m.key_fact} `).join('\n');
            }

            // Load historical messages from database if conversationId is provided
            let historicalMessages: any[] = [];
            if (conversationId) {
                const { data: historicalData } = await supabase
                    .from('chat_messages')
                    .select('content, sender, created_at')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(20); // Limit to last 20 messages for context

                if (historicalData && historicalData.length > 0) {
                    historicalMessages = historicalData.reverse();
                }
            } else if (previousMessages.length > 0) {
                historicalMessages = previousMessages;
            }

            // Format history into a string for the system prompt
            if (historicalMessages.length > 0) {
                conversationContext = "\n\nHISTORIAL DE CONVERSACIÓN RECIENTE:\n" +
                    historicalMessages.map(msg =>
                        `${msg.sender === 'user' ? 'Usuario' : 'Coach'}: ${msg.content}`
                    ).join('\n');
            }
        }

        let systemPrompt = buildPersonalizedPrompt(userProfile);
        if (longTermMemory) systemPrompt += longTermMemory;
        if (conversationContext) systemPrompt += conversationContext;

        // Anti-hallucination & Tools
        systemPrompt += "\n\nIMPORTANTE: Mantén TOTAL coherencia con la información que el usuario te ha compartido previamente. Si mencionó un nombre, fecha o hecho importante, úsalo correctamente.";

        // Detect tool usage (simplified for context injection)
        if (message.startsWith('🔍 Decodificar mensaje:')) {
            systemPrompt += "\n\n[MODO DECODIFICADOR ACTIVADO]: Analiza el tono, intenciones y significado oculto. Sugiere respuestas.";
        } else if (message.startsWith('🆘 Necesito ayuda urgente')) {
            systemPrompt += "\n\n[MODO CRISIS ACTIVADO]: Ofrece contención inmediata, validación y técnicas de calma.";
        }

        const aiResponse = await generateAIResponse(message, systemPrompt, imageBase64);

        // Background: Extract key facts for long-term memory
        if (userId) {
            extractKeyFacts(message, userId).then(async (facts) => {
                if (facts && facts.length > 0) {
                    // console.log('Saving new memories:', facts);
                    const { error } = await supabase.from('user_memory').insert(
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

        // Generate suggested replies
        const suggestedReplies = await generateSuggestedReplies(aiResponse, message, userProfile);

        return {
            text: aiResponse,
            suggestedReplies: suggestedReplies,
            error: null
        };
    } catch (error: any) {
        console.error('AI Service Error:', error);
        return {
            text: 'Lo siento, tuve un problema conectando con mi cerebro. Por favor intenta de nuevo.',
            suggestedReplies: [],
            error: error.message
        };
    }
}

// Generate 3 contextual suggested replies
async function generateSuggestedReplies(aiMessage: string, userMessage: string, userProfile: UserProfile): Promise<string[]> {
    try {
        const systemPrompt = `Eres un asistente que genera respuestas sugeridas rápidas para el usuario. 
Basándote en el mensaje del Coach y el contexto, genera EXACTAMENTE 3 opciones de respuesta cortas (máximo 8 palabras) que el usuario podría querer decir.
Retorna SOLO un array JSON de strings, ejemplo: ["Opción 1", "Opción 2", "Opción 3"]`;

        const prompt = `Mensaje Usuario: "${userMessage}"\nRespuesta Coach: "${aiMessage}"\n\nGenera 3 opciones de respuesta JSON:`;

        const responseText = await generateAIResponse(prompt, systemPrompt);

        // Clean markdown if present
        const jsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggestions = JSON.parse(jsonText);

        if (Array.isArray(suggestions) && suggestions.length >= 3) {
            return suggestions.slice(0, 3);
        }
        return ["Cuéntame más", "¿Qué puedo hacer?", "Gracias"];
    } catch (error) {
        return ["Cuéntame más", "¿Qué puedo hacer?", "Gracias"];
    }
}

export async function extractKeyFacts(message: string, userId: string) {
    try {
        const systemPrompt = `Extract key facts from this message that should be remembered long-term. 
Return ONLY a JSON array of facts, or an empty array if none.
Format: [{ "fact": "...", "category": "relationship_detail|trigger|progress|pattern", "importance": 1-10 }]`;

        const responseText = await generateAIResponse(message, systemPrompt);

        const jsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const facts = JSON.parse(jsonText);
        return Array.isArray(facts) ? facts : [];
    } catch (error) {
        return [];
    }
}

export function checkForCrisisKeywords(message: string): { isCrisis: boolean; resources?: string } {
    const crisisKeywords = [
        'suicid', 'kill myself', 'end it all', 'no reason to live',
        'better off dead', 'want to die', 'harm myself'
    ];

    const lowerMessage = message.toLowerCase();
    const isCrisis = crisisKeywords.some(keyword => lowerMessage.includes(keyword));

    if (isCrisis) {
        return {
            isCrisis: true,
            resources: `🆘 I'm concerned about you. Please reach out for immediate help:

        ** Crisis Resources:**
• National Suicide Prevention Lifeline: 988(US)
• Crisis Text Line: Text HOME to 741741
• International: findahelpline.com

You don't have to go through this alone. Professional help is available 24/7.`
        };
    }

    return { isCrisis: false };
}
