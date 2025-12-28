import { GoogleGenerativeAI } from '@google/generative-ai';
import { intelligentTokenSampling } from './messageSampling';
import { extractMessageSamples, MessageSamples } from './messageSampleExtractor';

// TEMPORAL: Hardcodeando la API Key para bypasear el problema de Expo Web
// TODO: Revertir esto antes de hacer commit!
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

console.log('[Gemini] ? API Key HARDCODEADA para testing local');
console.log('[Gemini] API Key detectada (comienza con:', GEMINI_API_KEY.substring(0, 8), '...)');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Rate limiting helper - wait between API calls to prevent 429 errors
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const STAGE_DELAY_MS = 500; // 500ms between stages (reduced from 2000ms for faster analysis)

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
    relationshipType?: 'ex' | 'friend' | 'crush' | 'partner' | 'family_parent' | 'family_sibling' | 'family_other' | 'deceased' | 'acquaintance';

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

    // === NEW: LINGUISTIC FINGERPRINT (Idiolecto Digital) ===
    linguisticFingerprint?: {
        // Micro-sintaxis
        usesCapitals: boolean;           // ¿Mayúscula inicial?
        usesOpeningMarks: boolean;       // ¿Usa ¿ y ¡?
        periodMeaning: 'normal' | 'pasivo-agresivo';

        // Gestión de risa
        laughStyle: string[];            // ["jajaja", "JAJA", "jiji", "??"]

        // Muletillas y regionalismos
        fillerWords: string[];           // ["literal", "o sea", "en plan"]
        regionalisms: string[];          // Palabras regionales

        // Saludos y despedidas
        greetings: string[];             // ["holi", "qué onda", "hey bb"]
        farewells: string[];             // ["bye", "tkm", "besitos"]
    };

    // === NEW: COGNITIVE PATTERNS (Defectos y Sesgos) ===
    cognitivePatterns?: {
        rigidity: number;                // 1-10: Terquedad
        narcissismLevel: number;         // 1-10: ¿Gira todo hacia él/ella?
        victimMentality: number;         // 1-10: ¿Se victimiza?
        deflectionStyle: 'culpa al otro' | 'cambia tema' | 'niega' | 'ninguno';
        triggerTopics: string[];         // Temas que lo enojan
    };

    // === NEW: MANIPULATION PATTERNS ===
    manipulationPatterns?: {
        gaslighting: {
            detected: boolean;
            phrases: string[];           // ["estás loca", "yo nunca dije eso"]
        };
        guiltTripping: {
            detected: boolean;
            phrases: string[];           // ["supongo que no te importo"]
        };
        silentTreatment: {
            frequency: 'nunca' | 'raro' | 'frecuente';
            typicalDuration: string;
        };
        loveBombing: boolean;
        controlBehavior: string[];       // ["dónde estás", "con quién"]
    };

    // === NEW: SHARED MEMORY (Memoria Compartida) ===
    sharedMemory?: {
        insideJokes: string[];           // Chistes internos
        mentionedPeople: {
            name: string;
            relationship: string;        // "amiga", "mamá"
            sentiment: 'positivo' | 'negativo' | 'neutral';
        }[];
        importantDates: string[];        // Fechas mencionadas
        significantPlaces: string[];     // Lugares importantes
        conflictTopics: string[];        // Temas de pelea
        sharedMemories: string[];        // Recuerdos compartidos
    };

    // === NEW: DIGITAL BODY LANGUAGE ===
    digitalBodyLanguage?: {
        responseSpeed: 'instantáneo' | 'minutos' | 'horas' | 'inconsistente';
        doubleTexting: boolean;          // ¿Manda mensaje tras mensaje?
        readReceiptAnxiety: boolean;     // ¿Se queja del "visto"?
        emojiToTextRatio: 'bajo' | 'medio' | 'alto';
        voiceNoteUsage: 'nunca' | 'raro' | 'frecuente';
        allCapsWhen: 'enojado' | 'emocionado' | 'siempre' | 'nunca';
    };

    // === NEW: DARK TRIAD (Narcisismo, Maquiavelismo, Psicopatía) ===
    darkTriad?: {
        narcissism: {
            level: number;               // 1-10
            grandiosity: number;
            needForAdmiration: number;
            lackOfEmpathy: number;
            examples: string[];
        };
        machiavellianism: {
            level: number;               // 1-10
            manipulation: number;
            cynicism: number;
            prioritizeSelf: number;
            examples: string[];
        };
        psychopathy: {
            level: number;               // 1-10
            impulsivity: number;
            lackOfRemorse: number;
            superficialCharm: number;
            examples: string[];
        };
        overallDarkness: number;         // 1-10 promedio
        warningFlags: string[];          // Señales de alerta
    };

    // === NEW: LA SOMBRA (Jung - Lo que reprime) ===
    shadow?: {
        repressedTraits: string[];       // Rasgos que reprime
        emergentBehavior: {
            underStress: string[];       // Cómo actúa bajo estrés
            whenHurt: string[];          // Cuando está herida
            whenCornered: string[];      // Cuando se siente acorralada
        };
        projections: string[];           // Defectos que proyecta en otros
        contradictions: string[];        // Contradicciones palabras/acciones
        defenseMechanisms: string[];     // Mecanismos de defensa
        hiddenFears: string[];           // Miedos ocultos
        triggerTopics: string[];         // Temas que provocan reacción
    };

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

    console.log(`[parseWhatsAppExport] ?? Starting parse...`);
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
    let multiLineAppends = 0;
    let currentMessage: ParsedMessage | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim(); // Trim whitespace including \r

        if (!line) continue; // Skip empty lines

        let match = line.match(whatsappRegex);
        if (!match) match = line.match(whatsappFallbackRegex);

        if (match) {
            // New message found - save previous one if exists
            if (currentMessage) {
                messages.push(currentMessage);
            }

            matchedLines++;
            const [, timestamp, senderName, content] = match;

            // Log first 3 matches for debugging
            if (matchedLines <= 3) {
                console.log(`[parseWhatsAppExport] ? Match ${matchedLines}: ${timestamp} - ${senderName}: ${content.substring(0, 30)}...`);
            }

            // Detect if message has media
            const hasMedia = content.includes('<Media omitted>') ||
                content.includes('imagen omitida') ||
                content.includes('video omitido');

            // Create new current message (will be pushed on next match or at end)
            currentMessage = {
                timestamp,
                sender: senderName.trim(), // CRITICAL FIX: Guardar el nombre REAL del sender
                content: hasMedia ? '[Imagen/Video]' : content,
                hasMedia
            };
        } else if (currentMessage) {
            // MULTI-LINE SUPPORT: Line doesn't match timestamp pattern
            // This means it's a continuation of the previous message
            currentMessage.content += '\n' + line;
            multiLineAppends++;

            if (multiLineAppends <= 5) {
                console.log(`[parseWhatsAppExport] ?? Multi-line append #${multiLineAppends}: "${line.substring(0, 50)}..."`);
            }
        } else if (i < 10) {
            // Log first 10 non-matching lines that have no previous message
            skippedSystemMessages++;
            console.log(`[parseWhatsAppExport] ??  Skip line ${i}: "${line.substring(0, 80)}"`);
        }
    }

    // Don't forget to push the last message!
    if (currentMessage) {
        messages.push(currentMessage);
    }

    console.log(`[parseWhatsAppExport] ? Parsing complete!`);
    console.log(`[parseWhatsAppExport] Total messages parsed: ${messages.length}`);
    console.log(`[parseWhatsAppExport] Matched lines: ${matchedLines}`);
    console.log(`[parseWhatsAppExport] Multi-line appends: ${multiLineAppends}`);
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

