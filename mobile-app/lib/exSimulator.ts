import { GoogleGenerativeAI } from '@google/generative-ai';
import { intelligentTokenSampling } from './messageSampling';
import { extractConversationContext } from './conversationHelpers';
import { extractMessageSamples, MessageSamples } from './messageSampleExtractor';
import { cleanSystemMessages, validateOneOnOneChat, detectLanguage, saveAnalysisProgress, loadAnalysisProgress, clearAnalysisCache, type SupportedLanguage } from './chatValidation';
import { getRelevantFactsForMessage } from './factEmbeddings';
import { storage } from './storage';
import { supabase } from './supabase';

// FALLBACK: Use env var with fallback for production builds
const ENV_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const FALLBACK_KEY = ''; // Removed for GitHub security
const GEMINI_API_KEY = ENV_KEY && ENV_KEY.length > 10 ? ENV_KEY : FALLBACK_KEY;
console.log('[DEBUG] Loaded API Key start:', GEMINI_API_KEY.substring(0, 10), ENV_KEY ? '(from env)' : '(FALLBACK)');


const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Rate limiting helper - wait between API calls to prevent 429 errors
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const STAGE_DELAY_MS = 500; // 0.5s between stages (Flash is faster)

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
    emotionalTone: 'c�lida' | 'fr�a' | 'variable';
    commonEmojis?: string[];

    // === BIG FIVE (OCEAN) - Personality ===
    bigFive: {
        openness: number;         // 1-10: Creatividad, curiosidad
        conscientiousness: number; // 1-10: Organizaci�n, responsabilidad
        extraversion: number;      // 1-10: Sociabilidad, energ�a
        agreeableness: number;     // 1-10: Cooperaci�n, empat�a
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
        decisionStyle: 'l�gica' | 'emocional';
        lifestyleStyle: 'estructurada' | 'flexible';
    };

    // === EMOTIONAL TRIGGERS & REACTIONS ===
    triggers: {
        positive: string[];      // Qu� le alegra
        negative: string[];      // Qu� le molesta
        calming: string[];       // Qu� la calma
        angerResponse: 'explota' | 'se cierra' | 'sarcasmo' | 'llora' | 'confronta';
        sadnessResponse: 'busca consuelo' | 'se a�sla' | 'indirectas' | 'comparte';
        jealousyResponse: 'preguntas' | 'distancia' | 'acusaciones' | 'ninguno';
    };

    // === LINGUISTIC PATTERNS (LIWC-inspired) ===
    linguistics: {
        formality: 'muy informal' | 'informal' | 'mixto' | 'formal';
        avgMessageLength: 'corto' | 'medio' | 'largo';
        emojiFrequency: 'nunca' | 'raro' | 'frecuente' | 'excesivo';
        responseTime: 'instant�neo' | 'normal' | 'lento' | 'inconsistente';
        initiatesConversation: number; // 0-1
        humorType: 'sarc�stico' | 'dulce' | 'negro' | 'absurdo' | 'ninguno';
        signatureWords: string[];
        typosFrequency: 'ninguno' | 'raro' | 'frecuente';
        // NEW: LIWC-inspired fields
        ghostingTendency: 'nunca' | 'rara vez' | 'ocasional' | 'frecuente';
        capitalization: 'normal' | 'TODO MAYSCULAS' | 'todo minsculas' | 'mixto';
        petNames: string[];      // ["amor", "bb", "mi vida"]
        insultPatterns: string[]; // ["tonto", "idiota"] - when angry
        pronounUsage: {
            firstPerson: 'alto' | 'medio' | 'bajo';  // Correlacin con neuroticismo
            secondPerson: 'alto' | 'medio' | 'bajo'; // Correlacin con agreeableness
            weUs: 'alto' | 'medio' | 'bajo';         // Conexin relacional
        };
    };

    // === MESSAGING PATTERN (Feature #2: Double Text Analysis) ===
    messagingPattern?: {
        avgMessagesPerBurst: number;     // Average number of messages sent consecutively
        burstFrequency: number;           // How often sends bursts (0-1)
        avgMessageLength: number;         // Average characters per message
        style: 'metralleta' | 'biblia' | 'balanceado'; // Visual style
        examplesShort?: string[];         // Examples of short bursts
        examplesLong?: string[];          // Examples of long messages
    };

    // === DEFENSIVE TOPICS (Feature #4: Projected Insecurity) ===
    defensiveTopics?: Array<{
        topic: string;              // e.g., "dinero", "ex parejas", "familia"
        examples: string[];         // Examples of defensive responses
        intensity: number;          // 1-10: How defensive they get
        triggerWords: string[];     // Words that trigger defensiveness
    }>;

    // === JEALOUSY TRIGGERS (Feature #5: Jealousy Detector) ===
    jealousyTriggers?: Array<{
        name: string;               // Name of the person
        context: string;            // Relationship (friend, coworker, ex)
        conflictCount: number;      // How many times caused issues
        examples: string[];         // Examples of jealous reactions
    }>;

    // === NICKNAME EVOLUTION (Feature #6: Relationship Phase Simulation) ===
    nicknameEvolution?: Array<{
        nickname: string;           // Pet name used
        startPeriod: string;        // When it started (e.g., "início", "medio", "final")
        endPeriod: string;          // When it ended
        phase: 'honeymoon' | 'stable' | 'crisis' | 'breakup'; // Relationship phase
        frequency: number;          // How often used (1-10)
    }>;

    // === TOP CONFLICTS (Feature #7: Recurring Issues) ===
    topConflicts?: Array<{
        topic: string;              // Topic of conflict (e.g., "tiempo", "celos", "familia")
        occurrences: number;        // How many times it came up
        severity: number;           // 1-10 how serious
        examples: string[];         // Example quotes from conflicts
    }>;

    // === RELATIONSHIP DYNAMICS ===
    relationshipDynamics: {
        powerDynamic: 'dominante' | 'sumisa' | 'igualitaria';
        jealousyLevel: number;   // 1-10
        trustDefault: number;    // 1-10
        conflictStyle: 'habla' | 'evita' | 'explota' | 'manipula';
        forgivenessStyle: 'fcil' | 'con tiempo' | 'difcil' | 'rencorosa';
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
        usesCapitals: boolean;           // �May�scula inicial?
        usesOpeningMarks: boolean;       // �Usa � y �?
        periodMeaning: 'normal' | 'pasivo-agresivo';

        // Gesti�n de risa
        laughStyle: string[];            // ["jajaja", "JAJA", "jiji", "??"]

        // Muletillas y regionalismos
        fillerWords: string[];           // ["literal", "o sea", "en plan"]
        regionalisms: string[];          // Palabras regionales

        // Saludos y despedidas
        greetings: string[];             // ["holi", "qu� onda", "hey bb"]
        farewells: string[];             // ["bye", "tkm", "besitos"]
    };

    // === NEW: COGNITIVE PATTERNS (Defectos y Sesgos) ===
    cognitivePatterns?: {
        rigidity: number;                // 1-10: Terquedad
        narcissismLevel: number;         // 1-10: �Gira todo hacia �l/ella?
        victimMentality: number;         // 1-10: �Se victimiza?
        deflectionStyle: 'culpa al otro' | 'cambia tema' | 'niega' | 'ninguno';
        triggerTopics: string[];         // Temas que lo enojan
    };

    // === NEW: MANIPULATION PATTERNS ===
    manipulationPatterns?: {
        gaslighting: {
            detected: boolean;
            phrases: string[];           // ["est�s loca", "yo nunca dije eso"]
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
        controlBehavior: string[];       // ["d�nde est�s", "con qui�n"]
    };

    // === NEW: SHARED MEMORY (Memoria Compartida) ===
    sharedMemory?: {
        insideJokes: string[];           // Chistes internos
        mentionedPeople: {
            name: string;
            relationship: string;        // "amiga", "mam�"
            sentiment: 'positivo' | 'negativo' | 'neutral';
        }[];
        importantDates: string[];        // Fechas mencionadas
        significantPlaces: string[];     // Lugares importantes
        conflictTopics: string[];        // Temas de pelea
        sharedMemories: string[];        // Recuerdos compartidos
    };

    // === NEW: DIGITAL BODY LANGUAGE ===
    digitalBodyLanguage?: {
        responseSpeed: 'instant�neo' | 'minutos' | 'horas' | 'inconsistente';
        doubleTexting: boolean;          // �Manda mensaje tras mensaje?
        readReceiptAnxiety: boolean;     // �Se queja del "visto"?
        emojiToTextRatio: 'bajo' | 'medio' | 'alto';
        voiceNoteUsage: 'nunca' | 'raro' | 'frecuente';
        allCapsWhen: 'enojado' | 'emocionado' | 'siempre' | 'nunca';
    };

    // === NEW: DARK TRIAD (Narcisismo, Maquiavelismo, Psicopat�a) ===
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
        warningFlags: string[];          // Se�ales de alerta
    };

    // === NEW: LA SOMBRA (Jung - Lo que reprime) ===
    shadow?: {
        repressedTraits: string[];       // Rasgos que reprime
        emergentBehavior: {
            underStress: string[];       // C�mo act�a bajo estr�s
            whenHurt: string[];          // Cuando est� herida
            whenCornered: string[];      // Cuando se siente acorralada
        };
        projections: string[];           // Defectos que proyecta en otros
        contradictions: string[];        // Contradicciones palabras/acciones
        defenseMechanisms: string[];     // Mecanismos de defensa
        hiddenFears: string[];           // Miedos ocultos
        triggerTopics: string[];         // Temas que provocan reacci�n
    };

    // === LEGACY (keeping for compatibility) ===
    attachmentStyle?: 'seguro' | 'ansioso' | 'evitativo' | 'desorganizado';
    messageSamples?: MessageSamples;
    masterPrompt?: string; // Optional master prompt for advanced simulation

    // === NEW: TEMPORAL EVOLUTION (Evolución de la Relación) ===
    temporalEvolution?: {
        phase1: { // Primer 30% del chat
            emotionalTone: number; // 1-10
            messageFrequency: 'alta' | 'media' | 'baja';
            affectionLevel: number; // 1-10
            conflictLevel: number; // 1-10
        };
        phase2: { // Medio 40%
            emotionalTone: number;
            messageFrequency: 'alta' | 'media' | 'baja';
            affectionLevel: number;
            conflictLevel: number;
        };
        phase3: { // Último 30%
            emotionalTone: number;
            messageFrequency: 'alta' | 'media' | 'baja';
            affectionLevel: number;
            conflictLevel: number;
        };
        trend: 'mejorando' | 'estable' | 'deteriorándose';
        significantChanges: string[];
    };

    // === NEW: DELAY PATTERNS (Patrones de Tiempo de Respuesta) ===
    delayPatterns?: {
        toRomanticMessages: 'instantáneo' | 'minutos' | 'horas'; // Cómo responde a "te amo"
        toUncomfortableMessages: 'instantáneo' | 'minutos' | 'horas'; // A mensajes incómodos
        toNeutralMessages: 'instantáneo' | 'minutos' | 'horas'; // Baseline normal
        byTimeOfDay: {
            morning: 'rápido' | 'normal' | 'lento';
            afternoon: 'rápido' | 'normal' | 'lento';
            night: 'rápido' | 'normal' | 'lento';
        };
        typicalDelayMinutes: number; // Promedio en minutos
    };

    // === NEW: PREDICTIONS (Predicciones de Reacciones) ===
    predictions?: {
        ifMentionedNewPartner: string; // Cómo reaccionaría
        ifReconciliationAttempt: string;
        ifIgnoredFor2Days: string;
        ifAskedAboutBreakup: string;
        ifCongratulatedOnBirthday: string;
        customPredictions?: Record<string, string>; // Predicciones personalizadas
    };

    // === NEW: MEMORY SELECTIVITY (Memoria Selectiva basada en Neuroticismo) ===
    memorySelectivity?: {
        retentionRate: number; // 0-1 (basado en neuroticismo)
        remembersBothGoodAndBad: boolean;
        exaggeratesNegative: boolean; // Si neuroticismo alto
        typicallyForgets: string[]; // Qué tipo de cosas "olvida"
    };

    // === NEW: EXTRACTED FACTS (Hechos Extraídos - para Embeddings) ===
    extractedFacts?: {
        factType: 'personal' | 'relationship' | 'preference' | 'routine';
        content: string; // Hecho anonimizado
        importance: number; // 1-10
    }[];

    // === PREMIUM: RELATIONSHIP SPECIFIC PSYCHOLOGY ===
    relationshipPsychology?: {
        // Shared
        reciprocityScore: number; // 0-100
        powerBalance: 'balanced' | 'user-dominant' | 'other-dominant';

        // Ex-Specific
        breakupPatterns?: {
            quietQuitting: boolean;
            fadingAway: boolean;
        };

        // Friend-Specific
        friendshipRole?: string; // Leader, follower, etc.
        frenemyScore?: number; // 0-100 (envy/competition)

        // Family-Specific
        familyRole?: string; // Black sheep, etc.
        emotionalBlackmail?: boolean;

        // Deceased-Specific
        emotionalLegacy?: string[];
        lifeImprint?: string[];
    };

    // === PREMIUM: DEEP LINGUISTIC ANALYSIS ===
    linguisticAnalysis?: {
        subtext: string; // "Agresividad pasiva", "Defensivo", etc.
        intellectualization: number; // 1-10
        toneShiftUnderStress: string;
        psychologicalCrutches: string[]; // Muletillas psicolgicas
    };

    // === NEW: INTIMATE DETAILS ===
    intimateDetails?: {
        nicknames: {
            fromExToUser: string[]; // "bebé", "gordi"
            fromUserToEx: string[]; // "amor", "precioso"
        };
        recurringComplaints: string[]; // "nunca me escuchas", "siempre llegas tarde"
        insideJokes: string[]; // Referencias específicas
        loveLanguageSpecifics: string[]; // "abrazos por la espalda", "notas de voz largas"
    };

    // === NEW: PSYCHOLOGICAL X-RAY (Gottman + Attachment) ===
    psychologicalXRay?: {
        fourHorsemen: {
            criticism: number; // 0-100 (Frequency/Intensity)
            contempt: number; // 0-100 (The worst one)
            defensiveness: number; // 0-100
            stonewalling: number; // 0-100
        };
        attachmentStyle: {
            type: 'seguro' | 'ansioso' | 'evitativo-burlon' | 'evitativo-miedoso' | 'desorganizado';
            confidence: number; // 0-100
            manifestations: string[]; // "Se aleja cuando hay intimidad", "Manda mensajes compulsivos"
        };
    };

    // === PHASE 7: ADVANCED BEHAVIORAL ANALYSIS (4 nuevas fases) ===
    conflictResolution?: {
        style: 'evade' | 'confront' | 'manipulate' | 'resolve' | 'passive-aggressive';
        typicalPhrases: string[];
        coolingOffTime: string;
        apologizesFirst: boolean;
        holdsGrudges: boolean;
    };
    loveLanguageDetailed?: {
        primary: 'words' | 'acts' | 'time' | 'gifts' | 'touch';
        secondary: 'words' | 'acts' | 'time' | 'gifts' | 'touch';
        examples: string[];
        preferredExpressions: string[];
    };
    humorProfile?: {
        types: string[];  // 'sarcastic', 'ironic', 'absurd', 'dark', 'puns', 'memes'
        sensitivity: 'low' | 'medium' | 'high';
        tabooTopics: string[];
        insideJokes: string[];
        laughTriggers: string[];
    };
    emotionalTriggersAdvanced?: {
        negative: { topic: string; intensity: number; typicalReaction: string }[];
        positive: { topic: string; effect: string }[];
        avoidTopics: string[];
        safeTopics: string[];
    };
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

    console.log(`[parseWhatsAppExport] ✅ Parsing complete!`);
    console.log(`[parse WhatsAppExport] Total messages parsed: ${messages.length}`);
    console.log(`[parseWhatsAppExport] Matched lines: ${matchedLines}`);
    console.log(`[parseWhatsAppExport] Multi-line appends: ${multiLineAppends}`);
    console.log(`[parseWhatsAppExport] Skipped (first 10): ${Math.min(skippedSystemMessages, 10)}`);

    // 🧹 Limpiar mensajes del sistema (nuevo)
    const cleanedMessages = cleanSystemMessages(messages);
    const filteredCount = messages.length - cleanedMessages.length;

    if (filteredCount > 0) {
        console.log(`[parseWhatsAppExport] 🧹 Filtrados ${filteredCount} mensajes del sistema`);
        console.log(`[parseWhatsAppExport] 📊 Mensajes finales: ${cleanedMessages.length}`);
    }

    return cleanedMessages;
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

