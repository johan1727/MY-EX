import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Types
export interface ParsedMessage {
    timestamp: string;
    sender: 'user' | 'ex';
    content: string;
    hasMedia?: boolean;
}

export interface ExProfile {
    communicationStyle: 'directa' | 'pasivo-agresiva' | 'evasiva' | 'afectuosa' | 'mixta';
    commonPhrases: string[];
    emotionalTone: 'cálida' | 'fría' | 'variable';
    responsePatterns: {
        whenHappy: string[];
        whenAngry: string[];
        whenAvoidant: string[];
    };
    topicsOfInterest: string[];
    redFlags: string[];
    attachmentStyle: 'seguro' | 'ansioso' | 'evitativo' | 'desorganizado';
    exName: string;
}

export interface ConversationAnalysis {
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    patternsDetected: string[];
}

// Parse WhatsApp export format
export function parseWhatsAppExport(text: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    // Handle both Windows (\r\n) and Unix (\n) line endings
    const lines = text.split(/\r?\n/);

    console.log(`[parseWhatsAppExport] 🔍 Starting parse...`);
    console.log(`[parseWhatsAppExport] Total lines to parse: ${lines.length}`);
    console.log(`[parseWhatsAppExport] File size: ${text.length} characters`);
    console.log(`[parseWhatsAppExport] First line sample: "${lines[0]?.substring(0, 100)}"`);

    // WhatsApp format supports multiple variations:
    // "11/23/23, 11:02 PM - Usuario: Mensaje" (2-digit year, 12-hour)
    // "01/15/2024, 10:30 AM - Usuario: Mensaje" (4-digit year, 12-hour)
    // "01/15/2024, 22:30 - Usuario: Mensaje" (4-digit year, 24-hour)
    const whatsappRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}(?:\s(?:AM|PM))?)\s-\s([^:]+):\s(.+)$/;

    let matchedLines = 0;
    let skippedSystemMessages = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim(); // Trim whitespace including \r

        if (!line) continue; // Skip empty lines

        const match = line.match(whatsappRegex);
        if (match) {
            matchedLines++;
            const [, timestamp, senderName, content] = match;

            // Log first 3 matches for debugging
            if (matchedLines <= 3) {
                console.log(`[parseWhatsAppExport] ✅ Match ${matchedLines}: ${timestamp} - ${senderName}: ${content.substring(0, 30)}...`);
            }

            // Detect if message has media
            const hasMedia = content.includes('<Media omitted>') ||
                content.includes('imagen omitida') ||
                content.includes('video omitido');

            messages.push({
                timestamp,
                sender: 'user', // Will be corrected in post-processing
                content: hasMedia ? '[Imagen/Video]' : content,
                hasMedia
            });
        } else if (i < 10) {
            // Log first 10 non-matching lines for debugging
            skippedSystemMessages++;
            console.log(`[parseWhatsAppExport] ⏭️  Skip line ${i}: "${line.substring(0, 80)}"`);
        }
    }

    console.log(`[parseWhatsAppExport] ✅ Parsing complete!`);
    console.log(`[parseWhatsAppExport] Total messages parsed: ${messages.length}`);
    console.log(`[parseWhatsAppExport] Matched lines: ${matchedLines}`);
    console.log(`[parseWhatsAppExport] Skipped (first 10): ${Math.min(skippedSystemMessages, 10)}`);

    return messages;
}

// Parse Telegram JSON export
export function parseTelegramExport(jsonData: any): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    if (!jsonData.messages || !Array.isArray(jsonData.messages)) {
        return messages;
    }

    for (const msg of jsonData.messages) {
        if (msg.type === 'message' && msg.text) {
            const content = typeof msg.text === 'string' ? msg.text :
                Array.isArray(msg.text) ? msg.text.map((t: any) => typeof t === 'string' ? t : t.text).join('') : '';

            messages.push({
                timestamp: msg.date,
                sender: 'user', // Will be corrected in post-processing
                content,
                hasMedia: msg.photo || msg.video || msg.file
            });
        }
    }

    return messages;
}

