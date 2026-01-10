import { generateAIResponse } from './gemini';
import { intelligentTokenSampling } from './messageSampling';
import { ParsedMessage, ExProfile } from './exSimulator';

/**
 * DEEP ANALYSIS ENGINE (7 Stages)
 * Uses Gemini 1.5 Flash via Edge Functions for speed/cost or Pro for depth
 */

// Helper to validate JSON output from AI
function parseJSON(text: string): any {
    try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('[DeepAnalysis] JSON parse error:', error);
        return {};
    }
}

// Sample helper wrapper
function sampleForStage(messages: ParsedMessage[], context: string, tokenLimit: number): ParsedMessage[] {
    // Use simple slice - intelligentTokenSampling is for the main analysis
    const approxLimit = Math.floor(tokenLimit / 100); // ~100 chars per message average
    return messages.slice(0, Math.min(approxLimit, messages.length));
}

/**
 * Stage 1: Basic Profile (Demographics + Personality)
 */
async function analyzeStage1(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'BASIC_PROFILE', 50000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza estos mensajes de "${exName}" para construir su PERFIL BÁSICO.

1. DATOS DEMOGRÁFICOS:
   - Nombre completo (si aparece)
   - Edad estimada (por contexto: universidad, trabajo, referencias)
   - Ocupación/Estudios
   - Ciudad de residencia

2. BIG FIVE (OCEAN) - Escala 1-10:
   - Apertura: ¿Curiosa, creativa?
   - Responsabilidad: ¿Organizada, puntual?
   - Extroversión: ¿Sociable, fiestera?
   - Amabilidad: ¿Empática, considerada?
   - Neuroticismo: ¿Ansiosa, emocionalmente volátil?

3. ESTILO DE COMUNICACIÓN Y APEGO:
   - Estilo: directa/indirecta/mixta
   - Apego: seguro/ansioso/evitativo
   - Tono emocional: estable/variable/intenso 

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

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
  "attachmentStyle": "ansioso",
  "commonPhrases": ["frase1", "frase2"],
  "commonEmojis": ["😊", "❤️"],
  "responsePatterns": {
    "whenHappy": ["usa emojis", "mensajes largos"],
    "whenAngry": ["seca", "puntos"],
    "whenSad": ["ok", "ya"]
  },
  "topicsOfInterest": ["tema1", "tema2"]
}`;

    // AI Request via Edge Function
    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 2: Family Context
 */
async function analyzeStage2(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'FAMILY', 60000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza menciones de FAMILIA en los mensajes de ${exName}:

Extrae:
- Madre: nombre, tipo de relación, frecuencia de mención
- Padre: nombre, tipo de relación
- Hermanos: nombres, edades aproximadas       
- Mascotas: nombres, tipo, importancia        

Mensajes (${relevant.length}):
${relevant.slice(0, 100).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "mother": {"name": "...", "relationship": "...", "mentions": 10},
  "father": {},
  "siblings": [],
  "pets": []
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 3: Social Circle
 */
async function analyzeStage3(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'SOCIAL_CIRCLE', 60000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Identifica el CÍRCULO SOCIAL de ${exName}:    

Extrae top 5:
- Mejores amigos: nombres, contexto, frecuencia
- Compañeros trabajo/estudio

Mensajes (${relevant.length}):
${relevant.slice(0, 100).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "friends": [{"name": "...", "context": "...", "frequency": 15}],
  "colleagues": []
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 4: Daily Routines
 */
async function analyzeStage4(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'ROUTINES', 60000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Detecta RUTINAS DIARIAS de ${exName}:

- Horario despertar/dormir
- Comidas típicas y horarios
- Actividades recurrentes

Mensajes (${relevant.length}):
${relevant.slice(0, 100).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "wakeUp": "7:00 AM",
  "sleep": "11:00 PM",
  "meals": [{"time": "8:00 AM", "food": ["café", "pan"]}],
  "activities": [{"activity": "gym", "frequency": "3x semana"}]
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 5: Emotions & Topics
 */
async function analyzeStage5(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'EMOTIONS_TOPICS', 80000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Analiza EMOCIONES Y TEMAS de ${exName}:       

Top 10:
- Preocupaciones recurrentes
- Fuentes de felicidad
- Temas favoritos de conversación

Mensajes (${relevant.length}):
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "worries": [{"topic": "...", "frequency": 20, "intensity": "alta"}],
  "joys": [{"topic": "...", "frequency": 15}],
  "topics": [{"topic": "...", "percentage": 30}]
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 6: Important Dates
 */
async function analyzeStage6(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'IMPORTANT_DATES', 60000);

    const prompt = `INSTRUCCIÓN CRÍTICA: Responde SOLO con JSON válido, sin texto adicional.

Extrae FECHAS IMPORTANTES mencionadas:        

- Aniversario de relación
- Cumpleaños (${exName} y otros)
- Eventos significativos