export async function analyzePersonality(
    messages: ParsedMessage[],
    exName: string,
    onProgress?: (progress: number, status: string) => void
): Promise<ExProfile> {
    const startTime = Date.now();
    console.log('[analyzePersonality] ?? STARTING OPTIMIZED 3-STAGE ANALYSIS');

    if (!GEMINI_API_KEY) {
        throw new Error('API Key de Gemini no configurada.');
    }

    onProgress?.(5, 'Preparando mensajes...');
    const { messages: sampledMessages } = intelligentTokenSampling(messages);

    // Quick sender detection
    const senderCounts = new Map<string, number>();
    sampledMessages.forEach(msg => {
        const name = msg.sender.trim();
        senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
    });

    const exNameLower = exName.toLowerCase().trim();
    const exSenderName = Array.from(senderCounts.keys()).find(name => {
        const nameLower = name.toLowerCase().trim();
        return nameLower === exNameLower || nameLower.includes(exNameLower) || exNameLower.includes(nameLower);
    });

    if (!exSenderName) {
        throw new Error(`No se pudo identificar a "${exName}" en el chat.`);
    }

    const exMessages = sampledMessages.filter(m => m.sender === exSenderName);

    // Prepare styles sample for prompt
    const firstMessages = exMessages.slice(0, Math.min(200, Math.floor(exMessages.length * 0.1)));
    const lastMessages = exMessages.slice(-Math.min(300, Math.floor(exMessages.length * 0.15)));
    const middleStart = Math.floor(exMessages.length * 0.3);
    const middleMessages = exMessages.slice(middleStart, Math.floor(exMessages.length * 0.7));
    const randomMiddle = middleMessages.sort(() => Math.random() - 0.5).slice(0, Math.min(200, middleMessages.length));
    const promptSample = [...firstMessages, ...randomMiddle, ...lastMessages];
    const styleSample = promptSample.map(m => m.content).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // --- REQUEST 1: DEEP PSYCHOLOGICAL PROFILE ---
    onProgress?.(15, 'Analizando perfil psicolÃ³gico profundo...');

    const request1Prompt = `Analiza profundamente a "${exName}" basÃ¡ndote en estos mensajes.
    
    MENSAJES:
    ${styleSample.slice(0, 30000)} // Limit to fit context

    Responde con un JSON vÃ¡lido que incluya:
    1. relationshipType: (ex|partner|friend|etc) con confidence y evidence.
    2. bigFive: (openness, conscientiousness, extraversion, agreeableness, neuroticism) con scores 1-10 y reasons.
    3. attachment: style (seguro|ansioso|evitativo|desorganizado) con spectrum (anxiety 1-10, avoidance 1-10) y analysis.
    4. emotionalTone: primary, secondary, stability (1-10), intensity (1-10).
    5. communication: style (directo|pasivo-agresivo|etc), verbosity (1-10), formality (formal|casual|vulgar).
    6. linguistics: vocabularyComplexity (1-10), emojiFrequency (high|med|low), signatureWords (array string).

    Formato JSON esperado:
    {
      "relationshipType": { "type": "...", "confidence": 8, "evidence": ["..."] },
      "bigFive": { "openness": { "score": 5, "reason": "..." }, ... },
      "attachment": { "style": "...", "spectrum": { "anxiety": 5, "avoidance": 5 }, "analysis": "..." },
      "emotionalTone": { "primary": "...", "secondary": "...", "stability": 5, "intensity": 5 },
      "communication": { "style": "...", "verbosity": 5, "formality": "..." },
      "linguistics": { "vocabularyComplexity": 5, "emojiFrequency": "...", "signatureWords": ["..."] }
    }
    `;

    const result1Str = await generateWithRetry(model, request1Prompt);
    const result1 = safeParseJSON(result1Str, {
        relationshipType: { type: 'acquaintance', confidence: 5, evidence: [] },
        bigFive: {}, attachment: {}, emotionalTone: {}, communication: {}, linguistics: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 2: BEHAVIORAL PATTERNS ---
    onProgress?.(45, 'Analizando patrones de comportamiento...');

    const request2Prompt = `Basado en el mismo perfil de "${exName}", analiza sus patrones de comportamiento.
    
    Responde con un JSON vÃ¡lido que incluya:
    1. activityPatterns: activeHours (array strings), responseTime (rÃ¡pido|lento|variable), consistency (1-10).
    2. topics: recurrent (array strings), passions (array strings), avoided (array strings).
    3. triggers: emotional (quÃ© lo enoja/entristece), calming (quÃ© lo calma), joy (quÃ© le alegra).
    4. commitment: level (1-10), fears (miedo al compromiso/abandono/etc), values (array).
    5. conflict: style (evasivo|confrontativo|mediador), resolution (busca soluciÃ³n|culpa a otros), patience (1-10).

    Formato JSON esperado:
    {
      "activityPatterns": { "activeHours": ["..."], "responseTime": "...", "consistency": 5 },
      "topics": { "recurrent": ["..."], "passions": ["..."], "avoided": ["..."] },
      "triggers": { "emotional": ["..."], "calming": ["..."], "joy": ["..."] },
      "commitment": { "level": 5, "fears": ["..."], "values": ["..."] },
      "conflict": { "style": "...", "resolution": "...", "patience": 5 }
    }
    `;

    const result2Str = await generateWithRetry(model, request2Prompt);
    const result2 = safeParseJSON(result2Str, {
        activityPatterns: {}, topics: {}, triggers: {}, commitment: {}, conflict: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 3: SYNTHESIS & MASTER PROMPT ---
    onProgress?.(75, 'Generando simulaciÃ³n final...');

    const request3Prompt = `Sintetiza el perfil de "${exName}" para una simulaciÃ³n de IA.
    
    Perfil previo:
    - Apego: ${result1.attachment?.style}
    - ComunicaciÃ³n: ${result1.communication?.style}
    - Tono: ${result1.emotionalTone?.primary}
    - Conflictos: ${result2.conflict?.style}

    Responde con un JSON vÃ¡lido que incluya:
    1. affection: expressionStyle (fÃ­sico|palabras|actos), depth (1-10).
    2. stress: response (se aÃ­sla|se enoja|busca apoyo), copingMechanisms (array).
    3. redFlags: array de strings (seÃ±ales de alerta o toxicidad).
    4. greenFlags: array de strings (aspectos positivos).
    5. summary: Un resumen narrativo de su personalidad (2-3 pÃ¡rrafos).
    6. masterPrompt: Un prompt de sistema MUY DETALLADO para instruir a una IA a actuar COMO esta persona. Debe incluir instrucciones sobre cÃ³mo hablar, quÃ© palabras usar, cÃ³mo reaccionar a celos/amor/peleas, y sus "prohibiciones" (ej: no inventar fechas).

    Formato JSON esperado:
    {
      "affection": { "expressionStyle": "...", "depth": 5 },
      "stress": { "response": "...", "copingMechanisms": ["..."] },
      "redFlags": ["..."],
      "greenFlags": ["..."],
      "summary": "...",
      "masterPrompt": "..."
    }
    `;

    const result3Str = await generateWithRetry(model, request3Prompt);
    const result3 = safeParseJSON(result3Str, {
        affection: {}, stress: {}, redFlags: [], greenFlags: [], summary: "Perfil generado", masterPrompt: ""
    });

    onProgress?.(95, 'Finalizando...');

    // Combine all results
    const profile: ExProfile = {
        id: Date.now().toString(),
        exName: exName,
        createdAt: new Date().toISOString(),
        messageCount: messages.length,
        profile: {
            relationshipType: result1.relationshipType?.type || 'unknown',
            confidence: result1.relationshipType?.confidence || 5,
            evidence: result1.relationshipType?.evidence || [],

            bigFive: result1.bigFive,
            attachmentStyle: result1.attachment?.style,
            attachment: result1.attachment,
            emotionalTone: result1.emotionalTone?.primary, // Legacy field
            emotionalToneAnalysis: result1.emotionalTone,

            communicationStyle: result1.communication?.style, // Legacy field
            communication: result1.communication,
            linguistics: result1.linguistics,

            activityPatterns: result2.activityPatterns,
            topics: result2.topics,
            triggers: result2.triggers,

            commitmentLevel: result2.commitment?.level, // Legacy
            commitment: result2.commitment,
            conflictStyle: result2.conflict?.style, // Legacy
            conflict: result2.conflict,

            affection: result3.affection,
            stressResponse: result3.stress,

            redFlags: result3.redFlags,
            greenFlags: result3.greenFlags,
            summary: result3.summary,
            masterPrompt: result3.masterPrompt
        },
        masterPrompt: result3.masterPrompt
    };

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[analyzePersonality] ? Analysis complete in ${duration}s`);
    onProgress?.(100, 'Â¡AnÃ¡lisis completado!');

    return profile;
}
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


function safeParseJSON(jsonString: string, defaultValue: any): any {
    try {
        if (!jsonString) return defaultValue;
        const cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        }
        return JSON.parse(cleaned);
    } catch (e) {
        return defaultValue;
    }
}
