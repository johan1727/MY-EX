import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

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

function calculateDaysSince(dateString: string): number {
    const breakupDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - breakupDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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

    return `Eres un Coach Emocional empático especializado en sanación de rupturas amorosas. Tu nombre es "Ex Coach" y estás potenciado por GPT-4o-mini.

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

HABILIDADES ESPECIALES:
- **Detección de Crisis**: Si mencionan contactar a su ex, recuérdales su progreso (${daysSinceBreakup} días) y ofrece alternativas
- **Técnicas de Grounding**: Si detectas ansiedad o pánico, ofrece ejercicios de respiración o mindfulness
- **Reencuadre Positivo**: Ayuda a ver situaciones desde perspectivas más constructivas
- **Validación + Desafío**: Valida sus emociones pero desafía gentilmente patrones destructivos

ESTILO DE COMUNICACIÓN:
- Usa un lenguaje cálido, cercano y comprensivo
- Evita jerga psicológica compleja
- Sé directo pero amable
- Usa metáforas y ejemplos cuando sea útil
- Pregunta para profundizar cuando sea necesario
- Respuestas de longitud media (no muy cortas ni muy largas)

LÍMITES IMPORTANTES:
- Si detectas ideación suicida o depresión severa, sugiere ayuda profesional inmediatamente
- No prometas "curar" el dolor - el proceso de sanación toma tiempo
- No juzgues su timeline - cada persona sana a su ritmo
- Eres un coach de apoyo, no un terapeuta profesional

RECORDATORIOS CLAVE:
- Cuando hablen de su ex, enfócate en ELLOS, no en la otra persona
- Si idealizan la relación, ayúdales a recordar también los aspectos difíciles
- Si se culpan excesivamente, recuérdales que las relaciones son de dos
- Celebra los días sin contacto como victorias importantes

Tu objetivo es ser un compañero de sanación confiable, empático y práctico que les ayude a transformar su dolor en crecimiento personal.`;
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
        let allHistoricalMessages: any[] = [];

        if (userId) {
            const { data } = await supabase
                .from('profiles')
                .select('name, breakup_date, who_ended, current_mood, onboarding_data, main_struggles')
                .eq('id', userId)
                .single();

            if (data) {
                userProfile = data;
            }

            // Fetch long-term memory facts
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
            if (conversationId) {
                const { data: historicalData } = await supabase
                    .from('chat_messages')
                    .select('content, sender, created_at')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (historicalData && historicalData.length > 0) {
                    allHistoricalMessages = historicalData.reverse();
                }
            } else if (previousMessages.length > 0) {
                allHistoricalMessages = previousMessages;
            }
        }

        let systemPrompt = buildPersonalizedPrompt(userProfile);
        if (longTermMemory) {
            systemPrompt += longTermMemory;
        }

        // Anti-hallucination instruction
        systemPrompt += "\n\nIMPORTANTE: Mantén TOTAL coherencia con la información que el usuario te ha compartido previamente. Si mencionó un nombre, fecha o hecho importante, úsalo correctamente en tus respuestas futuras. NUNCA inventes información que el usuario no te haya dado.";

        // Detect tool usage and add specialized instructions
        if (message.startsWith('🔍 Decodificar mensaje:')) {
            systemPrompt += "\n\n🔍 MODO DECODIFICADOR ACTIVADO:\nEl usuario quiere analizar un mensaje de su ex. Debes:\n1. Analizar el tono, intenciones y significado oculto del mensaje\n2. Identificar red flags o señales positivas\n3. Sugerir 3 posibles respuestas (una neutral, una empoderada, una de cierre)\n4. Dar consejos sobre si responder o no";
        } else if (message.startsWith('📊 Analizar conversación:')) {
            systemPrompt += "\n\n📊 MODO ANÁLISIS DE CONVERSACIÓN ACTIVADO:\nEl usuario quiere analizar una conversación completa. Debes:\n1. Identificar patrones de comunicación\n2. Detectar dinámicas tóxicas o saludables\n3. Señalar momentos clave de la conversación\n4. Dar perspectiva objetiva sobre la relación";
        } else if (message.startsWith('📱 Analizar publicación:')) {
            systemPrompt += "\n\n📱 MODO ANÁLISIS DE REDES SOCIALES ACTIVADO:\nEl usuario quiere analizar una publicación de su ex. Debes:\n1. Analizar el contenido y posible significado\n2. Evaluar si es indirecta o mensaje subliminal\n3. Dar perspectiva sobre si vale la pena preocuparse\n4. Recordarle que no debe stalkear constantemente";
        } else if (message.startsWith('👁️ Detectar stalking:')) {
            systemPrompt += "\n\n👁️ MODO DETECTOR DE STALKING ACTIVADO:\nEl usuario sospecha que su ex lo está stalkeando. Debes:\n1. Analizar las señales que menciona\n2. Dar perspectiva objetiva (no alimentar paranoia)\n3. Sugerir cómo manejar la situación\n4. Recordar límites saludables";
        } else if (message.startsWith('📖 Registrar emoción:')) {
            systemPrompt += "\n\n📖 MODO DIARIO EMOCIONAL ACTIVADO:\nEl usuario quiere registrar cómo se siente. Debes:\n1. Escuchar activamente y validar sus emociones\n2. Hacer preguntas reflexivas sobre su estado\n3. Identificar triggers o patrones\n4. Sugerir estrategias de autocuidado\n5. Celebrar el progreso que notes";
        } else if (message.startsWith('🆘 Necesito ayuda urgente')) {
            systemPrompt += "\n\n🆘 MODO CRISIS ACTIVADO:\nEl usuario está en crisis emocional. Debes:\n1. Ofrecer contención inmediata y validación\n2. Sugerir técnicas de respiración (4-7-8)\n3. Ayudarle a identificar qué desencadenó la crisis\n4. Recordarle su progreso y fortaleza\n5. Si es muy grave, sugerir contactar a alguien de confianza";
        }

        const messages: any[] = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        // Add ALL historical messages
        if (allHistoricalMessages.length > 0) {
            allHistoricalMessages.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        // Add current user message with optional image
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data: image / jpeg; base64, ${imageBase64} `
                        }
                    }
                ]
            });
        } else {
            messages.push({
                role: 'user',
                content: message
            });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.7,
            max_tokens: 600,
        });

        const aiResponse = response.choices[0].message.content || 'I apologize, I had trouble processing that. Could you try again?';

        // Background: Extract key facts for long-term memory
        if (userId) {
            extractKeyFacts(message, userId).then(async (facts) => {
                if (facts && facts.length > 0) {
                    console.log('Saving new memories:', facts);
                    const { error } = await supabase.from('user_memory').insert(
                        facts.map((f: any) => ({
                            user_id: userId,
                            key_fact: f.fact,
                            category: f.category,
                            importance_score: f.importance
                        }))
                    );
                    if (error) console.error('Error saving memory:', error);
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
        console.error('OpenAI API Error:', error);
        return {
            text: 'I apologize, but I encountered an error. Please try again in a moment.',
            suggestedReplies: [],
            error: error.message
        };
    }
}

// Generate 3 contextual suggested replies
async function generateSuggestedReplies(aiMessage: string, userMessage: string, userProfile: UserProfile): Promise<string[]> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Eres un asistente que genera respuestas sugeridas para el usuario. 
Basándote en el mensaje del AI Coach y el contexto emocional del usuario, genera EXACTAMENTE 3 opciones de respuesta cortas(máximo 8 palabras cada una) que el usuario podría querer decir.

Las respuestas deben ser:
    - Naturales y conversacionales
        - Relevantes al tema actual
            - Variadas en tono(una reflexiva, una emocional, una práctica)
                - En español

Retorna SOLO un array JSON de strings, sin explicaciones.
        Ejemplo: ["Tienes razón, me cuesta aceptarlo", "¿Qué hago si vuelve a escribirme?", "Necesito consejos para distraerme"]`
                },
                {
                    role: 'user',
                    content: `Mensaje del usuario: "${userMessage}"\nRespuesta del AI: "${aiMessage}"`
                }
            ],
            temperature: 1.0,
            max_tokens: 100,
        });

        const suggestionsText = response.choices[0].message.content || '[]';
        const suggestions = JSON.parse(suggestionsText);

        if (Array.isArray(suggestions) && suggestions.length >= 3) {
            return suggestions.slice(0, 3);
        }

        return [
            "Cuéntame más sobre eso",
            "¿Qué puedo hacer ahora?",
            "Necesito tu consejo"
        ];
    } catch (error) {
        console.error('Error generating suggested replies:', error);
        return [
            "Cuéntame más",
            "¿Y si...?",
            "Gracias por escucharme"
        ];
    }
}

export async function extractKeyFacts(message: string, userId: string) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Extract key facts from this message that should be remembered long - term. 
Return ONLY a JSON array of facts, or an empty array if none.
        Format: [{ "fact": "...", "category": "relationship_detail|trigger|progress|pattern", "importance": 1 - 10 }]

    Examples:
    - "My ex's name is Sarah" -> [{ "fact": "Ex's name is Sarah", "category": "relationship_detail", "importance": 9 }]
        - "We broke up because of trust issues" -> [{ "fact": "Breakup reason: trust issues", "category": "relationship_detail", "importance": 8 }]
        - "I always feel sad when I hear our song" -> [{ "fact": "Trigger: hearing their song makes user sad", "category": "trigger", "importance": 7 }]`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.3,
        });

        const facts = JSON.parse(response.choices[0].message.content || '[]');
        return facts;
    } catch (error) {
        console.error('Error extracting key facts:', error);
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