// Identify who is the user and who is the ex
export function identifySenders(messages: ParsedMessage[], userName: string, exName: string): ParsedMessage[] {
    return messages.map(msg => ({
        ...msg,
        sender: msg.sender === userName ? 'user' : 'ex'
    }));
}

// Analyze personality from messages
export async function analyzePersonality(
    messages: ParsedMessage[],
    exName: string
): Promise<ExProfile> {
    const exMessages = messages.filter(m => m.sender === 'ex').slice(0, 500); // Limit to 500 messages

    if (exMessages.length < 10) {
        throw new Error('Se necesitan al menos 10 mensajes de tu ex para crear un perfil preciso');
    }

    const conversationSample = exMessages.slice(0, 100).map(m => m.content).join('\n');

    const prompt = `Analiza estos mensajes de una persona llamada "${exName}" y extrae su perfil de personalidad.

MENSAJES:
${conversationSample}

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "communicationStyle": "directa" | "pasivo-agresiva" | "evasiva" | "afectuosa" | "mixta",
  "commonPhrases": ["frase1", "frase2", "frase3"],
  "emotionalTone": "cálida" | "fría" | "variable",
  "responsePatterns": {
    "whenHappy": ["comportamiento1", "comportamiento2"],
    "whenAngry": ["comportamiento1", "comportamiento2"],
    "whenAvoidant": ["comportamiento1", "comportamiento2"]
  },
  "topicsOfInterest": ["tema1", "tema2"],
  "redFlags": ["patrón problemático 1", "patrón problemático 2"],
  "attachmentStyle": "seguro" | "ansioso" | "evitativo" | "desorganizado"
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No se pudo extraer el perfil de personalidad');
        }

        const profile = JSON.parse(jsonMatch[0]);
        return {
            ...profile,
            exName
        };
    } catch (error) {
        console.error('Error analyzing personality:', error);
        throw new Error('Error al analizar la personalidad. Intenta de nuevo.');
    }
}

// Generate system prompt for simulation
export function generateSystemPrompt(profile: ExProfile, conversationHistory: ParsedMessage[]): string {
    const recentMessages = conversationHistory.slice(-50).map(m =>
        `${m.sender === 'ex' ? profile.exName : 'Usuario'}: ${m.content}`
    ).join('\n');

    return `Eres ${profile.exName}. Basándote en el análisis de conversaciones reales:

PERSONALIDAD:
- Estilo de comunicación: ${profile.communicationStyle}
- Frases características: ${profile.commonPhrases.map(p => `"${p}"`).join(', ')}
- Tono emocional: ${profile.emotionalTone}
- Estilo de apego: ${profile.attachmentStyle}

PATRONES DE RESPUESTA:
- Cuando está feliz: ${profile.responsePatterns.whenHappy.join(', ')}
- Cuando está molesta: ${profile.responsePatterns.whenAngry.join(', ')}
- Cuando evita temas: ${profile.responsePatterns.whenAvoidant.join(', ')}

TEMAS DE INTERÉS:
${profile.topicsOfInterest.join(', ')}

SEÑALES DE ALERTA (patrones problemáticos):
${profile.redFlags.join(', ')}

CONTEXTO RECIENTE:
${recentMessages}

INSTRUCCIONES CRÍTICAS:
1. Responde EXACTAMENTE como ${profile.exName} respondería
2. Usa sus frases características cuando sea natural
3. Mantén su tono emocional consistente
4. Si el usuario toca un tema sensible, reacciona como ella lo haría
5. NO inventes información que no esté en el historial
6. Sé coherente con el contexto de la relación
7. Si no estás segura de cómo responder, di algo breve y característico de ella

Responde como ${profile.exName} al siguiente mensaje:`;
}

// Extract chat from images (screenshots)
export async function extractChatFromImages(base64Images: string[]): Promise<ParsedMessage[]> {
    const messages: ParsedMessage[] = [];

    for (const base64 of base64Images) {
        const prompt = `Analiza esta captura de pantalla de una conversación de chat (WhatsApp, Telegram, iMessage, etc.).
Extrae TODOS los mensajes visibles en orden cronológico.
Identifica quién es el remitente (si es el dueño del teléfono "user" o la otra persona "ex").
Si hay fechas u horas visibles, úsalas. Si no, estima el orden.

Responde SOLO con un JSON válido con esta estructura:
{
  "messages": [
    {
      "sender": "user" | "ex",
      "content": "texto del mensaje",
      "timestamp": "hora/fecha si es visible o null"
    }
  ]
}`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64, mimeType: 'image/jpeg' } }
            ]);
            const response = result.response.text();
            const jsonMatch = response.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.messages && Array.isArray(data.messages)) {
                    messages.push(...data.messages.map((m: any) => ({
                        timestamp: m.timestamp || new Date().toISOString(),
                        sender: m.sender,
                        content: m.content,
                        hasMedia: false
                    })));
                }
            }
        } catch (error) {
            console.error('Error extracting chat from image:', error);
            // Continue with other images even if one fails
        }
    }

    return messages;
}

// Simulate response from ex
export async function simulateResponse(
    userMessage: string,
    userImage: string | null | undefined,
    profile: ExProfile,
    conversationHistory: ParsedMessage[]
): Promise<{ response: string; confidence: number }> {
    const systemPrompt = generateSystemPrompt(profile, conversationHistory);

    let fullPrompt = `${systemPrompt}\n\nUsuario: ${userMessage}`;
    const promptParts: any[] = [fullPrompt];

    if (userImage) {
        promptParts.push({ inlineData: { data: userImage, mimeType: 'image/jpeg' } });
        fullPrompt += `\n[El usuario ha enviado una imagen]`;
    }

    fullPrompt += `\n\n${profile.exName}:`;
    promptParts[0] = fullPrompt; // Update text part

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(promptParts);
        const response = result.response.text().trim();

        // Calculate confidence based on response characteristics
        const usesCommonPhrases = profile.commonPhrases.some(phrase =>
            response.toLowerCase().includes(phrase.toLowerCase())
        );
        const confidence = usesCommonPhrases ? 0.85 : 0.70;

        return {
            response,
            confidence
        };
    } catch (error) {
        console.error('Error simulating response:', error);
        throw new Error('Error al generar respuesta. Intenta de nuevo.');
    }
}

// Analyze conversation and provide feedback
export async function analyzeConversation(
    messages: { role: 'user' | 'ex'; content: string }[],
    profile: ExProfile
): Promise<ConversationAnalysis> {
    const conversationText = messages.map(m =>
        `${m.role === 'user' ? 'Usuario' : profile.exName}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza esta conversación simulada entre un usuario y su ex (${profile.exName}):

${conversationText}

PERFIL DE LA EX:
- Estilo: ${profile.communicationStyle}
- Tono: ${profile.emotionalTone}
- Señales de alerta: ${profile.redFlags.join(', ')}

Proporciona un análisis en formato JSON:
{
  "strengths": ["fortaleza1", "fortaleza2"],
  "improvements": ["área de mejora 1", "área de mejora 2"],
  "suggestions": ["sugerencia concreta 1", "sugerencia concreta 2"],
  "patternsDetected": ["patrón detectado 1", "patrón detectado 2"]
}

Enfócate en:
1. Comunicación no violenta
2. Establecimiento de límites
3. Patrones de codependencia
4. Respuestas emocionales saludables

Responde SOLO con el JSON.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No se pudo generar el análisis');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        throw new Error('Error al analizar la conversación. Intenta de nuevo.');
    }
}

// Check usage limits
export interface UsageLimits {
    maxProfiles: number;
    maxSimulationsPerMonth: number;
    maxMessagesPerSimulation: number;
}

export function getUsageLimits(subscriptionTier: string): UsageLimits {
    switch (subscriptionTier) {
        case 'warrior':
            return {
                maxProfiles: 3,
                maxSimulationsPerMonth: 30,
                maxMessagesPerSimulation: 40
            };
        case 'premium':
            return {
                maxProfiles: 5,
                maxSimulationsPerMonth: 75,
                maxMessagesPerSimulation: 60
            };
        case 'phoenix':
            return {
                maxProfiles: 10,
                maxSimulationsPerMonth: 200,
                maxMessagesPerSimulation: 100
            };
        default:
            return {
                maxProfiles: 0,
                maxSimulationsPerMonth: 0,
                maxMessagesPerSimulation: 0
            };
    }
}