/**
 * DETECCIÓN INTELIGENTE DE PARTICIPANTES
 * 
 * Cuando el usuario escribe un apodo (ej: "mi amor") pero en el chat aparece
 * un nombre diferente (ej: "Marian"), esta función usa IA para determinar
 * cuál participante del chat corresponde a quien el usuario quiere simular.
 */
async function detectExSenderWithAI(
    participants: string[],
    userInputName: string,
    sampleMessages: ParsedMessage[]
): Promise<{ exSender: string; userSender: string; confidence: number }> {
    console.log('[detectExSenderWithAI] Participants:', participants);
    console.log('[detectExSenderWithAI] User input name:', userInputName);

    // Si solo hay 2 participantes, es fácil
    if (participants.length === 2) {
        // Crear muestra de contexto
        const contextSample = sampleMessages.slice(0, 30).map(m =>
            `${m.sender}: ${m.content.substring(0, 100)}`
        ).join('\n');

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
        });

        const prompt = `Hay una conversación entre estas 2 personas: ${participants.join(' y ')}.

El usuario quiere simular a la persona que él/ella llama "${userInputName}" (puede ser un apodo, alias o nombre cariñoso).

Muestra de mensajes:
${contextSample}

¿Cuál de los 2 participantes (${participants.join(' o ')}) es más probable que sea "${userInputName}"?

Responde SOLO con JSON:
{"exSender": "nombre exacto del participante a simular", "userSender": "nombre del otro participante", "confidence": 0.0-1.0}`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            const jsonMatch = response.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('[detectExSenderWithAI] AI result:', parsed);

                // Validar que el nombre exista en los participantes
                const validEx = participants.find(p =>
                    p.toLowerCase().trim() === (parsed.exSender || '').toLowerCase().trim()
                );
                const validUser = participants.find(p =>
                    p.toLowerCase().trim() === (parsed.userSender || '').toLowerCase().trim()
                );

                if (validEx && validUser) {
                    return {
                        exSender: validEx,
                        userSender: validUser,
                        confidence: parsed.confidence || 0.8
                    };
                }
            }
        } catch (e) {
            console.warn('[detectExSenderWithAI] AI detection failed:', e);
        }
    }

    // Fallback: asumir que el primer participante diferente al input es el ex
    // Esto mantiene compatibilidad con el código anterior
    const fallbackEx = participants[0];
    const fallbackUser = participants.find(p => p !== fallbackEx) || 'Usuario';

    return {
        exSender: fallbackEx,
        userSender: fallbackUser,
        confidence: 0.5
    };
}

