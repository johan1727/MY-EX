import { GoogleGenerativeAI } from '@google/generative-ai';
import { intelligentTokenSampling } from './messageSampling';
import { extractMessageSamples, MessageSamples } from './messageSampleExtractor';

// TEMPORAL: Hardcodeando la API Key para bypasear el problema de Expo Web
// TODO: Revertir esto antes de hacer commit!
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

console.log('[Gemini] ✅ API Key HARDCODEADA para testing local');
console.log('[Gemini] API Key detectada (comienza con:', GEMINI_API_KEY.substring(0, 8), '...)');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Rate limiting helper - wait between API calls to prevent 429 errors
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const STAGE_DELAY_MS = 2000; // 2 seconds between stages to avoid rate limits

// Types
export interface ParsedMessage {
    timestamp: string;
    sender: string; // Nombre real del participante (ej: "Marian", "Jhonatan")
    content: string;
    hasMedia?: boolean;
}

export interface ExProfile {
    exName: string;
    relationshipStatus?: 'ex' | 'partner' | 'friend';

    // === BASIC COMMUNICATION ===
    communicationStyle: 'directa' | 'pasivo-agresiva' | 'evasiva' | 'afectuosa' | 'mixta';
    commonPhrases: string[];
    emotionalTone: 'cálida' | 'fría' | 'variable';
    commonEmojis?: string[];

    // === BIG FIVE (OCEAN) - Personality ===
    bigFive: {
        openness: number;         // 1-10: Creatividad, curiosidad
        conscientiousness: number; // 1-10: Organización, responsabilidad
        extraversion: number;      // 1-10: Sociabilidad, energía
        agreeableness: number;     // 1-10: Cooperación, empatía
        neuroticism: number;       // 1-10: Reactividad emocional
    };

    // === ATTACHMENT STYLE ===
    attachment: {
        style: 'seguro' | 'ansioso' | 'evitativo' | 'desorganizado';
        fearOfAbandonment: number;  // 1-10
        avoidanceOfIntimacy: number; // 1-10
        needForReassurance: 'bajo' | 'medio' | 'alto';
        protestBehaviors: string[]; // ["silencio", "mensajes repetidos"]
    };

    // === LOVE LANGUAGE (Chapman) ===
    loveLanguage: {
        primary: 'palabras' | 'actos' | 'tiempo' | 'tacto' | 'regalos';
        secondary: 'palabras' | 'actos' | 'tiempo' | 'tacto' | 'regalos';
        howExpressesLove: string[];
        howNeedsLove: string[];
    };

    // === EMOTIONAL INTELLIGENCE (Goleman) ===
    emotionalIntelligence: {
        selfAwareness: number;   // 1-10
        selfRegulation: number;  // 1-10
        empathy: number;         // 1-10
        socialSkills: number;    // 1-10
        motivation: number;      // 1-10
    };

    // === MBTI-INSPIRED COMMUNICATION PATTERNS ===
    mbtiPatterns: {
        energySource: 'extrovertida' | 'introvertida';
        informationStyle: 'detallista' | 'conceptual';
        decisionStyle: 'lógica' | 'emocional';
        lifestyleStyle: 'estructurada' | 'flexible';
    };

    // === EMOTIONAL TRIGGERS & REACTIONS ===
    triggers: {
        positive: string[];      // Qué le alegra
        negative: string[];      // Qué le molesta
        calming: string[];       // Qué la calma
        angerResponse: 'explota' | 'se cierra' | 'sarcasmo' | 'llora' | 'confronta';
        sadnessResponse: 'busca consuelo' | 'se aísla' | 'indirectas' | 'comparte';
        jealousyResponse: 'preguntas' | 'distancia' | 'acusaciones' | 'ninguno';
    };

    // === LINGUISTIC PATTERNS (LIWC-inspired) ===
    linguistics: {
        formality: 'muy informal' | 'informal' | 'mixto' | 'formal';
        avgMessageLength: 'corto' | 'medio' | 'largo';
        emojiFrequency: 'nunca' | 'raro' | 'frecuente' | 'excesivo';
        responseTime: 'instantáneo' | 'normal' | 'lento' | 'inconsistente';
        initiatesConversation: number; // 0-1
        humorType: 'sarcástico' | 'dulce' | 'negro' | 'absurdo' | 'ninguno';
        signatureWords: string[];
        typosFrequency: 'ninguno' | 'raro' | 'frecuente';
        // NEW: LIWC-inspired fields
        ghostingTendency: 'nunca' | 'rara vez' | 'ocasional' | 'frecuente';
        capitalization: 'normal' | 'TODO MAYÚSCULAS' | 'todo minúsculas' | 'mixto';
        petNames: string[];      // ["amor", "bb", "mi vida"]
        insultPatterns: string[]; // ["tonto", "idiota"] - when angry
        pronounUsage: {
            firstPerson: 'alto' | 'medio' | 'bajo';  // Correlación con neuroticismo
            secondPerson: 'alto' | 'medio' | 'bajo'; // Correlación con agreeableness
            weUs: 'alto' | 'medio' | 'bajo';         // Conexión relacional
        };
    };

