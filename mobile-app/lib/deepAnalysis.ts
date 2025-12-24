import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage, ExProfile } from './exSimulator';
import { intelligentTokenSampling, sampleForStage } from './messageSampling';

const GEMINI_API_KEY = 'AIzaSyArs8uYXZvwFAwZ7IwGHaE7KK9x6O5iA9c'; // TODO: Move to env
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Extended profile with deep psychological analysis
 */
export interface DeepProfile extends ExProfile {
    // Personal Info
    fullName?: string;
    nickname?: string;
    age?: number;
    location?: string;
    occupation?: string;

    // Big Five Personality
    bigFive?: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
    };

    // Family
    family?: {
        mother?: { name?: string; relationship?: string; mentions?: number };
        father?: { name?: string; relationship?: string; mentions?: number };
        siblings?: Array<{ name?: string; age?: string; relationship?: string }>;
        pets?: Array<{ name?: string; type?: string; importance?: string }>;
    };

    // Social Circle
    friends?: Array<{ name: string; context?: string; frequency?: number }>;
    colleagues?: Array<{ name: string; context?: string }>;

    // Routines
    dailyRoutine?: {
        wakeUp?: string;
        sleep?: string;
        meals?: Array<{ time?: string; food?: string[] }>;
        activities?: Array<{ activity: string; frequency?: string }>;
    };

    // Emotions & Topics
    worries?: Array<{ topic: string; frequency?: number; intensity?: string }>;
    joys?: Array<{ topic: string; frequency?: number }>;
    favoriteTopics?: Array<{ topic: string; percentage?: number }>;

    // Important Dates
    importantDates?: {
        anniversary?: string;
        birthdays?: Array<{ person: string; date?: string }>;
        significantEvents?: Array<{ event: string; date?: string; importance?: string }>;
    };

    // Relationship Dynamics (specific to user)
    relationshipDynamics?: {
        nicknamesForUser?: string[];
        powerDynamic?: string;
        conflictTriggers?: string[];
        sensitiveTopics?: string[];
        userSpecificRedFlags?: string[];
    };

    // Meta
    tokenCost?: number;
    confidenceScore?: number;
}

/**
 * Analyze messages in 7 stages for deep personality profiling
 */
export async function analyzeDeepPersonality(
    messages: ParsedMessage[],
    exName: string,
    onProgress?: (progress: number, status: string) => void
): Promise<DeepProfile> {
    console.log('[DeepAnalysis] 🚀 Starting 7-stage deep analysis...');

    if (onProgress) onProgress(0, 'Iniciando análisis profundo...');

    // Step 0: Intelligent token sampling (500k max)
    if (onProgress) onProgress(5, 'Preparando datos...');
    const { messages: sampledMessages, stats } = intelligentTokenSampling(messages, 600000);

    console.log(`[DeepAnalysis] Sampled ${sampledMessages.length} messages (${stats.estimatedTokens} tokens)`);

    // Initialize profile with basic analysis (from existing system)
    const basicProfile: DeepProfile = {
        communicationStyle: '',
        commonPhrases: [],
        emotionalTone: '',
        attachmentStyle: '',
        responsePatterns: {
            whenHappy: [],
            whenAngry: [],
            whenSad: []
        },
        topicsOfInterest: [],
        redFlags: []
    };

    try {
        // Stage 1: Personal Info + Big Five (15%)
        if (onProgress) onProgress(15, 'Analizando personalidad Big Five...');
        const stage1 = await analyzeStage1(sampledMessages, exName);
        Object.assign(basicProfile, stage1);

        // Stage 2: Family (28%)
        if (onProgress) onProgress(28, 'Analizando contexto familiar...');
        const stage2 = await analyzeStage2(sampledMessages, exName);
        basicProfile.family = stage2;

        // Stage 3: Social Circle (42%)
        if (onProgress) onProgress(42, 'Analizando círculo social...');
        const stage3 = await analyzeStage3(sampledMessages, exName);
        basicProfile.friends = stage3.friends;
        basicProfile.colleagues = stage3.colleagues;

        // Stage 4: Routines (56%)
        if (onProgress) onProgress(56, 'Detectando rutinas diarias...');
        const stage4 = await analyzeStage4(sampledMessages, exName);
        basicProfile.dailyRoutine = stage4;

        // Stage 5: Emotions & Topics (70%)
        if (onProgress) onProgress(70, 'Analizando emociones y temas...');
        const stage5 = await analyzeStage5(sampledMessages, exName);
        basicProfile.worries = stage5.worries;
        basicProfile.joys = stage5.joys;
        basicProfile.favoriteTopics = stage5.topics;

        // Stage 6: Important Dates (84%)
        if (onProgress) onProgress(84, 'Extrayendo fechas importantes...');
        const stage6 = await analyzeStage6(sampledMessages, exName);
        basicProfile.importantDates = stage6;

        // Stage 7: Relationship Dynamics (98%)
        if (onProgress) onProgress(98, 'Analizando dinámica de relación...');
        const stage7 = await analyzeStage7(sampledMessages, exName);
        basicProfile.relationshipDynamics = stage7;

        // Calculate confidence score
        basicProfile.confidenceScore = calculateConfidence(sampledMessages.length, messages.length);
        basicProfile.tokenCost = stats.estimatedTokens;

        if (onProgress) onProgress(100, '¡Análisis completo!');

        console.log('[DeepAnalysis] ✅ Analysis complete!');
        return basicProfile;

    } catch (error) {
        console.error('[DeepAnalysis] ❌ Error:', error);
        throw error;
    }
}