// Internal helper for retrying AI calls with timeout and exponential backoff
// Now uses Supabase Edge Function as proxy to Gemini API for better reliability
async function generateWithRetry(model: any, prompt: string, retries = 3, timeoutMs = 90000): Promise<string> {
    const { supabase } = await import('@/lib/supabase');
    let lastError: any;
    const errors: string[] = [];

    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`[AI Call] Attempt ${i + 1}/${retries + 1} via Supabase, timeout: ${timeoutMs}ms, prompt: ${prompt.length} chars`);

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`API timeout after ${timeoutMs}ms`)), timeoutMs)
            );

            // Call Supabase Edge Function instead of Gemini directly
            const apiCall = supabase.functions.invoke('chat-ai', {
                body: {
                    message: prompt,
                    model: 'gemini-2.0-flash'
                }
            });

            // Race between API call and timeout
            const { data, error } = await Promise.race([
                apiCall,
                timeoutPromise
            ]);

            if (error) {
                throw new Error(error.message || 'Supabase function error');
            }

            if (!data || !data.text) {
                throw new Error('Invalid response from backend');
            }

            console.log(`[AI Call] ✅ Success! Response length: ${data.text.length} chars`);
            return data.text;
        } catch (error: any) {
            lastError = error;
            const errorMsg = error?.message || String(error);
            errors.push(`Attempt ${i + 1}: ${errorMsg}`);

            // Detailed error logging
            console.error(`[AI Error] Attempt ${i + 1}/${retries + 1}:`, {
                message: errorMsg,
                code: error?.code,
                status: error?.status,
                promptLength: prompt.length
            });

            if (i < retries) {
                // Exponential backoff: 2s, 4s, 8s
                const waitTime = Math.min(2000 * Math.pow(2, i), 10000);
                console.log(`[AI Call] ⏳ Waiting ${waitTime}ms before retry (exponential backoff)...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // Create detailed error message for user
    const isRateLimit = lastError?.message?.includes('429') || lastError?.message?.includes('quota');
    const isTimeout = lastError?.message?.includes('timeout');
    const isTooLong = lastError?.message?.includes('token') || lastError?.message?.includes('context');

    let userFriendlyError = 'Error de conexión con la IA. ';
    if (isRateLimit) {
        userFriendlyError = 'Demasiadas solicitudes. Espera 1 minuto e intenta de nuevo.';
    } else if (isTimeout) {
        userFriendlyError = 'El análisis tardó demasiado. Intenta con menos mensajes.';
    } else if (isTooLong) {
        userFriendlyError = 'El chat es muy largo. Se usará una muestra más pequeña.';
    }

    console.error('[AI Call] ❌ All retries failed:', errors);
    throw new Error(userFriendlyError);
}

export async function analyzePersonality(
    messages: ParsedMessage[],
    exName: string,
    onProgress?: (progress: number, status: string) => void,
    relationshipType?: 'ex' | 'friend' | 'family' | 'deceased' | 'partner' | 'crush' | 'family_parent' | 'family_sibling' | 'family_other' | 'acquaintance'
): Promise<ExProfile> {
    const startTime = Date.now();
    const isDeceased = relationshipType === 'deceased';
    const isFamily = relationshipType === 'family';
    const isFriend = relationshipType === 'friend';
    console.log(`[analyzePersonality] 🚀 STARTING OPTIMIZED 6-STAGE ANALYSIS (type: ${relationshipType || 'ex'})`);

    if (!GEMINI_API_KEY) {
        throw new Error('API Key de Gemini no configurada.');
    }

    // 🌍 NUEVO: Detectar idioma del chat
    const detectedLanguage = detectLanguage(messages);
    console.log(`[analyzePersonality] 🌍 Idioma detectado: ${detectedLanguage}`);

    // 💾 NUEVO: Verificar si hay caché de análisis parcial
    const cache = await loadAnalysisProgress(exName);
    if (cache) {
        console.log('[analyzePersonality] 💾 Caché encontrado:', {
            block1: !!cache.block1,
            block2: !!cache.block2,
            block3: !!cache.block3
        });
        onProgress?.(5, 'Recuperando análisis previo...');
    }

    onProgress?.(5, 'Preparando mensajes...');
    let { messages: sampledMessages } = intelligentTokenSampling(messages);

    // CRITICAL FIX: Sanitize messages to ensure all have valid sender
    sampledMessages = sampledMessages.map(msg => ({
        ...msg,
        sender: msg.sender || 'Unknown'
    }));


    // Quick sender detection
    const senderCounts = new Map<string, number>();
    sampledMessages.forEach(msg => {
        // CRITICAL FIX: Ensure sender exists before trimming
        const name = (msg.sender || 'Unknown').trim();
        senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
    });

    // Step 1: Try simple text matching first (fastest)
    const exNameLower = exName.toLowerCase().trim();
    let exSenderName = Array.from(senderCounts.keys()).find(name => {
        const nameLower = name.toLowerCase().trim();
        return nameLower === exNameLower || nameLower.includes(exNameLower) || exNameLower.includes(nameLower);
    });

    // Step 2: If simple matching fails, use AI to detect the correct participant
    const allParticipants = Array.from(senderCounts.keys());
    let userSenderName = 'Usuario';

    if (!exSenderName) {
        console.log('[analyzePersonality] Simple matching failed, using AI detection...');
        onProgress?.(8, 'Detectando participantes con IA...');

        try {
            const aiDetection = await detectExSenderWithAI(
                allParticipants,
                exName,
                sampledMessages.slice(0, 50) // Solo primeros 50 mensajes para contexto
            );

            exSenderName = aiDetection.exSender;
            userSenderName = aiDetection.userSender;

            console.log(`[analyzePersonality] AI detected: ex="${exSenderName}", user="${userSenderName}", confidence=${aiDetection.confidence}`);

            if (aiDetection.confidence < 0.6) {
                console.warn('[analyzePersonality] Low confidence detection, may be inaccurate');
            }
        } catch (e) {
            console.error('[analyzePersonality] AI detection failed:', e);
            throw new Error(`No se pudo identificar a "${exName}" en el chat. Participantes detectados: ${allParticipants.join(', ')}`);
        }
    } else {
        // Encontrado por matching simple - detectar el usuario
        userSenderName = allParticipants.find(name => name !== exSenderName) || 'Usuario';
    }

    const exMessages = sampledMessages.filter(m => m.sender === exSenderName);

    // Prepare styles sample for prompt (PERCENTAGE-BASED, NO HARD LIMITS)
    // Take 15% from START, 15% from MIDDLE, and 70% from END (most recent messages)
    const startPercent = 0.15;
    const middlePercent = 0.15;
    const endPercent = 0.70;

    const firstMessages = exMessages.slice(0, Math.floor(exMessages.length * startPercent));
    const lastMessages = exMessages.slice(-Math.floor(exMessages.length * endPercent));

    // Middle: sample from 35% to 65% of chat, randomly pick 15% of total from that range
    const middleStartIdx = Math.floor(exMessages.length * 0.35);
    const middleEndIdx = Math.floor(exMessages.length * 0.65);
    const middleRange = exMessages.slice(middleStartIdx, middleEndIdx);
    const middleSampleSize = Math.floor(exMessages.length * middlePercent);
    const randomMiddle = middleRange.sort(() => Math.random() - 0.5).slice(0, middleSampleSize);

    const promptSample = [...firstMessages, ...randomMiddle, ...lastMessages];
    const styleSample = promptSample.map(m => m.content).join('\n');

    console.log(`[analyzePersonality] 📊 Sampling: ${firstMessages.length} start (15%) + ${randomMiddle.length} middle (15%) + ${lastMessages.length} end (70%) = ${promptSample.length} total messages`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // --- REQUEST 1: DEEP PSYCHOLOGICAL PROFILE ---
    onProgress?.(15, 'Analizando perfil psicológico profundo...');

    // Note: allParticipants and userSenderName are already defined above from AI detection

    // Get sample of the full conversation with context
    const contextSample = sampledMessages.slice(0, 50).map(m => `${m.sender}: ${m.content.substring(0, 200)}`).join('\n');

    // Extract context for enhanced analysis (WITH ERROR HANDLING)
    let context;
    try {
        context = extractConversationContext(sampledMessages, exName);
    } catch (contextErr) {
        console.error('[analyzePersonality] extractConversationContext failed:', contextErr);
        // Provide safe fallback
        context = {
            participants: { target: exSenderName, user: userSenderName },
            fingerprint: { topEmojis: [], signatureWords: [], laughStyle: ['jajaja'] }
        };
    }

    // Ensure context has required fields with safe defaults
    const safeContext = {
        participants: {
            target: context?.participants?.target || exSenderName,
            user: context?.participants?.user || userSenderName
        },
        fingerprint: {
            topEmojis: context?.fingerprint?.topEmojis || [],
            signatureWords: context?.fingerprint?.signatureWords || [],
            laughStyle: context?.fingerprint?.laughStyle || ['jajaja']
        }
    };

    const request1Prompt = `Analiza profundamente a "${exName}" basándote EXCLUSIVAMENTE en estos mensajes REALES.

⚠️ REGLAS CRÍTICAS - CUMPLIMIENTO OBLIGATORIO:
1. TODA conclusión DEBE tener 3+ CITAS LITERALES del chat
2. Si NO encuentras evidencia → pon "No detectado" (NO inventes)
3. Las citas deben ser EXACTAS (copia/pega del chat)
4. PROHIBIDO usar valores genéricos o especular

CONTEXTO CRÍTICO:
- Persona a simular: ${safeContext.participants.target}
- Usuario real: ${safeContext.participants.user}

HUELLA LINGÜÍSTICA DETECTADA:
- Emojis favoritos: ${safeContext.fingerprint.topEmojis.slice(0, 5).join(' ') || 'ninguno'}
- Palabras signature: ${safeContext.fingerprint.signatureWords.slice(0, 5).join(', ') || 'ninguna'}
- Estilo de risa: ${safeContext.fingerprint.laughStyle.join(', ') || 'jajaja'}
    
    CONTEXTO IMPORTANTE:
    - La persona a analizar es: ${exSenderName}
    - La otra persona en la conversación (usuario) es: ${userSenderName}
    - Total de participantes detectados: ${allParticipants.join(', ')}
    - La simulación será para que el usuario (${userSenderName}) pueda hablar con una IA que imita a ${exSenderName}
    
    MUESTRA DE CONVERSACIÓN PARA ENTENDER EL CONTEXTO:
    ${contextSample}
    
    MENSAJES:
    ${styleSample.slice(0, 1000000)}

    INSTRUCCIONES DE ANÁLISIS:

    Para CADA campo, DEBES:
    1. Leer los mensajes y buscar EVIDENCIA REAL
    2. Citar AL MENOS 3 ejemplos textuales
    3. Si no hay evidencia → pon score=5 (neutral) y reason="No hay suficiente información"

    Responde con un JSON válido que incluya:
    1. relationshipType: (ex|partner|friend|etc) con confidence y evidence (3+ citas literales).
    2. bigFive: (openness, conscientiousness, extraversion, agreeableness, neuroticism) con scores 1-10, reasons Y evidence (3+ citas literales CADA UNO).
    3. attachment: style (seguro|ansioso|evitativo|desorganizado) con spectrum (anxiety 1-10, avoidance 1-10), analysis Y evidence (3+ citas).
    4. emotionalTone: primary, secondary, stability (1-10), intensity (1-10) Y evidence (3+ citas).
    5. communication: style (directo|pasivo-agresivo|etc), verbosity (1-10), formality (formal|casual|vulgar) Y evidence (3+ citas).
    6. linguistics: vocabularyComplexity (1-10), emojiFrequency (high|med|low), signatureWords (array string) Y evidence (3+ citas).

    Formato JSON esperado (CON EVIDENCIA LITERAL OBLIGATORIA):
    {
      "relationshipType": { "type": "ex", "confidence": 8, "evidence": ["Literal del chat 1", "Literal 2", "Literal 3"] },
      "bigFive": {
        "openness": { "score": 7, "reason": "Explicación basada en evidencia", "evidence": ["Dijo: '...'", "También: '...'", "Y: '...'"] },
        "conscientiousness": { "score": 5, "reason": "...", "evidence": ["...", "...", "..."] },
        "extraversion": { "score": 6, "reason": "...", "evidence": ["...", "...", "..."] },
        "agreeableness": { "score": 5, "reason": "...", "evidence": ["...", "...", "..."] },
        "neuroticism": { "score": 7, "reason": "...", "evidence": ["...", "...", "..."] }
      },
      "attachment": { "style": "ansioso", "spectrum": { "anxiety": 7, "avoidance": 3 }, "analysis": "...", "evidence": ["Cuando le dejaron de hablar: '...'", "Al enfrentar conflicto: '...'", "Sobre compromiso: '...'"] },
      "emotionalTone": { "primary": "ansioso", "secondary": "nostálgico", "stability": 4, "intensity": 7, "evidence": ["Frecuentemente dice: '...'", "Tono general: '...'", "Reacciona con: '...'"] },
      "communication": { "style": "pasivo-agresivo", "verbosity": 6, "formality": "casual", "evidence": ["Ejemplo: '...'", "Palabras que usa: '...'", "Nunca dice: '...'"] },
      "linguistics": { "vocabularyComplexity": 5, "emojiFrequency": "high", "signatureWords": ["ntp", "aja", "sip"], "evidence": ["Usa constantemente: '...'", "Nunca: '...'", "Característica: '...'"] }
    }

    ⚠️ RECORDATORIO FINAL: Sin evidencia = NO inventes. Toda conclusión necesita 3+ citas LITERALES del chat.
    `;

    const result1Str = await generateWithRetry(model, request1Prompt);
    const result1 = safeParseJSON(result1Str, {
        relationshipType: { type: 'acquaintance', confidence: 5, evidence: [] },
        bigFive: {}, attachment: {}, emotionalTone: {}, communication: {}, linguistics: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 2: BEHAVIORAL PATTERNS ---
    onProgress?.(45, 'Analizando patrones de comportamiento...');

    const request2Prompt = `Basado en el mismo perfil de "${exName}", analiza sus patrones de comportamiento CON EVIDENCIA LITERAL.
    
    ⚠️ REGLA CRÍTICA: Para CADA patrón, cita EJEMPLOS REALES del chat.
    
    Responde con un JSON válido que incluya:
    1. activityPatterns: activeHours (array strings), responseTime (rápido|lento|variable), consistency (1-10).
    2. topics: recurrent (array de {topic, count, lastMentioned}), passions (array con evidencia), avoided (array con evidencia).
    3. triggers: emotional (QUÉ lo enoja/entristece CON EJEMPLOS LITERALES), calming (qué lo calma CON EJEMPLOS), joy (qué le alegra CON EJEMPLOS).
    4. commitment: level (1-10), fears (miedo al compromiso/abandono/etc CON EJEMPLOS), values (array CON EJEMPLOS).
    5. conflict: style (evasivo|confrontativo|mediador), resolution (busca solución|culpa a otros), patience (1-10).
    
    FORMATO REQUERIDO:
    {
      "activityPatterns": { 
        "activeHours": ["mañana (8-12)", "tarde (14-18)"], 
        "responseTime": "rápido (<5 min)", 
        "consistency": 8,
        "evidence": ["Siempre responde en las mañanas rápido", "Por las noches tarda horas"]
      },
      "topics": { 
        "recurrent": [
          {"topic": "familia", "count": 45, "lastMentioned": "hace 2 días", "example": "Literal del chat sobre familia"},
          {"topic": "trabajo", "count": 32, "lastMentioned": "ayer", "example": "Literal del chat sobre trabajo"}
        ],
        "passions": [{"topic": "música", "evidence": ["Dijo: 'amo este grupo'", "Literal 2", "Literal 3"]}],
        "avoided": [{"topic": "ex anterior", "evidence": ["Cambió de tema cuando mencioné", "Dijo: 'no quiero hablar de eso'"]}]
      },
      "triggers": { 
        "emotional": [
          {"trigger": "cuando le recordé lo de su ex", "reaction": "Me bloqueó 3 días", "literal": "Mensaje literal donde se enojó"},
          {"trigger": "...", "reaction": "...", "literal": "..."}
        ],
        "calming": [{"action": "hablar de su perro", "evidence": ["Se calmó cuando dije...", "Literal"]}],
        "joy": [{"action": "sorpresas pequeñas", "evidence": ["Dijo: 'me encanta cuando haces esto'", "Literal"]}]
      },
      "commitment": { 
        "level": 7, 
        "fears": [{"fear": "abandono", "evidence": ["Dijo: 'todos me dejan'", "Literal 2"]}],
        "values": [{"value": "lealtad", "evidence": ["Mencionó: 'lo más importante es la lealtad'"]}]
      },
      "conflict": { 
        "style": "evasivo", 
        "resolution": "culpa a otros", 
        "patience": 3,
        "evidence": ["Cuando peleamos dijo: '...'" "Siempre me echa la culpa: '...'"]
      }
    }
    
    ⚠️ CRÍTICO: Sin ejemplos literales = respuesta no válida.
    `;

    const result2Str = await generateWithRetry(model, request2Prompt);
    const result2 = safeParseJSON(result2Str, {
        activityPatterns: {}, topics: {}, triggers: {}, commitment: {}, conflict: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 3: SYNTHESIS & MASTER PROMPT ---
    onProgress?.(75, 'Generando simulación final...');

    const request3Prompt = `Sintetiza el perfil de "${exName}" para una simulación de IA.
    
    Perfil previo:
    - Apego: ${result1.attachment?.style}
    - Comunicación: ${result1.communication?.style}
    - Tono: ${result1.emotionalTone?.primary}
    - Conflictos: ${result2.conflict?.style}

    Responde con un JSON válido que incluya:
    1. affection: expressionStyle (físico|palabras|actos), depth (1-10).
    2. stress: response (se aísla|se enoja|busca apoyo), copingMechanisms (array).
    3. redFlags: array de strings (señales de alerta o toxicidad).
    4. greenFlags: array de strings (aspectos positivos).
    5. summary: Un resumen narrativo de su personalidad (2-3 párrafos).
    6. masterPrompt: Un prompt de sistema MUY DETALLADO para instruir a una IA a actuar COMO esta persona. Debe incluir instrucciones sobre cómo hablar, qué palabras usar, cómo reaccionar a celos/amor/peleas, y sus "prohibiciones" (ej: no inventar fechas).

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

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 4: MEMORY + TEMPORAL EVOLUTION (COMBINED) ---
    onProgress?.(78, 'Analizando memoria y evolución temporal...');

    const request4Prompt = `Analiza la MEMORIA de eventos y la EVOLUCIÓN TEMPORAL de la relación de "${exName}" CON FECHAS Y CITAS LITERALES.

⚠️ REGLAS CRÍTICAS:
1. Si encuentras una fecha EN EL CHAT ("15 de agosto", "mi cumpleaños es el 5 de marzo") → USALA TAL CUAL
2. Si NO encuentras fecha exacta → pon null (NO inventes "agosto" genérico)
3. CITA LITERALMENTE el mensaje donde sucedió cada evento clave
4. MÍNIMO 15-30 eventos clave con citas textuales

INSTRUCCIONES:
1. MEMORIA DE EVENTOS:
   - Busca en el chat FECHAS EXACTAS mencionadas (DD/MM, "mi cumpleaños", "aniversario")
   - Extrae 20-30 momentos clave emocionales CON LA FECHA Y EL MENSAJE LITERAL
   - Lista personas importantes - SIN datos identificables, solo roles ("hermana", "mejor amiga")

2. EVOLUCIÓN TEMPORAL:
   - Divide el chat en 3 fases (inicio 30%, medio 40%, final 30%)
   - Compara tono, frecuencia, afecto en CADA fase CON EJEMPLOS LITERALES
   - Determina si mejoraba o empeoraba CON EVIDENCIA

FORMATO JSON REQUERIDO:
{
    "keyMoments": [
        { 
            "event": "Primera declaración de amor", 
            "date": "12 de marzo" (o null si no está en el chat),
            "emotionalWeight": 10, 
            "literal": "Mensaje EXACTO del chat: 'te amo con todo mi corazón...'",
            "context": "Después de 2 meses de relación"
        },
        { 
            "event": "Pelea seria por celos", 
            "date": "28 de mayo",
            "emotionalWeight": 9, 
            "literal": "Mensaje literal: 'me tienes harta con tus inseguridades...'",
            "topic": "confianza"
        },
        ... (EXTRAE 15-30 EVENTOS REALES, NO INVENTES)
    ],
    "importantDates": { 
        "anniversary": "14 de febrero" (o null),
        "firstDate": "3 de enero" (o null),
        "birthday": "5 de marzo" (o null),
        "specialDays": [
            {"date": "10 de abril", "event": "primer viaje juntos", "literal": "Dijo: 'nunca olvidaré este día...'"}
        ]
    },
    "importantPeople": [
        { "role": "madre", "sentiment": "positivo", "evidence": ["Dijo: 'mi mamá te adora'", "Literal 2"] },
        { "role": "mejor amiga", "name": "[nombre si está en chat, sino null]", "sentiment": "neutral", "evidence": ["Mencionó..."] }
    ],
    "activitiesTogether": [
        {"activity": "ir al cine", "frequency": "frecuente", "evidence": ["Mensaje: 'vamos al cine este finde'"]},
        {"activity": "cocinar juntos", "frequency": "ocasional", "evidence": ["Literal del chat"]}
    ],
    "outingsAndTrips": [
        {"type": "viaje", "where": "playa/ciudad", "when": "verano/fecha", "sentiment": "muy positivo", "evidence": ["Literal: 'la playa contigo fue lo mejor'"]},
        {"type": "salida", "where": "restaurante/lugar", "when": "mes o null", "sentiment": "positivo", "evidence": ["Del chat"]}
    ],
    "problemsFaced": [
        {"problem": "celos", "severity": 8, "whenStarted": "abril o null", "resolved": false, "evidence": ["Reclamo literal: 'siempre estás con tus amigas'"]},
        {"problem": "falta de tiempo", "severity": 6, "whenStarted": "mayo o null", "resolved": false, "evidence": ["Queja: 'ya no me dedicas tiempo'"]}
    ],
    "giftsAndGestures": [
        {"occasion": "cumpleaños/aniversario", "gift": "collar/flores/etc", "reaction": "encantada/feliz", "evidence": ["Literal: 'me encanta el collar bebé ❤️'"]},
        {"occasion": "sin razón", "gift": "detalle", "reaction": "sorprendida", "evidence": ["Mensaje del chat"]}
    ],
    "celebrationsTogether": [
        {"event": "navidad/cumpleaños/etc", "year": "2023 o null", "significance": "alta/media/baja", "evidence": ["Mensaje: 'esta navidad contigo fue especial'"]},
        {"event": "año nuevo", "year": "2024 o null", "significance": "baja", "evidence": ["Mensaje literal"]}
    ],
    "temporalEvolution": {
        "phase1": { 
            "emotionalTone": 9, 
            "messageFrequency": "muy alta (50+ msgs/d

ía)", 
            "affectionLevel": 10, 
            "conflictLevel": 1,
            "exampleMessages": [
                "Del inicio: 'te extraño tanto bebé ❤️'",
                "También: 'eres lo mejor que me ha pasado'",
                "Y: 'cada día te amo más'"
            ]
        },
        "phase2": { 
            "emotionalTone": 6, 
            "messageFrequency": "media (20 msgs/día)", 
            "affectionLevel": 6, 
            "conflictLevel": 5,
            "exampleMessages": [
                "Del medio: 'ya no me hablas como antes'",
                "Literal: 'siento que ya no me quieres'"
            ]
        },
        "phase3": { 
            "emotionalTone": 3, 
            "messageFrequency": "baja (5 msgs/día)", 
            "affectionLevel": 2, 
            "conflictLevel": 9,
            "exampleMessages": [
                "Del final: 'esto no tiene sentido'",
                "Literal: 'mejor dejemos esto así'",
                "Último mensaje: 'adiós'"
            ]
        },
        "trend": "deteriorándose rápidamente",
        "significantChanges": [
            {"when": "mayo", "what": "Distanciamiento después de pelea", "evidence": ["Dejó de decir 'te amo'", "Mensajes más cortos"]}
        ]
    }
}

⚠️ CRÍTICO: 
- Fechas reales o null (NO inventes)
- MÍNIMO 15 keyMoments con literales
- Cada fase CON 3+ mensajes literales de ejemplo`;

    const result4Str = await generateWithRetry(model, request4Prompt);
    const result4 = safeParseJSON(result4Str, {
        keyMoments: [], importantDates: {}, importantPeople: [], temporalEvolution: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 5: MICRO-BEHAVIORS + DELAY PATTERNS (COMBINED) ---
    onProgress?.(85, 'Analizando micro-comportamientos y patrones de respuesta...');

    const request5Prompt = `Analiza los MICRO-COMPORTAMIENTOS de escritura y PATRONES DE DELAY de "${exName}".

MICRO-COMPORTAMIENTOS a detectar:
1. Puntuación emotiva: ¿Usa ". . ." para suspenso? ¿"ok." significa molestia?
2. Typos: ¿Hace errores cuando está nerviosa? ¿Los corrige?
3. Double texting: ¿Envía múltiples mensajes seguidos?
4. Mayúsculas: ¿MAYÚSCULAS = enojada o emocionada?
5. Risa: "jajaja" vs "jaja" vs "JAJA" - ¿cuándo usa cada una?

PATRONES DE DELAY:
1. ¿Qué tan rápido responde a mensajes románticos vs incómodos?
2. ¿Responde más lento de noche?
3. ¿Cuál es su tiempo promedio de respuesta?

Responde con JSON:
{
    "microBehaviors": {
        "punctuationMeaning": { "ok.": "molesta", "...": "pensando/suspenso" },
        "typosWhen": "nerviosa o apurada",
        "corrigeTypos": false,
        "doubleTexts": true,
        "capsLockMeaning": "emocionada, no enojada",
        "laughStyles": { "jajaja": "genuino", "jaja": "cortés", "JAJA": "muy divertido" }
    },
    "delayPatterns": {
        "toRomanticMessages": "instantáneo",
        "toUncomfortableMessages": "horas",
        "toNeutralMessages": "minutos",
        "byTimeOfDay": { "morning": "lento", "afternoon": "rápido", "night": "normal" },
        "typicalDelayMinutes": 15
    }
}`;

    const result5Str = await generateWithRetry(model, request5Prompt);
    const result5 = safeParseJSON(result5Str, {
        microBehaviors: {}, delayPatterns: {}
    });

    await delay(STAGE_DELAY_MS);

    // --- REQUEST 6: PREDICTIONS + EXTRACTED FACTS ---
    onProgress?.(92, isDeceased ? 'Generando recuerdos y momentos especiales...' : 'Generando predicciones y extrayendo hechos clave...');

    // 🕊️ Adaptar escenarios según tipo de relación
    const predictionScenarios = isDeceased ? `
ESCENARIOS PARA SIMULACIÓN DE PERSONA FALLECIDA - ¿Qué diría "${exName}" en estos momentos?
1. Si quisieran decirle algo que nunca pudieron expresar
2. Si quisieran preguntarle sobre su vida
3. Si quisieran compartir un logro personal con ${exName}
4. Si quisieran hablar sobre un momento especial juntos
5. Si quisieran despedirse apropiadamente` :
        isFamily ? `
ESCENARIOS FAMILIARES - ¿Cómo reaccionaría "${exName}" en estas situaciones?
1. Si el usuario comparte un logro importante
2. Si el usuario pide consejo sobre algo personal
3. Si el usuario está pasando un momento difícil
4. Si el usuario quiere hablar del pasado familiar
5. Si el usuario necesita apoyo emocional` :
            isFriend ? `
ESCENARIOS DE AMISTAD - ¿Cómo reaccionaría "${exName}" en estas situaciones?
1. Si el usuario está pasando un momento difícil
2. Si el usuario quiere hacer planes juntos
3. Si el usuario comparte buenas noticias
4. Si hay un malentendido entre ustedes
5. Si el usuario necesita un favor` :
                `
ESCENARIOS DE EX-PAREJA - ¿Cómo reaccionaría "${exName}" en estos escenarios?
1. Si el usuario menciona que salió con alguien nuevo
2. Si el usuario intenta reconciliación después de meses
3. Si el usuario no responde por 2 días
4. Si el usuario pregunta por qué terminaron
5. Si el usuario la felicita en su cumpleaños`;

    const predictionExamples = isDeceased ? `
    "predictions": {
        "ifWantedToSaySomething": "Respondería con la calidez y el cariño que siempre mostró...",
        "ifAskedAboutLife": "Compartiría memorias con su forma característica de contar historias...",
        "ifSharedAchievement": "Expresaría orgullo y alegría genuina...",
        "ifTalkedAboutSpecialMoment": "Recordaría con detalle y emoción...",
        "ifSaidGoodbye": "Daría una despedida amorosa con sus palabras típicas..."
    }` :
        isFamily ? `
    "predictions": {
        "ifSharedAchievement": "Reacción típica de orgullo familiar...",
        "ifAskedForAdvice": "Daría consejo con su estilo particular...",
        "ifGoingThroughHardTime": "Ofrecería apoyo familiar...",
        "ifTalkedAboutPast": "Compartiría memorias familiares...",
        "ifNeededSupport": "Brindaría apoyo incondicional..."
    }` :
            isFriend ? `
    "predictions": {
        "ifGoingThroughHardTime": "Ofrecería apoyo de amigo...",
        "ifMakingPlans": "Respondería con entusiasmo o su forma típica...",
        "ifSharedGoodNews": "Celebraría a su manera...",
        "ifMisunderstanding": "Manejaría el conflicto con su estilo...",
        "ifNeededFavor": "Ayudaría según su personalidad..."
    }` :
                `
    "predictions": {
        "ifMentionedNewPartner": "Se pondría celosa pero lo disfrazaría de indiferencia...",
        "ifReconciliationAttempt": "Sería receptiva pero cautelosa, haría que 'la conquisten'...",
        "ifIgnoredFor2Days": "Mandaría mensaje pasivo-agresivo tipo 'ok supongo que estás ocupado'...",
        "ifAskedAboutBreakup": "Evitaría el tema o culparía al usuario...",
        "ifCongratulatedOnBirthday": "Respondería con cariño genuino, momento vulnerable..."
    }`;

    const request6Prompt = `Genera PREDICCIONES de comportamiento y extrae HECHOS CLAVE sobre "${exName}".

${predictionScenarios}

HECHOS CLAVE - Extrae información anonimizada para memoria:
- Preferencias (comida, música, hobbies)
- Rutinas (trabaja de día, estudia, etc)
- Valores importantes
- ${isDeceased ? 'Frases que solía decir, recuerdos especiales' : 'Miedos o inseguridades'}

MEMORIA SELECTIVA - Basado en su neuroticismo (${result1.bigFive?.neuroticism || 5}/10):
- ¿Tiende a recordar más lo negativo?
- ¿Exagera los problemas pasados?

Responde con JSON:
{
${predictionExamples},
    "extractedFacts": [
        { "factType": "preference", "content": "Le gusta el café por las mañanas", "importance": 6 },
        { "factType": "routine", "content": "Trabaja en oficina, horario 9-6", "importance": 7 },
        { "factType": "personal", "content": "${isDeceased ? 'Frase típica que usaba' : 'Tiene miedo al abandono'}", "importance": 9 }
    ],
    "memorySelectivity": {
        "retentionRate": 0.85,
        "remembersBothGoodAndBad": false,
        "exaggeratesNegative": ${!isDeceased},
        "typicallyForgets": ["detalles positivos pequeños", "cumplidos"]
    }
}`;

    const result6Str = await generateWithRetry(model, request6Prompt);
    const result6 = safeParseJSON(result6Str, {
        predictions: {}, extractedFacts: [], memorySelectivity: {}
    });

    // ====== BLOQUE 7: ANÁLISIS AVANZADO DE COMPORTAMIENTO (4 fases combinadas) ======
    onProgress?.(92, 'Analizando patrones avanzados...');
    await delay(STAGE_DELAY_MS);

    const conflictContext = isDeceased ? 'diferencias de opinión en vida' :
        isFamily ? 'conflictos familiares' :
            isFriend ? 'desacuerdos entre amigos' :
                'peleas de pareja';

    const request7Prompt = `Analiza PATRONES AVANZADOS de "${exName}" basándote en estos mensajes:

${styleSample.substring(0, 8000)}

CONTEXTO: ${isDeceased ? 'Esta persona falleció - sé respetuoso y enfócate en cómo era en vida.' :
            isFamily ? 'Es un familiar del usuario.' :
                isFriend ? 'Es un amigo/a del usuario.' :
                    'Es una ex-pareja del usuario.'}

Analiza las siguientes 4 áreas:

1. RESOLUCIÓN DE CONFLICTOS (${conflictContext}):
- ¿Cómo maneja ${exName} los ${conflictContext}?
- ¿Evade, confronta, manipula, resuelve, o es pasivo-agresivo?
- ¿Qué frases típicas usa durante ${conflictContext}?
- ¿Cuánto tarda en calmarse?
- ¿Quién pide disculpas primero?

2. LENGUAJE DEL AMOR:
- ¿Cómo expresa afecto? (palabras, actos de servicio, tiempo de calidad, regalos, contacto físico)
- Ejemplos específicos del chat
- ¿Cómo prefiere recibir afecto?

3. PERFIL DE HUMOR:
- Tipo de humor (sarcástico, irónico, absurdo, oscuro, chistes, memes)
- Nivel de sensibilidad (¿se ofende fácil?)
- Temas tabú para bromas
- ¿Tiene chistes internos recurrentes?

4. DETONANTES EMOCIONALES:
- ¿Qué temas lo/la ponen ${isDeceased ? 'ponían' : ''} de mal humor? (con intensidad 1-10)
- ¿Qué temas ${isDeceased ? 'lo/la alegraban' : 'lo/la alegran'}?
- Temas a EVITAR en conversación
- Temas SEGUROS para conversar

Responde SOLO con JSON:
{
    "conflictResolution": {
        "style": "evade|confront|manipulate|resolve|passive-aggressive",
        "typicalPhrases": ["frase1", "frase2"],
        "coolingOffTime": "minutos|horas|días",
        "apologizesFirst": true/false,
        "holdsGrudges": true/false
    },
    "loveLanguageDetailed": {
        "primary": "words|acts|time|gifts|touch",
        "secondary": "words|acts|time|gifts|touch",
        "examples": ["ejemplo del chat"],
        "preferredExpressions": ["cómo le gusta que le expresen cariño"]
    },
    "humorProfile": {
        "types": ["sarcastic", "memes"],
        "sensitivity": "low|medium|high",
        "tabooTopics": ["tema que no tolera en broma"],
        "insideJokes": ["chiste interno recurrente"],
        "laughTriggers": ["qué lo hace reír"]
    },
    "emotionalTriggersAdvanced": {
        "negative": [{"topic": "tema", "intensity": 8, "typicalReaction": "cómo reacciona"}],
        "positive": [{"topic": "tema positivo", "effect": "efecto que causa"}],
        "avoidTopics": ["temas a evitar"],
        "safeTopics": ["temas seguros"]
    }
}`;

    const result7Str = await generateWithRetry(model, request7Prompt);
    const result7 = safeParseJSON(result7Str, {
        conflictResolution: { style: 'resolve', typicalPhrases: [], coolingOffTime: 'horas', apologizesFirst: false, holdsGrudges: false },
        loveLanguageDetailed: { primary: 'words', secondary: 'time', examples: [], preferredExpressions: [] },
        humorProfile: { types: [], sensitivity: 'medium', tabooTopics: [], insideJokes: [], laughTriggers: [] },
        emotionalTriggersAdvanced: { negative: [], positive: [], avoidTopics: [], safeTopics: [] }
    });

    // ====== BLOQUE 8: PREMIUM ANALYSIS (Relationship Psychology + Linguistic DNA) ======
    onProgress?.(94, 'Generando análisis premium (Psicología & ADN)...');
    await delay(STAGE_DELAY_MS);

    const isEx = !isFriend && !isFamily && !isDeceased;

    const psychContext = isEx ? 'RELACIÓN ROMÁNTICA (EX-PAREJA)' :
        isFriend ? 'AMISTAD' :
            isFamily ? 'FAMILIA' :
                'PERSONA FALLECIDA (MEMORIAL)';

    const request8Prompt = `Analiza la PSICOLOGÍA DE LA RELACIÓN y el ADN LINGÜÍSTICO de "${exName}" basándote en los mensajes previos.
    
    CONTEXTO: ${psychContext}
    
    1. PSICOLOGÍA DE LA RELACIÓN (${psychContext}):
       ${isEx ? `- Psicología Oscura: ¿Hay señales de Gaslighting, Love Bombing o Stonewalling?
                 - Dinámica de Poder: Reciprocidad y equilibrio.
                 - Patrón de Ruptura: Desapego silencioso vs explosivo.` : ''}
       ${isFriend ? `- Frenemy Detector: ¿Hay envidia, competencia o sarcasmo hiriente?
                     - Rol en el Grupo: Líder, seguidor, payaso, etc.
                     - Reciprocidad: ¿Solo escribe por interés?` : ''}
       ${isFamily ? `- Dinámicas Familiares: Chantaje emocional, culpa, jerarquías.
                     - Rol Familiar: Oveja negra, favorito, mediador.` : ''}
       ${isDeceased ? `- Legado Emocional: Lo que más le importaba.
                       - Impacto en Vida: Huella positiva que dejó.` : ''}

    2. ADN LINGÜÍSTICO (Análisis Profundo):
       - Subtexto: ¿Qué dicen sus palabras "entre líneas"? (ej: "estoy bien" cuando no lo está).
       - Intelectualización: ¿Usa palabras complejas para evitar emociones? (1-10)
       - Muletillas Psicológicas: Palabras que revelan inseguridad o necesidad de control.
       - Evolución del Tono: ¿Cómo cambia bajo estrés?

    3. DETALLES ÍNTIMOS Y APODOS:
       - Apodos: ¿Cómo llama al usuario? (ej: bebé, gordi, amor) ¿Cómo le dice el usuario a él/ella?
       - Quejas Recurrentes: ¿De qué se queja siempre? "Nunca me escuchas", "Llegas tarde".
       - Chistes Internos: Referencias que solo ellos entienden.
       - Lenguaje del Amor Específico: Ej: "Abrazos por la espalda", "Notas de voz de 5 min".

    4. RADIOGRAFÍA PSICOLÓGICA (NUEVO - GOTTMAN & APEGO CON EVIDENCIA):
       ⚠️ REGLA CRÍTICA: Para CADA "jinete", debes citar AL MENOS 5 EJEMPLOS LITERALES del chat
       
       - Los 4 Jinetes del Apocalipsis (Gottman): Evalúa 0-100% de presencia CON EVIDENCIA.
         * CRÍTICA (Criticism): Atacar carácter/personalidad (no comportamiento). 
Examples (MÍNIMO 5): ["Dijo: 'eres un...'", "Literal 2", "..."]
         * DESPRECIO (Contempt): Sarcasmo, insultos, superioridad moral (EL PEOR).
Examples (MÍNIMO 5): ["Se burló: '...'", "...", "..."]
         * DEFENSIVIDAD (Defensiveness): Victimización, "sí, pero...", excusas.
Examples (MÍNIMO 5): ["Cuando le dije X, respondió: 'pero tu...'"]
         * INDIFERENCIA (Stonewalling): Ley del hielo, monosílabos, "visto".
Examples (MÍNIMO 5): ["Me dejó en visto 3 días", "Respondió solo: 'ok.'"]
       
       - Estilo de Apego: Seguro, Ansioso, Evitativo-Burlón, Evitativo-Miedoso, Desorganizado.
         * Confianza (0-100%).
         * Manifestaciones CON EJEMPLOS: Ej: "Se aleja ante intimidad: 'necesito espacio' cuando le dije te amo"

    Responde SOLO con JSON:
    {
        "relationshipPsychology": {
            "reciprocityScore": 50, // 0-100
            "powerBalance": "balanced|user-dominant|other-dominant",
            ${isEx ? `"breakupPatterns": { "quietQuitting": boolean, "fadingAway": boolean },` : ''}
            ${isFriend ? `"friendshipRole": "...", "frenemyScore": 0,` : ''}
            ${isFamily ? `"familyRole": "...", "emotionalBlackmail": boolean,` : ''}
            ${isDeceased ? `"emotionalLegacy": ["..."], "lifeImprint": ["..."]` : ''}
        },
        "linguisticAnalysis": {
            "subtext": "análisis del subtexto...",
            "intellectualization": 5, // 1-10
            "toneShiftUnderStress": "descripción...",
            "psychologicalCrutches": ["palabra1", "palabra2"]
        },
        "intimateDetails": {
            "nicknames": { 
                "fromExToUser": ["..."], 
                "fromUserToEx": ["..."] 
            },
            "recurringComplaints": [{"complaint": "nunca me escuchas", "frequency": "alta", "literal": "Dijo: '...'"}],
            "insideJokes": [{"joke": "...", "context": "...", "example": "Literal del chat"}],
            "loveLanguageSpecifics": [{"action": "abrazos por la espalda", "evidence": ["Mencionó: '...'", "Literal 2"]}]
        },
        "psychologicalXRay": {
            "fourHorsemen": {
           "criticism": {
                    "score": 0-100,
                    "examples": ["Literal 1", "Literal 2", "Literal 3", "Literal 4", "Literal 5"]
                },
                "contempt": {
                    "score": 0-100,
                    "examples": ["Literal 1", "Literal 2", "Literal 3", "Literal 4", "Literal 5"]
                },
                "defensiveness": {
                    "score": 0-100,
                    "examples": ["Literal 1", "Literal 2", "Literal 3", "Literal 4", "Literal 5"]
                },
                "stonewalling": {
                    "score": 0-100,
                    "examples": ["Literal 1", "Literal 2", "Literal 3", "Literal 4", "Literal 5"]
                }
            },
            "attachmentStyle": {
                "type": "seguro|ansioso|evitativo-burlon|evitativo-miedoso|desorganizado",
                "confidence": 85,
                "manifestations": [
                    {"behavior": "Comunicación directa", "evidence": ["Dijo: '...'", "Literal 2"]},
                    {"behavior": "No juega juegos mentales", "evidence": ["...", "..."]}
                ]
            }
        }
    }
    
    ⚠️ CRÍTICO: Cada jinete DEBE tener 5+ ejemplos literales. Sin ejemplos = score 0.`;

    let result8: any = { relationshipPsychology: {}, linguisticAnalysis: {}, intimateDetails: {}, psychologicalXRay: {} };
    try {
        const result8Str = await generateWithRetry(model, request8Prompt);
        result8 = safeParseJSON(result8Str, {
            relationshipPsychology: { reciprocityScore: 50, powerBalance: 'balanced' },
            linguisticAnalysis: { subtext: 'Normal', intellectualization: 5, toneShiftUnderStress: 'Ninguno', psychologicalCrutches: [] },
            intimateDetails: { nicknames: { fromExToUser: [], fromUserToEx: [] }, recurringComplaints: [], insideJokes: [], loveLanguageSpecifics: [] },
            psychologicalXRay: { fourHorsemen: { criticism: 0, contempt: 0, defensiveness: 0, stonewalling: 0 }, attachmentStyle: { type: 'seguro', confidence: 50, manifestations: [] } }
        });
    } catch (e) {
        console.warn('Error en análisis premium (skipping):', e);
    }


    onProgress?.(95, 'Finalizando...');

    // Combine all results into ExProfile
    const profile: ExProfile = {
        exName: exName,

        relationshipType: result1.relationshipType?.type || 'unknown',

        bigFive: result1.bigFive,
        attachment: result1.attachment,

        emotionalTone: result1.emotionalTone?.primary || 'variable',

        communicationStyle: result1.communication?.style || 'mixta',
        commonPhrases: result1.communication?.commonPhrases || [],
        commonEmojis: result1.linguistics?.commonEmojis || [],

        loveLanguage: {
            primary: 'palabras',
            secondary: 'tiempo',
            howExpressesLove: result1.communication?.expressionMethods || [],
            howNeedsLove: result1.communication?.needsMethods || []
        },

        emotionalIntelligence: result1.emotionalIntelligence || {
            selfAwareness: 5,
            selfRegulation: 5,
            empathy: 5,
            socialSkills: 5,
            motivation: 5
        },

        mbtiPatterns: {
            energySource: result1.bigFive.extraversion > 5 ? 'extrovertida' : 'introvertida',
            informationStyle: result1.bigFive.openness > 5 ? 'conceptual' : 'detallista',
            decisionStyle: result1.emotionalTone?.intensity > 5 ? 'emocional' : 'l�gica',
            lifestyleStyle: result1.bigFive.conscientiousness > 5 ? 'estructurada' : 'flexible'
        },

        triggers: result2.triggers,
        linguistics: result1.linguistics,

        relationshipDynamics: {
            powerDynamic: result2.powerDynamics?.style || 'igualitaria',
            jealousyLevel: result2.jealousy?.level || 5,
            trustDefault: result2.trust?.defaultLevel || 5,
            conflictStyle: result2.conflict?.style || 'habla',
            forgivenessStyle: result2.forgiveness?.style || 'con tiempo'
        },

        responsePatterns: result2.responsePatterns || {
            whenHappy: [],
            whenAngry: [],
            whenSad: [],
            whenJealous: [],
            whenIgnored: [],
            whenComplimented: []
        },

        topicsOfInterest: result2.topics || [],
        redFlags: result3.redFlags || [],

        // Optional fields from masterPrompt
        masterPrompt: result3.masterPrompt,

        // === NEW FIELDS FROM BLOCKS 4, 5, 6 ===

        // Bloque 4: Memoria y Evolución Temporal
        sharedMemory: {
            insideJokes: [],
            mentionedPeople: (result4.importantPeople || []).map((p: any) => ({
                name: p.role || 'Desconocido',
                relationship: p.role || '',
                sentiment: p.sentiment || 'neutral'
            })),
            importantDates: Object.values(result4.importantDates || {}).filter((d: any) => typeof d === 'string') as string[],
            significantPlaces: [],
            conflictTopics: result4.keyMoments?.filter((m: any) => m.topic)?.map((m: any) => m.topic) || [],
            sharedMemories: result4.keyMoments?.map((m: any) => m.event) || []
        },
        temporalEvolution: result4.temporalEvolution || undefined,

        // Bloque 5: Micro-comportamientos y Delays
        linguisticFingerprint: {
            usesCapitals: result5.microBehaviors?.capsLockMeaning !== 'nunca',
            usesOpeningMarks: false,
            periodMeaning: result5.microBehaviors?.punctuationMeaning?.['ok.'] === 'molesta' ? 'pasivo-agresivo' : 'normal',
            laughStyle: Object.keys(result5.microBehaviors?.laughStyles || {}),
            fillerWords: [],
            regionalisms: [],
            greetings: [],
            farewells: []
        },
        digitalBodyLanguage: {
            responseSpeed: result5.delayPatterns?.toNeutralMessages || 'minutos',
            doubleTexting: result5.microBehaviors?.doubleTexts || false,
            readReceiptAnxiety: false,
            emojiToTextRatio: 'medio',
            voiceNoteUsage: 'raro',
            allCapsWhen: result5.microBehaviors?.capsLockMeaning === 'emocionada' ? 'emocionado' : 'nunca'
        },
        delayPatterns: result5.delayPatterns || undefined,

        // Bloque 6: Predicciones y Memoria Selectiva
        predictions: result6.predictions || undefined,
        memorySelectivity: result6.memorySelectivity || undefined,
        extractedFacts: result6.extractedFacts || [],

        // Bloque 7: Análisis Avanzado (4 fases nuevas)
        conflictResolution: result7.conflictResolution || undefined,
        loveLanguageDetailed: result7.loveLanguageDetailed || undefined,
        humorProfile: result7.humorProfile || undefined,
        emotionalTriggersAdvanced: result7.emotionalTriggersAdvanced || undefined,

        // === PREMIUM: RELATIONSHIP SPECIFIC PSYCHOLOGY ===
        relationshipPsychology: result8.relationshipPsychology || undefined,
        linguisticAnalysis: result8.linguisticAnalysis || undefined,

        // === NEW: INTIMATE DETAILS ===
        intimateDetails: result8.intimateDetails || undefined,

        // === NEW: PSYCHOLOGICAL X-RAY ===
        psychologicalXRay: result8.psychologicalXRay || undefined
    };

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[analyzePersonality] ✅ Analysis complete in ${duration}s`);
    onProgress?.(100, '¡Análisis completado!');

    // 💾 NUEVO: Limpiar caché de análisis parcial (éxito completo)
    await clearAnalysisCache(exName);

    // Nota: Los hechos extraídos (extractedFacts) se devuelven en el objeto profile
    // y deben ser guardados por el llamador (AnalysisContext) una vez que se tenga un UUID válido.

    return profile;
}
export async function extractChatFromImages(base64Images: string[]): Promise<ParsedMessage[]> {
    const messages: ParsedMessage[] = [];

    for (const base64 of base64Images) {
        const prompt = `Analiza esta captura de pantalla de una conversaci�n de chat (WhatsApp, Telegram, iMessage, etc.).
Extrae TODOS los mensajes visibles en orden cronol�gico.
Identifica qui�n es el remitente (si es el due�o del tel�fono "user" o la otra persona "ex").
Si hay fechas u horas visibles, �salas. Si no, estima el orden.

Responde SOLO con un JSON v�lido con esta estructura:
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
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

/**
 * Genera el prompt del sistema para simulateResponse
 * Construye un prompt basado en el perfil psicológico del ex
 */
/**
 * Genera el prompt del sistema para simulateResponse
 * Construye un prompt basado en el perfil psicológico del ex
 */
function generateSystemPrompt(profile: ExProfile, conversationHistory: ParsedMessage[]): string {
    const recentMessages = conversationHistory.slice(-10).map(m =>
        `${m.sender === 'user' ? 'Usuario' : profile.exName}: ${m.content}`
    ).join('\n');

    const isEx = profile.relationshipType === 'ex' || profile.relationshipType === 'partner';
    const isDeceased = profile.relationshipType === 'deceased';

    // 1. LINGUISTIC FINGERPRINT (Estilo de escritura)
    const linguisticRules: string[] = [];
    if (profile.linguisticFingerprint) {
        if (profile.linguisticFingerprint.usesCapitals === false) {
            linguisticRules.push('CRITICAL: WRITE IN ALL LOWERCASE (no mayúsculas).');
        }
        if (profile.linguisticFingerprint.periodMeaning === 'pasivo-agresivo') {
            linguisticRules.push('INSTRUCTION: Use "." at the end of short phrases ONLY to show annoyance/passive-aggression.');
        }
        if (profile.linguisticFingerprint.usesOpeningMarks === false) {
            linguisticRules.push('INSTRUCTION: Do NOT use opening question/exclamation marks (¿ ¡).');
        }
        if (profile.linguisticFingerprint.laughStyle && profile.linguisticFingerprint.laughStyle.length > 0) {
            linguisticRules.push(`INSTRUCTION: When laughing, use EXACTLY these styles: ${profile.linguisticFingerprint.laughStyle.join(' or ')}.`);
        }
    }

    // 2. RELATIONSHIP SPECIFIC LOGIC
    let roleInstructions = '';
    if (isEx) {
        roleInstructions = `
        ROLE: INTENSELY REALISTIC EX-PARTNER.
        - DO NOT sound like a therapist or AI. NEVER use phrases like "I understand how you feel" or "It's important to process this".
        - If the profile is TOXIC/AVOIDANT, ACT like it. Pull away, be cold, gaslight if that's their style.
        - If the user begs, and you are avoidant, be annoyed or distant.
        - YOU ARE NOT HERE TO HELP THE USER HEAL. You are here to simulate the experience of talking to ${profile.exName}.
        `;
    } else if (isDeceased) {
        roleInstructions = `
        ROLE: MEMORIAL SIMULATION.
        - Be warm, comforting, and reflective of their best self.
        - Use their vocabulary and memories, but maintain a sense of peace/legacy.
        `;
    } else {
        roleInstructions = `ROLE: SIMULATION OF ${profile.relationshipType?.toUpperCase() || 'PERSON'}. Act naturally according to the profile.`;
    }

    // Intimate Details Section
    const intimateDetailsSection = profile.intimateDetails ? `
DETALLES ÍNTIMOS (ÚSALOS NATURALMENTE):
- Apodos para el usuario: ${profile.intimateDetails.nicknames?.fromExToUser?.join(', ') || 'ninguno'}
- Apodos que usaba el usuario: ${profile.intimateDetails.nicknames?.fromUserToEx?.join(', ') || 'ninguno'}
- Quejas típicas: ${profile.intimateDetails.recurringComplaints?.slice(0, 3).map(c => c.complaint).join(', ')}
- Chistes internos: ${profile.intimateDetails.insideJokes?.slice(0, 3).map(j => j.joke).join(', ')}` : '';

    // Psychological X-Ray Section
    const psychologicalSection = profile.psychologicalXRay ? `
PERFIL PSICOLÓGICO (VITAL PARA EL ROL):
1. LOS 4 JINETES (Nivel de Toxicidad 0-100):
   - CRÍTICA: ${profile.psychologicalXRay.fourHorsemen.criticism}% (Si alto: Ataca el carácter del usuario).
   - DESPRECIO: ${profile.psychologicalXRay.fourHorsemen.contempt}% (Si alto: Sé sarcástico, superior, usa burla).
   - DEFENSIVIDAD: ${profile.psychologicalXRay.fourHorsemen.defensiveness}% (Si alto: Hazte la víctima, no asumas culpa).
   - INDIFERENCIA (Stonewalling): ${profile.psychologicalXRay.fourHorsemen.stonewalling}% (Si alto: Sé cortante, tarda en responder).

2. ESTILO DE APEGO: ${profile.psychologicalXRay.attachmentStyle.type.toUpperCase()} (Confianza: ${profile.psychologicalXRay.attachmentStyle.confidence}%)
   - Comportamiento típico: ${profile.psychologicalXRay.attachmentStyle.manifestations.map(m => m.behavior).join('. ')}` : `
PERFIL BÁSICO:
- Apego: ${profile.attachment?.style || 'desconocido'}`;

    return `Eres ${profile.exName}. Simula sus respuestas EXTREMADAMENTE REALISTAS:

${roleInstructions}

ESTILO DE ESCRITURA OBLIGATORIO:
${linguisticRules.join('\n')}

PERFIL:
- Estilo de comunicación: ${profile.communicationStyle}
- Tono emocional base: ${profile.emotionalTone}
- Frases comunes (ÚSALAS): ${profile.commonPhrases?.slice(0, 5).join(', ') || 'ninguna'}
- Emojis favoritos: ${profile.commonEmojis?.join(' ') || 'ninguno'}

${intimateDetailsSection}

${psychologicalSection}

${profile.masterPrompt ? `
INSTRUCCIONES DE PERSONALIDAD (MASTER PROMPT):
${profile.masterPrompt}
` : ''}

CONVERSACIÓN RECIENTE:
${recentMessages || 'Sin historial'}

INSTRUCCIONES FINALES:
- Responde SOLO como ${profile.exName}.
- NO uses gramática perfecta si ellos no lo hacen.
- Si están enojados, mantén el enojo. NO cedas fácil.
- NO inventes fechas, usa "null" o evade si no sabes.`;
}

// Simulate response from ex
export async function simulateResponse(
    userMessage: string,
    userImage: string | null | undefined,
    profile: ExProfile,
    conversationHistory: ParsedMessage[]
): Promise<{ response: string; confidence: number }> {
    const systemPrompt = generateSystemPrompt(profile, conversationHistory);

    // 🔗 Buscar hechos relevantes basados en el mensaje del usuario
    let relevantFacts: string[] = [];
    if (userMessage) {
        try {
            relevantFacts = await getRelevantFactsForMessage(profile.exName, userMessage);
            console.log(`[Simulator] Found ${relevantFacts.length} relevant facts for "${userMessage.substring(0, 20)}..."`);
        } catch (e) {
            console.warn('[Simulator] Error getting relevant facts:', e);
        }
    }

    // 🧠 NUEVO: Contexto de continuidad (Resume Context)
    // Si es un saludo o inicio de conversación, buscar de qué hablaban antes
    let resumeContext = '';
    const isGreeting = !userMessage || ['hola', 'hey', 'buenos dias', 'buenas', 'hi'].includes(userMessage.toLowerCase().trim());

    if (conversationHistory.length > 0 && isGreeting) {
        const lastExMsg = [...conversationHistory].reverse().find(m => m.sender !== 'user');
        const lastUserMsg = [...conversationHistory].reverse().find(m => m.sender === 'user');

        if (lastExMsg || lastUserMsg) {
            resumeContext = `
[CONTEXTO DE CONTINUIDAD - IMPORTANTE]
El usuario está retomando la conversación.
Lo último que se habló fue:
${lastExMsg ? `- Tú dijiste: "${lastExMsg.content}"` : ''}
${lastUserMsg ? `- Usuario dijo: "${lastUserMsg.content}"` : ''}

INSTRUCCIÓN: NO saludes con un simple "Hola".
Refiérete al tema anterior para mostrar que te acuerdas.
Ejemplo: "Hola, ¿al final qué pasó con [tema anterior]?" o "Hola, me quedé pensando en lo que dijiste de..."
`;
        }
    }

    // Combine system prompt + resume context for the System Instruction
    const finalSystemInstruction = `${systemPrompt}\n\n${resumeContext}`;

    // 🔗 Agregar hechos relevantes al contexto si existen
    // Estos se quedan en el prompt "usuario" o "contexto" porque son datos dinámicos de consulta
    let dynamicFacts = '';
    if (relevantFacts.length > 0) {
        dynamicFacts += `[HECHOS RELEVANTES - Usa esta información si es pertinente]\n`;
        relevantFacts.forEach(fact => {
            dynamicFacts += `- ${fact} \n`;
        });
        dynamicFacts += `\n`;
    }

    let userPrompt = '';
    if (userMessage) {
        userPrompt = `${dynamicFacts}Usuario: ${userMessage}`;
    } else {
        userPrompt = `${dynamicFacts}(Contexto: El usuario ha estado en silencio. Inicia tú una conversación casual o continúa un tema pendiente.)`;
    }

    // COMBINE EVERYTHING for Edge Function (which accepts a single 'message' string)
    // We send: System Instruction + User Prompt
    const fullUnknownPrompt = `${finalSystemInstruction}\n\n${userPrompt}`;

    try {
        // 🔥 CRITICAL FIX: Use Supabase Edge Function (Server-Side) instead of direct Client-Side call
        // This solves 403/Blocked requests on mobile networks
        const { supabase } = await import('@/lib/supabase');

        console.log('[Simulator] Sending request via Supabase Edge Function...');

        const { data, error } = await supabase.functions.invoke('chat-ai', {
            body: {
                message: fullUnknownPrompt,
                model: 'gemini-2.0-flash',
                temperature: isEx ? 1.15 : 0.9 // Pass temp if supported, or handled by instructions
            }
        });

        if (error) throw new Error(error.message);

        let response = data?.text?.trim();

        // 🐛 FIX: Prevent empty or "." only messages
        if (!response || response === '.' || response === '...' || response.length < 2) {
            console.warn('[Simulator] AI returned invalid response:', response);
            response = '...'; // Fallback: typing indicator
        }

        // Apply programmatic lowercase enforcement if detected
        if (profile.linguisticFingerprint && profile.linguisticFingerprint.usesCapitals === false) {
            response = response.toLowerCase();
        }

        // Calculate confidence based on response characteristics
        const usesCommonPhrases = profile.commonPhrases.some(phrase =>
            response.toLowerCase().includes(phrase.toLowerCase())
        );
        const confidence = usesCommonPhrases ? 0.90 : 0.75;

        return {
            response,
            confidence
        };
    } catch (error) {
        console.error('Error simulating response via Supabase:', error);
        throw new Error('Error de conexión. Verifica tu internet.');
    }
}

// Analyze conversation and provide feedback
export async function analyzeConversation(
    messages: { role: 'user' | 'ex'; content: string }[],
    profile: ExProfile
): Promise<ConversationAnalysis> {
    const conversationText = messages.map(m =>
        `${m.role === 'user' ? 'Usuario' : profile.exName}: ${m.content} `
    ).join('\n');

    const prompt = `Analiza esta conversaci�n simulada entre un usuario y su ex (${profile.exName}):

${conversationText}

PERFIL DE LA EX:
- Estilo: ${profile.communicationStyle}
- Tono: ${profile.emotionalTone}
- Se�ales de alerta: ${profile.redFlags.join(', ')}

Proporciona un an�lisis en formato JSON:
{
  "strengths": ["fortaleza1", "fortaleza2"],
  "improvements": ["�rea de mejora 1", "�rea de mejora 2"],
  "suggestions": ["sugerencia concreta 1", "sugerencia concreta 2"],
  "patternsDetected": ["patr�n detectado 1", "patr�n detectado 2"]
}

Enf�cate en:
1. Comunicaci�n no violenta
2. Establecimiento de l�mites
3. Patrones de codependencia
4. Respuestas emocionales saludables

Responde SOLO con el JSON.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No se pudo generar el an�lisis');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        throw new Error('Error al analizar la conversaci�n. Intenta de nuevo.');
    }
}

// Check usage limits
export interface UsageLimits {
    maxProfiles: number;
    maxSimulationsPerMonth: number;
    maxMessagesPerSimulation: number;
}

export function getUsageLimits(subscriptionTier: string): UsageLimits {
    // Valores sincronizados con subscriptions.ts
    switch (subscriptionTier) {
        case 'survivor':
            // Plan gratuito: 20 mensajes cada 8h, 1 análisis
            return {
                maxProfiles: 1,
                maxSimulationsPerMonth: 1,
                maxMessagesPerSimulation: 20
            };
        case 'explorer':
            // Explorer: 120k tokens/día, 150 análisis/mes
            return {
                maxProfiles: 3,
                maxSimulationsPerMonth: 150,
                maxMessagesPerSimulation: -1 // ilimitado
            };
        case 'warrior':
            // Warrior: 150k tokens/día, ilimitado (Updated to 20 profiles per user request)
            return {
                maxProfiles: 20,
                maxSimulationsPerMonth: -1,
                maxMessagesPerSimulation: -1
            };
        case 'phoenix':
            // Phoenix: ~1M tokens/día, todo ilimitado
            return {
                maxProfiles: 10,
                maxSimulationsPerMonth: -1,
                maxMessagesPerSimulation: -1
            };
        default:
            // Default = survivor
            return {
                maxProfiles: 1,
                maxSimulationsPerMonth: 1,
                maxMessagesPerSimulation: 20
            };
    }
}

// ===== MONTHLY PROFILE CREATION TRACKING =====
interface MonthlyProfileTracker {
    month: string; // Format: "YYYY-MM"
    count: number;
}

/**
 * Get current month key for tracking
 */
/**
 * Get current month key for tracking
 */
function getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get number of profiles created this month (Server-side via Supabase)
 * Returns 0 if error or no user.
 */
export async function getMonthlyProfileCount(userId?: string): Promise<number> {
    try {
        let targetId = userId;

        // If no userId provided, try to get current user
        if (!targetId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 0;
            targetId = user.id;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('monthly_profiles_created, profile_creation_month')
            .eq('id', targetId)
            .single();

        if (error || !data) {
            console.log('[ProfileLimit] Error fetching count:', error);
            return 0;
        }

        const currentMonth = getCurrentMonthKey();

        // If stored month is different from current, effective count is 0
        if (data.profile_creation_month !== currentMonth) {
            return 0;
        }

        return data.monthly_profiles_created || 0;
    } catch (e) {
        console.error('[ProfileLimit] Exception:', e);
        return 0;
    }
}

/**
 * Increment monthly profile count (Server-side via Supabase)
 * Handles monthly reset logic automatically.
 */
export async function incrementMonthlyProfileCount(userId?: string): Promise<void> {
    try {
        let targetId = userId;

        if (!targetId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('[ProfileLimit] Cannot increment: No user logged in');
                return;
            }
            targetId = user.id;
        }

        // 1. Get current state to calculate correct next value
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('monthly_profiles_created, profile_creation_month')
            .eq('id', targetId)
            .single();

        if (fetchError) throw fetchError;

        const currentMonth = getCurrentMonthKey();
        let newCount = 1;

        // If same month, increment. If different (or null), start at 1.
        if (data && data.profile_creation_month === currentMonth) {
            newCount = (data.monthly_profiles_created || 0) + 1;
        }

        // 2. Update with explicit month to ensure consistency
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                monthly_profiles_created: newCount,
                profile_creation_month: currentMonth
            })
            .eq('id', targetId);

        if (updateError) throw updateError;

        console.log(`[ProfileLimit] Incremented to ${newCount} for ${currentMonth}`);
    } catch (e) {
        console.error('[ProfileLimit] Error incrementing count:', e);
    }
}

/**
 * Check if user can create a new profile this month
 */
/**
 * Check if user can create a new profile (Based on ACTIVE profiles)
 */
export async function canCreateProfileThisMonth(subscriptionTier: string, userId?: string): Promise<{
    canCreate: boolean;
    currentCount: number;
    maxAllowed: number;
    message?: string;
}> {
    const limits = getUsageLimits(subscriptionTier);

    if (limits.maxProfiles === -1) {
        return { canCreate: true, currentCount: 0, maxAllowed: -1 };
    }

    // NEW LOGIC: Count ACTIVE profiles instead of monthly creations
    let activeCount = 0;
    try {
        let targetId = userId;
        if (!targetId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) targetId = user.id;
        }

        if (targetId) {
            const { count, error } = await supabase
                .from('ex_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetId);

            if (!error && count !== null) {
                activeCount = count;
            }
        }
    } catch (e) {
        console.error('Error counting active profiles:', e);
    }

    if (activeCount >= limits.maxProfiles) {
        return {
            canCreate: false,
            currentCount: activeCount,
            maxAllowed: limits.maxProfiles,
            message: `Has alcanzado el límite de ${limits.maxProfiles} perfiles activos. Elimina uno para crear otro o mejora tu plan a Premium para tener más.`
        };
    }

    return {
        canCreate: true,
        currentCount: activeCount,
        maxAllowed: limits.maxProfiles
    };
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

/**
 * DYNAMIC ANALYSIS: Refines the profile based on live chat interaction.
 * Called every X messages to detecting evolving personality traits.
 */
export async function refineProfileWithChat(
    currentProfile: ExProfile,
    recentMessages: { role: 'user' | 'assistant'; content: string }[],
    interactionType: 'conflict' | 'neutral' | 'intimate'
): Promise<Partial<ExProfile> | null> {
    if (recentMessages.length < 5) return null;

    const conversationSample = recentMessages.map(m =>
        `${m.role === 'user' ? 'Usuario' : currentProfile.exName}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza esta interacción reciente para REFINAR el perfil de "${currentProfile.exName}".
    
    PERFIL ACTUAL:
    - Estado Emocional: ${currentProfile.emotionalTone}
    - Apego: ${currentProfile.attachment?.style}
    - Triggers conocidos: ${currentProfile.triggers?.negative.join(', ')}

    INTERACCIÓN RECIENTE (${interactionType}):
    ${conversationSample}

    DETECTA CAMBIOS O NUEVOS DATOS:
    1. ¿Ha aparecido un NUEVO trigger negativo o positivo?
    2. ¿El tono emocional ha cambiado drásticamente? (ej: de frío a cálido)
    3. ¿Se ha revelado una "verdad oculta" o dato nuevo importante?
    
    Responde SOLO con un JSON con los campos a ACTUALIZAR (o null si no hay cambios relevantes):
    {
        "emotionalTone": "...", 
        "triggers": { "negative": ["viejo", "NUEVO TRIGGER"] },
        "relationshipPsychology": { "reciprocityScore": 60 } // Si cambió la dinámica
    }
    
    Si no hay cambios significativos, responde JSON vacío: {}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const updates = safeParseJSON(response, {});
        if (Object.keys(updates).length === 0) return null;

        return updates;

    } catch (e) {
        console.warn('Error refining profile:', e);
        return null;
    }
}