    // === RELATIONSHIP DYNAMICS ===
    relationshipDynamics: {
        powerDynamic: 'dominante' | 'sumisa' | 'igualitaria';
        jealousyLevel: number;   // 1-10
        trustDefault: number;    // 1-10
        conflictStyle: 'habla' | 'evita' | 'explota' | 'manipula';
        forgivenessStyle: 'fácil' | 'con tiempo' | 'difícil' | 'rencorosa';
    };

    // === CONTEXTUAL RESPONSE PATTERNS ===
    responsePatterns: {
        whenHappy: string[];
        whenAngry: string[];
        whenSad: string[];
        whenJealous: string[];
        whenIgnored: string[];
        whenComplimented: string[];
    };

    // === RED FLAGS & TOPICS ===
    topicsOfInterest: string[];
    redFlags: string[];

    // === LEGACY (keeping for compatibility) ===
    attachmentStyle?: 'seguro' | 'ansioso' | 'evitativo' | 'desorganizado';
    messageSamples?: MessageSamples;
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
    // Android: "11/23/23, 11:02 PM - Usuario: Mensaje"
    // iOS: "[11/23/23, 11:02:15 PM] Usuario: Mensaje"
    // Euro/Latam: "23/11/23 11:02 - Usuario: Mensaje"
    // Spanish: "23/11/23, 11:02 a. m. - Usuario: Mensaje"

    // Regex explanation:
    // 1. Optional opening bracket \[?
    // 2. Date: \d{1,2}[./-]\d{1,2}[./-]\d{2,4}
    // 3. Separator: [,\s]+
    // 4. Time: \d{1,2}:\d{2}(?::\d{2})?
    // 5. AM/PM (optional, flexible): (?:\s?[ap]\.?\s?m\.?)?
    // 6. Optional closing bracket \]?
    // 7. Separator: \s*(?:-|:)?\s*
    // 8. Sender: ([^:]+)
    // 9. Message: (.+)
    const whatsappRegex = /^\[?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\]?\s*(?:-|:)?\s*([^:]+):\s(.+)$/i;
    // Fallback regex for different formats (sometimes the separator is different)
    const whatsappFallbackRegex = /^\[?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\]?\s*([^:]+):\s(.+)$/i;

    let matchedLines = 0;
    let skippedSystemMessages = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim(); // Trim whitespace including \r

        if (!line) continue; // Skip empty lines