/**
 * Stage 1: Personal Info + Big Five Personality
 */
async function analyzeStage1(messages: ParsedMessage[], exName: string): Promise<Partial<DeepProfile>> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'PERSONAL_INFO', 100000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional antes o después.

Analiza estos mensajes de WhatsApp de ${exName} y extrae:

1. INFORMACIÓN PERSONAL:
   - Nombre completo y apodos (extrae del chat, NO inventes)
   - Edad aproximada  
   - Ubicación/ciudad
   - Ocupación/estudios

2. BIG FIVE PERSONALITY (escala 1-10):
   - Apertura: ¿Qué tan curiosa, creativa, abierta a nuevas ideas?
   - Responsabilidad: ¿Organizada, puntual, cumplida?
   - Extraversión: ¿Sociable, energética, expresiva?
   - Amabilidad: ¿Empática, cooperativa, considerada?
   - Neuroticismo: ¿Ansiosa, emocionalmente volátil?

3. ESTILO DE COMUNICACIÓN Y APEGO:
   - Estilo: directa/indirecta/mixta
   - Apego: seguro/ansioso/evitativo
   - Tono emocional: estable/variable/intenso

Mensajes (${relevant.length}):
${relevant.slice(0, 200).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON (sin texto adicional):
{
  "fullName": "nombre extraído del chat",
  "nickname": "apodo usado",
  "age": 25,
  "location": "ciudad",
  "occupation": "trabajo/estudio",
  "bigFive": {
    "openness": 7,
    "conscientiousness": 6,
    "extraversion": 8,
    "agreeableness": 7,
    "neuroticism": 5
  },
  "communicationStyle": "directa",
  "emotionalTone": "variable",
  "attachmentStyle": "ansioso"
  "commonPhrases": ["frase1", "frase2", "frase3", "frase4", "frase5", "frase6", "frase7", "frase8", "frase9", "frase10"],
  "commonEmojis": ["??", "??", "??", "??", "??", "??", "??", "??"],
  "responsePatterns": {
    "whenHappy": ["usa emojis", "mensajes largos", "exclamaciones"],
    "whenAngry": ["seca", "puntos", "monos�labos"],
    "whenSad": ["ok", "ya", "si"]
  },
  "topicsOfInterest": ["tema1", "tema2", "tema3", "tema4", "tema5", "tema6"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return parseJSON(text);
}

/**
 * Stage 2: Family Context
 */
async function analyzeStage2(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'FAMILY', 120000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza menciones de FAMILIA en los mensajes de ${exName}:

Extrae:
- Madre: nombre, tipo de relación, frecuencia de mención
- Padre: nombre, tipo de relación
- Hermanos: nombres, edades aproximadas
- Mascotas: nombres, tipo, importancia

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "mother": {"name": "...", "relationship": "...", "mentions": 10},
  "father": {...},
  "siblings": [{...}],
  "pets": [{...}]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Stage 3: Social Circle
 */
async function analyzeStage3(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'SOCIAL_CIRCLE', 130000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Identifica el CÍRCULO SOCIAL de ${exName}:

Extrae top 5:
- Mejores amigos: nombres, contexto, frecuencia
- Compañeros trabajo/estudio

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "friends": [{"name": "...", "context": "...", "frequency": 15}],
  "colleagues": [...]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Stage 4: Daily Routines
 */
async function analyzeStage4(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'ROUTINES', 140000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Detecta RUTINAS DIARIAS de ${exName}:

- Horario despertar/dormir
- Comidas típicas y horarios
- Actividades recurrentes

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "wakeUp": "7:00 AM",
  "sleep": "11:00 PM",
  "meals": [{"time": "8:00 AM", "food": ["café", "pan"]}],
  "activities": [{"activity": "gym", "frequency": "3x semana"}]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Stage 5: Emotions & Topics
 */
async function analyzeStage5(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'EMOTIONS_TOPICS', 150000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza EMOCIONES Y TEMAS de ${exName}:

Top 10:
- Preocupaciones recurrentes
- Fuentes de felicidad
- Temas favoritos de conversación

Mensajes (${relevant.length}):
${relevant.slice(0, 200).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "worries": [{"topic": "...", "frequency": 20, "intensity": "alta"}],
  "joys": [{"topic": "...", "frequency": 15}],
  "topics": [{"topic": "...", "percentage": 30}]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Stage 6: Important Dates
 */
async function analyzeStage6(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'IMPORTANT_DATES', 120000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Extrae FECHAS IMPORTANTES mencionadas:

- Aniversario de relación
- Cumpleaños (${exName} y otros)
- Eventos significativos

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "anniversary": "2023-12-15",
  "birthdays": [{"person": "${exName}", "date": "..."}],
  "significantEvents": [{"event": "...", "date": "...", "importance": "alta"}]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Stage 7: Relationship Dynamics (specific to user)
 */
async function analyzeStage7(messages: ParsedMessage[], exName: string) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const relevant = sampleForStage(messages, 'RELATIONSHIP_DYNAMICS', 140000);

    // Detect user name from messages (not from ex)
    const userMessages = relevant.filter(m => m.sender !== exName);
    const userName = userMessages.length > 0 ? userMessages[0].sender : 'Usuario';

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza la DINÁMICA DE RELACIÓN entre ${exName} y ${userName}:

1. Cómo ${exName} llama a ${userName} (apodos)
2. Dinámica de poder (quién busca más contacto)
3. Triggers de conflictos
4. Temas sensibles
5. Red flags específicas hacia ${userName}

Mensajes (${relevant.length}):
${relevant.slice(0, 200).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "nicknamesForUser": ["amor", "..."],
  "powerDynamic": "...",
  "conflictTriggers": ["...", "..."],
  "sensitiveTopics": ["..."],
  "userSpecificRedFlags": ["..."]
}`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Parse JSON from AI response (handles markdown)
 */
function parseJSON(text: string): any {
    try {
        // Remove markdown code blocks
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('[DeepAnalysis] JSON parse error:', error);
        return {};
    }
}

/**
 * Calculate confidence score based on data quantity
 */
function calculateConfidence(sampledCount: number, totalCount: number): number {
    const sampleRatio = sampledCount / totalCount;

    // Base confidence on total messages
    let base = 0.5;
    if (totalCount > 100000) base = 0.9;
    else if (totalCount > 50000) base = 0.8;
    else if (totalCount > 10000) base = 0.7;
    else if (totalCount > 1000) base = 0.6;

    // Adjust for sampling ratio
    return Math.min(base * (0.7 + sampleRatio * 0.3), 1.0);
}