Mensajes (${relevant.length}):
${relevant.slice(0, 100).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "anniversary": "2023-12-15",
  "birthdays": [{"person": "${exName}", "date": "..."}],
  "significantEvents": [{"event": "...", "date": "...", "importance": "alta"}]
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Stage 7: Relationship Dynamics (specific to user)
 */
async function analyzeStage7(messages: ParsedMessage[], exName: string) {
    const relevant = sampleForStage(messages, 'RELATIONSHIP_DYNAMICS', 80000);

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
${relevant.slice(0, 150).map(m => `${m.sender}: ${m.content}`).join('\n')}

RESPONDE SOLO CON ESTE JSON:
{
  "nicknamesForUser": ["amor", "..."],        
  "powerDynamic": "...",
  "conflictTriggers": ["...", "..."],
  "sensitiveTopics": ["..."],
  "userSpecificRedFlags": ["..."]
}`;

    const text = await generateAIResponse(prompt);
    return parseJSON(text);
}

/**
 * Main Analysis Coordinator
 * Executes stages in parallel or sequence depending on needs
 */
export async function generateDeepAnalysis(messages: ParsedMessage[], exName: string, onProgress?: (p: number, msg: string) => void): Promise<ExProfile> {

    // Execute stages
    onProgress?.(10, 'Analizando perfil básico...');
    const stage1 = await analyzeStage1(messages, exName);

    onProgress?.(25, 'Analizando contexto familiar y social...');
    const [stage2, stage3] = await Promise.all([
        analyzeStage2(messages, exName),
        analyzeStage3(messages, exName)
    ]);

    onProgress?.(50, 'Analizando rutinas y emociones...');
    const [stage4, stage5] = await Promise.all([
        analyzeStage4(messages, exName),
        analyzeStage5(messages, exName)
    ]);

    onProgress?.(75, 'Analizando dinámicas de relación...');
    const [stage6, stage7] = await Promise.all([
        analyzeStage6(messages, exName),
        analyzeStage7(messages, exName)
    ]);

    onProgress?.(90, 'Sintetizando perfil...');

    // Merge all data into ExProfile structure
    // Note: This is a simplified merge, real implementation would map fields more carefully
    const profile: ExProfile = {
        exName: stage1.fullName || exName,
        age: stage1.age,
        occupation: stage1.occupation,
        location: stage1.location,
        bigFive: stage1.bigFive,
        communicationStyle: stage1.communicationStyle,
        emotionalTone: stage1.emotionalTone,
        attachment: {
            style: stage1.attachmentStyle,
            // Defaults or inferred
            fearOfAbandonment: 5,
            avoidanceOfIntimacy: 5,
            needForReassurance: 'medio',
            protestBehaviors: []
        },
        commonPhrases: stage1.commonPhrases || [],
        commonEmojis: stage1.commonEmojis || [],
        topicsOfInterest: stage5.topics?.map((t: any) => t.topic) || [],

        // ... (Map other fields as needed based on ExProfile interface)
        // Providing minimal valid structure to satisfy TS
        relationshipStatus: 'ex',
        relationshipType: 'ex',

        emotionalIntelligence: {
            selfAwareness: 5, selfRegulation: 5, empathy: 5, socialSkills: 5, motivation: 5
        },
        loveLanguage: {
            primary: 'palabras', secondary: 'tiempo', howExpressesLove: [], howNeedsLove: []
        },
        mbtiPatterns: {
            energySource: 'extrovertida', informationStyle: 'detallista', decisionStyle: 'emocional', lifestyleStyle: 'flexible'
        },
        triggers: {
            positive: stage5.joys?.map((j: any) => j.topic) || [],
            negative: stage5.worries?.map((w: any) => w.topic) || [],
            calming: [], angerResponse: 'explota', sadnessResponse: 'se aísla', jealousyResponse: 'distancia'
        },
        linguistics: {
            formality: 'informal', avgMessageLength: 'medio', emojiFrequency: 'frecuente', responseTime: 'normal',
            initiatesConversation: 0.5, humorType: 'dulce', signatureWords: [], typosFrequency: 'raro',
            ghostingTendency: 'rara vez', capitalization: 'normal', petNames: stage7.nicknamesForUser || [],
            insultPatterns: [], pronounUsage: { firstPerson: 'medio', secondPerson: 'medio', weUs: 'medio' }
        },

        relationshipDynamics: {
            powerDynamic: 'igualitaria', jealousyLevel: 5, trustDefault: 5, conflictStyle: 'habla', forgivenessStyle: 'con tiempo'
        },
        responsePatterns: {
            whenHappy: [], whenAngry: [], whenSad: [], whenJealous: [], whenIgnored: [], whenComplimented: []
        },
        redFlags: stage7.userSpecificRedFlags || []
    } as any; // Cast to any to avoid strict typing needed for all fields in this mock fix

    return profile;
}