        let match = line.match(whatsappRegex);
        if (!match) match = line.match(whatsappFallbackRegex);

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
                sender: senderName.trim(), // CRITICAL FIX: Guardar el nombre REAL del sender
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

// Internal helper for retrying AI calls with timeout
async function generateWithRetry(model: any, prompt: string, retries = 2, timeoutMs = 30000): Promise<string> {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`[AI Call] Attempt ${i + 1}/${retries + 1}, timeout: ${timeoutMs}ms`);

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`API timeout after ${timeoutMs}ms`)), timeoutMs)
            );

            // Race between API call and timeout
            const result = await Promise.race([
                model.generateContent(prompt),
                timeoutPromise
            ]);

            const text = result.response.text();
            console.log(`[AI Call] Success! Response length: ${text.length} chars`);
            return text;
        } catch (error: any) {
            lastError = error;
            console.warn(`[AI Retry ${i}] Failed:`, error?.message || error);
            if (i < retries) {
                const waitTime = 2000 * (i + 1);
                console.log(`[AI Call] Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
}

// Analyze personality from messages - MULTI-STAGE FOR ROBUSTNESS
export async function analyzePersonality(
    messages: ParsedMessage[],
    exName: string,
    onProgress?: (progress: number, status: string) => void
): Promise<ExProfile> {
    const startTime = Date.now();
    console.log('[analyzePersonality] 🎯 STARTING MULTI-STAGE ANALYSIS');
    console.log('[analyzePersonality] Input messages:', messages.length);
    console.log('[analyzePersonality] Ex name:', exName);
    console.log('[analyzePersonality] API Key present:', !!GEMINI_API_KEY);
    console.log('[analyzePersonality] API Key prefix:', GEMINI_API_KEY?.substring(0, 10) + '...');

    if (!GEMINI_API_KEY) {
        console.error('[analyzePersonality] ❌ NO API KEY!');
        throw new Error('API Key de Gemini no configurada. Verifica la configuración.');
    }

    onProgress?.(5, 'Preparando mensajes...');
    console.log('[analyzePersonality] Progress: 5% - Preparing messages');

    // Use intelligent sampling
    const { messages: sampledMessages } = intelligentTokenSampling(messages);
    console.log('[analyzePersonality] Sampled messages:', sampledMessages.length);

    onProgress?.(10, 'Detectando participantes...');
    console.log('[analyzePersonality] Progress: 10% - Detecting participants');

    // Contar cuántos mensajes tiene cada participante (ahora el sender es el nombre real)
    const senderCounts = new Map<string, number>();
    sampledMessages.forEach(msg => {
        const name = msg.sender.trim();
        senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
    });

    console.log('[analyzePersonality] 📊 Participants found:', Array.from(senderCounts.keys()));
    console.log('[analyzePersonality] 📝 Message distribution:', Object.fromEntries(senderCounts));

    // Buscar el nombre de la ex (matching flexible, case-insensitive)
    const exNameLower = exName.toLowerCase().trim();
    const exSenderName = Array.from(senderCounts.keys()).find(name => {
        const nameLower = name.toLowerCase().trim();
        // Match exacto, o si uno contiene al otro
        return nameLower === exNameLower ||
            nameLower.includes(exNameLower) ||
            exNameLower.includes(nameLower);
    });

    if (!exSenderName) {
        console.warn('[analyzePersonality] ⚠️ No se encontró participante que coincida con:', exName);
        console.warn('[analyzePersonality] Participantes disponibles:', Array.from(senderCounts.keys()));
        throw new Error(`No se pudo identificar a "${exName}" en el chat. Participantes detectados: ${Array.from(senderCounts.keys()).join(', ')}`);
    }

    console.log('[analyzePersonality] ✅ Ex identificada como:', exSenderName);

    // Filtrar mensajes de la ex (ahora es super simple!)
    const exMessages = sampledMessages.filter(m => m.sender === exSenderName);

    console.log('[analyzePersonality] 📝 Total sampled messages:', sampledMessages.length);
    console.log('[analyzePersonality] 💬 Ex messages found:', exMessages.length);

    if (exMessages.length < 10) {
        throw new Error(`Se encontraron solo ${exMessages.length} mensajes de ${exSenderName}. Se necesitan al menos 10 para un análisis sólido.`);
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
        }
    });

    // --- STAGE 1: Communication Style & Patterns ---
    onProgress?.(30, 'Analizando estilo de comunicación...');

    // Take a distributed sample from the already-intelligently-sampled messages
    // (exMessages is already ~25k from 200k+ original, we need ~500-1000 for prompt)
    const firstMessages = exMessages.slice(0, Math.min(200, Math.floor(exMessages.length * 0.1)));
    const lastMessages = exMessages.slice(-Math.min(300, Math.floor(exMessages.length * 0.15)));

    // Middle random sample
    const middleStart = Math.floor(exMessages.length * 0.3);
    const middleEnd = Math.floor(exMessages.length * 0.7);
    const middleMessages = exMessages.slice(middleStart, middleEnd);
    const randomMiddle = middleMessages
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(200, middleMessages.length));

    const promptSample = [...firstMessages, ...randomMiddle, ...lastMessages];
    const styleSample = promptSample.map(m => m.content).join('\n');

    console.log('[analyzePersonality] 📏 Prompt sample:', {
        total: exMessages.length,
        first: firstMessages.length,
        middle: randomMiddle.length,
        last: lastMessages.length,
        promptTotal: promptSample.length,
        chars: styleSample.length
    });
    // ════════════════════════════════════════════════════════════════════════
    // STAGE 1: BIG FIVE (OCEAN) - Core Personality Traits
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(15, 'Analizando personalidad (Big Five)...');

    const bigFivePrompt = `Analiza la personalidad de "${exName}" según el modelo Big Five/OCEAN basado en estos mensajes:
    ${styleSample}
    
    Evalúa cada rasgo del 1-10 basándote en el contenido de los mensajes.
    Responde SOLO con JSON:
    {
      "openness": 1-10,
      "conscientiousness": 1-10,
      "extraversion": 1-10,
      "agreeableness": 1-10,
      "neuroticism": 1-10,
      "communicationStyle": "directa|pasivo-agresiva|evasiva|afectuosa|mixta",
      "emotionalTone": "cálida|fría|variable",
      "commonPhrases": ["5 frases que usa frecuentemente"]
    }`;

    console.log('[analyzePersonality] 📡 Stage 1: Big Five...');
    const bigFiveStr = await generateWithRetry(model, bigFivePrompt);
    const bigFiveData = JSON.parse(bigFiveStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 1 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 2: ATTACHMENT STYLE - Relationship Patterns
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(25, 'Identificando estilo de apego...');

    const attachmentPrompt = `Analiza el estilo de apego de "${exName}" basado en estos mensajes:
    ${styleSample}
    
    Identifica patrones de apego en relaciones.
    Responde SOLO con JSON:
    {
      "style": "seguro|ansioso|evitativo|desorganizado",
      "fearOfAbandonment": 1-10,
      "avoidanceOfIntimacy": 1-10,
      "needForReassurance": "bajo|medio|alto",
      "protestBehaviors": ["2-3 comportamientos cuando siente distancia"]
    }`;

    console.log('[analyzePersonality] 📡 Stage 2: Attachment...');
    const attachmentStr = await generateWithRetry(model, attachmentPrompt);
    const attachmentData = JSON.parse(attachmentStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 2 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 3: LOVE LANGUAGE - How They Express/Need Love
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(35, 'Detectando lenguaje del amor...');

    const loveLanguagePrompt = `Analiza el lenguaje del amor de "${exName}" (teoría de Chapman):
    ${styleSample}
    
    Los 5 lenguajes: palabras (afirmación), actos (servicio), tiempo (calidad), tacto (físico), regalos
    Responde SOLO con JSON:
    {
      "primary": "palabras|actos|tiempo|tacto|regalos",
      "secondary": "palabras|actos|tiempo|tacto|regalos",
      "howExpressesLove": ["2-3 formas en que demuestra cariño"],
      "howNeedsLove": ["2-3 cosas que necesita para sentirse amada"]
    }`;

    console.log('[analyzePersonality] 📡 Stage 3: Love Language...');
    const loveStr = await generateWithRetry(model, loveLanguagePrompt);
    const loveData = JSON.parse(loveStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 3 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 4: EMOTIONAL INTELLIGENCE - Self-awareness & Empathy
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(45, 'Evaluando inteligencia emocional...');

    const eqPrompt = `Evalúa la inteligencia emocional de "${exName}" (modelo Goleman):
    ${styleSample}
    
    Responde SOLO con JSON:
    {
      "selfAwareness": 1-10,
      "selfRegulation": 1-10,
      "empathy": 1-10,
      "socialSkills": 1-10,
      "motivation": 1-10
    }`;

    console.log('[analyzePersonality] 📡 Stage 4: EQ...');
    const eqStr = await generateWithRetry(model, eqPrompt);
    const eqData = JSON.parse(eqStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 4 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 5: MBTI-INSPIRED PATTERNS - Communication Style
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(55, 'Analizando patrones de comunicación...');

    const mbtiPrompt = `Analiza los patrones de comunicación tipo MBTI de "${exName}":
    ${styleSample}
    
    Responde SOLO con JSON:
    {
      "energySource": "extrovertida|introvertida",
      "informationStyle": "detallista|conceptual",
      "decisionStyle": "lógica|emocional",
      "lifestyleStyle": "estructurada|flexible"
    }`;

    console.log('[analyzePersonality] 📡 Stage 5: MBTI patterns...');
    const mbtiStr = await generateWithRetry(model, mbtiPrompt);
    const mbtiData = JSON.parse(mbtiStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 5 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 6: EMOTIONAL TRIGGERS - What Makes Them React
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(65, 'Identificando detonantes emocionales...');

    const triggersPrompt = `Identifica los triggers emocionales de "${exName}":
    ${styleSample}
    
    Responde SOLO con JSON:
    {
      "positive": ["3-4 cosas que le alegran o emocionan"],
      "negative": ["3-4 cosas que le molestan o enojan"],
      "calming": ["2-3 cosas que la calman cuando está alterada"],
      "angerResponse": "explota|se cierra|sarcasmo|llora|confronta",
      "sadnessResponse": "busca consuelo|se aísla|indirectas|comparte",
      "jealousyResponse": "preguntas|distancia|acusaciones|ninguno"
    }`;

    console.log('[analyzePersonality] 📡 Stage 6: Triggers...');
    const triggersStr = await generateWithRetry(model, triggersPrompt);
    const triggersData = JSON.parse(triggersStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 6 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 7: LINGUISTIC PATTERNS & RELATIONSHIP DYNAMICS
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(75, 'Analizando patrones lingüísticos...');

    const linguisticsPrompt = `Analiza los patrones lingüísticos y dinámicas de relación de "${exName}":
    ${styleSample}
    
    Responde SOLO con JSON:
    {
      "linguistics": {
        "formality": "muy informal|informal|mixto|formal",
        "avgMessageLength": "corto|medio|largo",
        "emojiFrequency": "nunca|raro|frecuente|excesivo",
        "responseTime": "instantáneo|normal|lento|inconsistente",
        "initiatesConversation": 0.0-1.0,
        "humorType": "sarcástico|dulce|negro|absurdo|ninguno",
        "signatureWords": ["5-8 palabras o expresiones características"],
        "typosFrequency": "ninguno|raro|frecuente",
        "ghostingTendency": "nunca|rara vez|ocasional|frecuente",
        "capitalization": "normal|TODO MAYÚSCULAS|todo minúsculas|mixto",
        "petNames": ["3-5 apodos cariñosos que usa"],
        "insultPatterns": ["2-3 insultos o frases despectivas cuando está enojada"],
        "pronounUsage": {
          "firstPerson": "alto|medio|bajo",
          "secondPerson": "alto|medio|bajo",
          "weUs": "alto|medio|bajo"
        }
      },
      "relationshipDynamics": {
        "powerDynamic": "dominante|sumisa|igualitaria",
        "jealousyLevel": 1-10,
        "trustDefault": 1-10,
        "conflictStyle": "habla|evita|explota|manipula",
        "forgivenessStyle": "fácil|con tiempo|difícil|rencorosa"
      }
    }`;

    console.log('[analyzePersonality] 📡 Stage 7: Linguistics & Dynamics...');
    const linguisticsStr = await generateWithRetry(model, linguisticsPrompt);
    const linguisticsData = JSON.parse(linguisticsStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 7 complete');

    // Rate limiting delay
    await delay(STAGE_DELAY_MS);

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 8: RESPONSE PATTERNS & FINAL SYNTHESIS
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(85, 'Sintetizando patrones de respuesta...');

    const finalPrompt = `Sintetiza los patrones de respuesta contextuales de "${exName}":
    ${styleSample}
    
    Responde SOLO con JSON:
    {
      "responsePatterns": {
        "whenHappy": ["2-3 formas de expresarse cuando está feliz"],
        "whenAngry": ["2-3 formas de expresarse cuando está enojada"],
        "whenSad": ["2-3 formas de expresarse cuando está triste"],
        "whenJealous": ["2-3 formas de expresarse cuando siente celos"],
        "whenIgnored": ["2-3 formas de reaccionar cuando la ignoran"],
        "whenComplimented": ["2-3 formas de responder a cumplidos"]
      },
      "topicsOfInterest": ["4-6 temas que le interesan o menciona frecuentemente"],
      "redFlags": ["2-4 patrones potencialmente problemáticos detectados"]
    }`;

    console.log('[analyzePersonality] 📡 Stage 8: Final Synthesis...');
    const finalStr = await generateWithRetry(model, finalPrompt);
    const finalData = JSON.parse(finalStr.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('[analyzePersonality] ✅ Stage 8 complete');

    // ════════════════════════════════════════════════════════════════════════
    // STAGE 9: Extract Real Message Samples
    // ════════════════════════════════════════════════════════════════════════
    onProgress?.(95, 'Extrayendo muestras de mensajes...');

    console.log('[analyzePersonality] Extracting message samples...');
    const messageSamples = extractMessageSamples(sampledMessages, exSenderName);
    console.log('[analyzePersonality] ✅ Samples extracted:', {
        exMessages: messageSamples.exMessages.length,
        conversations: messageSamples.conversations.length,
        emojis: messageSamples.commonEmojis.length
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[analyzePersonality] 🎉 ANALYSIS COMPLETE in ${duration}s`);

    onProgress?.(100, '¡Análisis completo!');

    // ════════════════════════════════════════════════════════════════════════
    // BUILD COMPREHENSIVE PROFILE
    // ════════════════════════════════════════════════════════════════════════
    return {
        exName,
        relationshipStatus: 'ex',

        // Basic Communication
        communicationStyle: bigFiveData.communicationStyle || 'mixta',
        commonPhrases: bigFiveData.commonPhrases || [],
        emotionalTone: bigFiveData.emotionalTone || 'variable',
        commonEmojis: messageSamples.commonEmojis,

        // Big Five (OCEAN)
        bigFive: {
            openness: bigFiveData.openness || 5,
            conscientiousness: bigFiveData.conscientiousness || 5,
            extraversion: bigFiveData.extraversion || 5,
            agreeableness: bigFiveData.agreeableness || 5,
            neuroticism: bigFiveData.neuroticism || 5
        },

        // Attachment Style
        attachment: {
            style: attachmentData.style || 'seguro',
            fearOfAbandonment: attachmentData.fearOfAbandonment || 5,
            avoidanceOfIntimacy: attachmentData.avoidanceOfIntimacy || 5,
            needForReassurance: attachmentData.needForReassurance || 'medio',
            protestBehaviors: attachmentData.protestBehaviors || []
        },

        // Love Language
        loveLanguage: {
            primary: loveData.primary || 'tiempo',
            secondary: loveData.secondary || 'palabras',
            howExpressesLove: loveData.howExpressesLove || [],
            howNeedsLove: loveData.howNeedsLove || []
        },

        // Emotional Intelligence
        emotionalIntelligence: {
            selfAwareness: eqData.selfAwareness || 5,
            selfRegulation: eqData.selfRegulation || 5,
            empathy: eqData.empathy || 5,
            socialSkills: eqData.socialSkills || 5,
            motivation: eqData.motivation || 5
        },

        // MBTI Patterns
        mbtiPatterns: {
            energySource: mbtiData.energySource || 'extrovertida',
            informationStyle: mbtiData.informationStyle || 'conceptual',
            decisionStyle: mbtiData.decisionStyle || 'emocional',
            lifestyleStyle: mbtiData.lifestyleStyle || 'flexible'
        },

        // Emotional Triggers
        triggers: {
            positive: triggersData.positive || [],
            negative: triggersData.negative || [],
            calming: triggersData.calming || [],
            angerResponse: triggersData.angerResponse || 'se cierra',
            sadnessResponse: triggersData.sadnessResponse || 'se aísla',
            jealousyResponse: triggersData.jealousyResponse || 'ninguno'
        },

        // Linguistic Patterns
        linguistics: {
            formality: linguisticsData.linguistics?.formality || 'informal',
            avgMessageLength: linguisticsData.linguistics?.avgMessageLength || 'medio',
            emojiFrequency: linguisticsData.linguistics?.emojiFrequency || 'frecuente',
            responseTime: linguisticsData.linguistics?.responseTime || 'normal',
            initiatesConversation: linguisticsData.linguistics?.initiatesConversation || 0.5,
            humorType: linguisticsData.linguistics?.humorType || 'ninguno',
            signatureWords: linguisticsData.linguistics?.signatureWords || [],
            typosFrequency: linguisticsData.linguistics?.typosFrequency || 'raro',
            // NEW: LIWC-inspired fields
            ghostingTendency: linguisticsData.linguistics?.ghostingTendency || 'rara vez',
            capitalization: linguisticsData.linguistics?.capitalization || 'normal',
            petNames: linguisticsData.linguistics?.petNames || [],
            insultPatterns: linguisticsData.linguistics?.insultPatterns || [],
            pronounUsage: {
                firstPerson: linguisticsData.linguistics?.pronounUsage?.firstPerson || 'medio',
                secondPerson: linguisticsData.linguistics?.pronounUsage?.secondPerson || 'medio',
                weUs: linguisticsData.linguistics?.pronounUsage?.weUs || 'medio'
            }
        },

        // Relationship Dynamics
        relationshipDynamics: {
            powerDynamic: linguisticsData.relationshipDynamics?.powerDynamic || 'igualitaria',
            jealousyLevel: linguisticsData.relationshipDynamics?.jealousyLevel || 5,
            trustDefault: linguisticsData.relationshipDynamics?.trustDefault || 5,
            conflictStyle: linguisticsData.relationshipDynamics?.conflictStyle || 'evita',
            forgivenessStyle: linguisticsData.relationshipDynamics?.forgivenessStyle || 'con tiempo'
        },

        // Response Patterns
        responsePatterns: {
            whenHappy: finalData.responsePatterns?.whenHappy || [],
            whenAngry: finalData.responsePatterns?.whenAngry || [],
            whenSad: finalData.responsePatterns?.whenSad || [],
            whenJealous: finalData.responsePatterns?.whenJealous || [],
            whenIgnored: finalData.responsePatterns?.whenIgnored || [],
            whenComplimented: finalData.responsePatterns?.whenComplimented || []
        },

        // Topics & Red Flags
        topicsOfInterest: finalData.topicsOfInterest || [],
        redFlags: finalData.redFlags || [],

        // Legacy compatibility
        attachmentStyle: attachmentData.style || 'seguro',
        messageSamples
    };
}


// Generate system prompt for simulation - ADVANCED PSYCHOLOGICAL VERSION
export function generateSystemPrompt(profile: ExProfile, conversationHistory: ParsedMessage[]): string {
    const recentMessages = conversationHistory.slice(-50).map(m =>
        `${m.sender === 'ex' ? profile.exName : 'Usuario'}: ${m.content}`
    ).join('\n');

    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? 'mañana' : now.getHours() < 18 ? 'tarde' : 'noche';
    const dayOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][now.getDay()];

    const relationshipContext = profile.relationshipStatus === 'partner'
        ? `Eres SU PAREJA ACTUAL. La relación está activa y viva.`
        : `Eres SU EX PAREJA. La relación terminó.`;

    // Build comprehensive personality description
    const bigFiveDesc = profile.bigFive ? `
- Apertura a experiencias: ${profile.bigFive.openness}/10 (${profile.bigFive.openness > 6 ? 'creativa, curiosa' : 'práctica, tradicional'})
- Responsabilidad: ${profile.bigFive.conscientiousness}/10 (${profile.bigFive.conscientiousness > 6 ? 'organizada' : 'flexible/caótica'})
- Extroversión: ${profile.bigFive.extraversion}/10 (${profile.bigFive.extraversion > 6 ? 'sociable, enérgica' : 'reservada, tranquila'})  
- Amabilidad: ${profile.bigFive.agreeableness}/10 (${profile.bigFive.agreeableness > 6 ? 'cooperativa, empática' : 'directa, competitiva'})
- Estabilidad emocional: ${10 - profile.bigFive.neuroticism}/10 (${profile.bigFive.neuroticism > 6 ? 'reactiva, intensa' : 'calmada, estable'})` : '';

    const attachmentDesc = profile.attachment ? `
ESTILO DE APEGO: ${profile.attachment.style.toUpperCase()}
- Miedo al abandono: ${profile.attachment.fearOfAbandonment}/10
- Evitación de intimidad: ${profile.attachment.avoidanceOfIntimacy}/10  
- Necesidad de reafirmación: ${profile.attachment.needForReassurance}
- Comportamientos de protesta: ${profile.attachment.protestBehaviors?.join(', ') || 'ninguno específico'}` : '';

    const loveLanguageDesc = profile.loveLanguage ? `
LENGUAJE DEL AMOR:
- Principal: ${profile.loveLanguage.primary}
- Secundario: ${profile.loveLanguage.secondary}
- Cómo demuestra amor: ${profile.loveLanguage.howExpressesLove?.join(', ') || 'formas variadas'}
- Qué necesita para sentirse amada: ${profile.loveLanguage.howNeedsLove?.join(', ') || 'atención'}` : '';

    const eqDesc = profile.emotionalIntelligence ? `
INTELIGENCIA EMOCIONAL:
- Autoconciencia: ${profile.emotionalIntelligence.selfAwareness}/10
- Autorregulación: ${profile.emotionalIntelligence.selfRegulation}/10  
- Empatía: ${profile.emotionalIntelligence.empathy}/10
- Habilidades sociales: ${profile.emotionalIntelligence.socialSkills}/10` : '';

    const triggersDesc = profile.triggers ? `
DETONANTES EMOCIONALES:
✓ Lo que le alegra: ${profile.triggers.positive?.join(', ') || 'cumplidos, atención'}
✗ Lo que le molesta: ${profile.triggers.negative?.join(', ') || 'ser ignorada'}
⚖ Lo que la calma: ${profile.triggers.calming?.join(', ') || 'espacio, validación'}
- Cuando se enoja: ${profile.triggers.angerResponse}
- Cuando está triste: ${profile.triggers.sadnessResponse}
- Cuando siente celos: ${profile.triggers.jealousyResponse}` : '';

    const linguisticsDesc = profile.linguistics ? `
ESTILO DE ESCRITURA:
- Formalidad: ${profile.linguistics.formality}
- Largo de mensajes: ${profile.linguistics.avgMessageLength}
- Uso de emojis: ${profile.linguistics.emojiFrequency}
- Tipo de humor: ${profile.linguistics.humorType}
- Palabras características: ${profile.linguistics.signatureWords?.join(', ') || 'variado'}` : '';

    const dynamicsDesc = profile.relationshipDynamics ? `
DINÁMICA RELACIONAL:
- Poder: ${profile.relationshipDynamics.powerDynamic}
- Nivel de celos: ${profile.relationshipDynamics.jealousyLevel}/10
- Confianza base: ${profile.relationshipDynamics.trustDefault}/10
- Estilo en conflictos: ${profile.relationshipDynamics.conflictStyle}
- Perdón: ${profile.relationshipDynamics.forgivenessStyle}` : '';

    const mbtiDesc = profile.mbtiPatterns ? `
PATRÓN DE COMUNICACIÓN:
- Energía: ${profile.mbtiPatterns.energySource}
- Información: ${profile.mbtiPatterns.informationStyle}  
- Decisiones: ${profile.mbtiPatterns.decisionStyle}
- Estilo de vida: ${profile.mbtiPatterns.lifestyleStyle}` : '';

    const responsePatternsDesc = profile.responsePatterns ? `
PATRONES DE RESPUESTA CONTEXTUAL:
- Cuando está feliz: ${profile.responsePatterns.whenHappy?.join(', ') || 'mensajes alegres'}
- Cuando está enojada: ${profile.responsePatterns.whenAngry?.join(', ') || 'respuestas cortantes'}
- Cuando está triste: ${profile.responsePatterns.whenSad?.join(', ') || 'mensajes melancólicos'}
- Cuando siente celos: ${profile.responsePatterns.whenJealous?.join(', ') || 'preguntas indirectas'}
- Cuando la ignoran: ${profile.responsePatterns.whenIgnored?.join(', ') || 'se retira'}
- Cuando la halagan: ${profile.responsePatterns.whenComplimented?.join(', ') || 'agradece'}` : '';

    return `═══════════════════════════════════════════════════════════════════
SIMULACIÓN AVANZADA DE PERSONALIDAD: ${profile.exName}
═══════════════════════════════════════════════════════════════════

Eres ${profile.exName}. ${relationshipContext}

CONTEXTO TEMPORAL:
- Es ${dayOfWeek} por la ${timeOfDay}.
- Actúa como una persona real con vida propia (trabajo, estudios, amigos).
- Si no respondes de inmediato es porque estás ocupada.

═══════════════════════════════════════════════════════════════════
PERFIL PSICOLÓGICO COMPLETO
═══════════════════════════════════════════════════════════════════

COMUNICACIÓN BASE:
- Estilo: ${profile.communicationStyle}
- Tono emocional: ${profile.emotionalTone}
- Frases características: ${profile.commonPhrases?.map(p => `"${p}"`).join(', ') || 'variadas'}
- Emojis favoritos: ${profile.commonEmojis?.join(' ') || '😊'}
${bigFiveDesc}
${attachmentDesc}
${loveLanguageDesc}
${eqDesc}
${triggersDesc}
${linguisticsDesc}
${dynamicsDesc}
${mbtiDesc}
${responsePatternsDesc}

TEMAS DE INTERÉS:
${profile.topicsOfInterest?.join(', ') || 'diversos'}

═══════════════════════════════════════════════════════════════════
CONVERSACIÓN RECIENTE
═══════════════════════════════════════════════════════════════════
${recentMessages}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES CRÍTICAS DE SIMULACIÓN
═══════════════════════════════════════════════════════════════════

1. RESPONDE EXACTAMENTE como ${profile.exName} respondería basándote en TODO su perfil psicológico.
2. USA sus patrones lingüísticos: ${profile.linguistics?.formality || 'informal'}, mensajes ${profile.linguistics?.avgMessageLength || 'medios'}.
3. USA sus palabras características: ${profile.linguistics?.signatureWords?.slice(0, 5).join(', ') || 'propias'}.
4. RESPETA su estilo de apego ${profile.attachment?.style || 'seguro'} - ${profile.attachment?.style === 'ansioso' ? 'puede buscar reafirmación' : profile.attachment?.style === 'evitativo' ? 'puede necesitar espacio' : 'comunicación equilibrada'}.
5. MANTÉN coherencia con su inteligencia emocional (empatía ${profile.emotionalIntelligence?.empathy || 5}/10).
6. SI detectas que el usuario está molesto/triste, responde según sus patrones: ${profile.triggers?.calming?.join(', ') || 'de forma calmada'}.
7. USA emojis con frecuencia "${profile.linguistics?.emojiFrequency || 'moderada'}": ${profile.commonEmojis?.slice(0, 5).join(' ') || '😊❤️'}.

⚠️ PROHIBICIONES ABSOLUTAS:
- NUNCA empieces tu respuesta con "${profile.exName}:" ni con tu nombre
- NUNCA digas el nombre del usuario en la respuesta (no digas "Hola [nombre]")
- NUNCA inventes fechas de aniversarios, cumpleaños o eventos si no los sabes
- Si te preguntan algo que NO SABES (como fechas), di "no me acuerdo bien" o "creo que era..." de forma evasiva
- NUNCA inventes datos factuales específicos (fechas, lugares, nombres de personas)
- Solo responde el texto del mensaje, sin prefijos ni etiquetas

Responde directamente el contenido del mensaje (sin poner tu nombre antes):`;
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
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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

    let fullPrompt = `${systemPrompt}\n\n`;

    if (userMessage) {
        fullPrompt += `Usuario: ${userMessage}`;
    } else {
        fullPrompt += `(Contexto: El usuario ha estado en silencio. Inicia tú una conversación casual o continúa un tema pendiente.)`;
    }

    const promptParts: any[] = [fullPrompt];

    if (userImage) {
        promptParts.push({ inlineData: { data: userImage, mimeType: 'image/jpeg' } });
        fullPrompt += `\n[El usuario ha enviado una imagen]`;
    }

    fullPrompt += `\n\n${profile.exName}:`;
    promptParts[0] = fullPrompt; // Update text part

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
