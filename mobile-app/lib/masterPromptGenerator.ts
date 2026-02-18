import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage } from './exSimulator';

// ===== TIPOS =====

export interface ImportantDate {
    dateType: string;
    dateValue: string;
    personName?: string;
    description?: string;
    significance?: number;
}

export interface EmbeddingStats {
    totalMessages: number;
    emotionBreakdown?: Record<string, number>;
}

export interface ProfileWithAdvancedFeatures {
    importantDates?: ImportantDate[];
    embeddingStats?: EmbeddingStats;
    [key: string]: unknown;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * MASTER PROMPT GENERATOR
 * 
 * Crea una representación completa de la persona (50k-200k tokens)
 * basada en análisis profundo de mensajes (variables: 1k-1M+)
 * 
 * NO solo imita el estilo → CREA la persona completa
 */

export interface MasterPromptResult {
    masterPrompt: string;
    tokenCount: number;
    categoriesAnalyzed: Record<string, boolean>;
    temporalContext?: string; // Phase 9 Analysis Result
    analysisDurationSeconds: number;
}

export interface ProgressCallback {
    (progress: number, status: string, timeRemaining?: number): void;
}

/**
 * Framework psicológico completo para crear una persona
 * Basado en investigación de psicología, neurociencia y modelos de IA conversacional
 */
/**
 * Framework psicológico ADAPTATIVO según el tipo de relación
 */
function getPersonalityFramework(relationshipType: string = 'ex') {
    const isRomantic = ['ex', 'partner', 'crush'].includes(relationshipType);
    const isFamily = ['family', 'fallecido'].includes(relationshipType);

    // 1. Identidad Core (Igual para todos)
    const CORE_IDENTITY = {
        weight: 0.05,
        subcategories: [
            'Datos biográficos básicos',
            'Autopercepción y autoimagen',
            'Valores fundamentales',
            'Creencias centrales',
            'Identidad cultural/regional'
        ]
    };

    // 2. Vida Personal (Igual para todos)
    const PERSONAL_LIFE = {
        weight: 0.10,
        subcategories: [
            'Estructura familiar completa',
            'Dinámica y relaciones familiares',
            'Círculo social (amigos, conocidos)',
            'Trabajo/estudios (detalles, ambiciones)',
            'Rutinas diarias completas',
            'Hobbies e intereses',
            'Vida financiera y preocupaciones'
        ]
    };

    // 3. Psicología Profunda (Adaptada)
    const DEEP_PSYCHOLOGY = {
        weight: 0.15,
        subcategories: [
            'Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)',
            // Apego solo si es relevante (romántico o muy cercano)
            ...(isRomantic ? ['Estilo de apego (Seguro, Ansioso, Evitativo, Desorganizado)'] : []),
            'Miedos profundos e inseguridades',
            'Traumas y eventos formativos',
            'Sueños, metas y aspiraciones',
            'Mecanismos de defensa psicológicos',
            'Inteligencia emocional y autorregulación',
            'Patrones de pensamiento (cognitivos)',
            'Locus de control (interno vs externo)',
            'Necesidades psicológicas básicas'
        ]
    };

    // 4. Historia de la Relación (MUY Adaptada)
    const RELATIONSHIP_HISTORY = {
        weight: 0.20,
        subcategories: isRomantic ? [
            'Cómo y cuándo se conocieron',
            'Desarrollo de la relación (timeline)',
            'Momentos felices y memorables',
            'Momentos difíciles y conflictos',
            'Dinámica de poder en la relación',
            'Patrones de comunicación',
            'Intimidad (emocional, física)',
            'Razones de la ruptura',
            'Sentimientos actuales post-ruptura',
            'Lecciones aprendidas'
        ] : isFamily ? [
            'Historia familiar compartida',
            'Recuerdos de infancia',
            'Dinámica familiar actual',
            'Conflictos familiares recurrentes',
            'Momentos de apoyo mutuo',
            'Tradiciones compartidas',
            'Rol dentro de la familia'
        ] : [ // Friends
            'Cómo se conocieron (origen de la amistad)',
            'Aventuras y anécdotas compartidas',
            'Intereses mutuos y hobbies',
            'Nivel de confianza y lealtad',
            'Dinámica de grupo (si aplica)',
            'Momentos de apoyo',
            'Inside jokes (chistes locales)'
        ]
    };

    // 5. Patrones Comportamentales (Adaptada)
    const BEHAVIORAL_PATTERNS = {
        weight: 0.15,
        subcategories: [
            'Reacciones ante estrés',
            'Comportamiento cuando está feliz',
            'Comportamiento cuando está triste/deprimida',
            'Comportamiento cuando está enojada',
            'Cómo maneja conflictos',
            'Patrones de evitación',
            // Ciclos emocionales más relevantes en parejas
            ...(isRomantic ? ['Ciclos emocionales recurrentes'] : []),
            'Triggers específicos',
            'Comportamiento en diferentes contextos sociales'
        ]
    };

    // 6. Conocimiento y Opiniones (Igual)
    const KNOWLEDGE_OPINIONS = {
        weight: 0.10,
        subcategories: [
            'Áreas de expertise',
            'Opiniones políticas',
            'Creencias religiosas/espirituales',
            'Filosofía de vida',
            'Opiniones sobre temas controversiales',
            'Gustos culturales (música, cine, arte)',
            'Preferencias alimentarias',
            ...(isRomantic ? ['Opiniones sobre relaciones y amor'] : [])
        ]
    };

    // 7. Estilo de Comunicación (Igual)
    const COMMUNICATION_STYLE = {
        weight: 0.10,
        subcategories: [
            'Patrones lingüísticos únicos',
            'Frases y expresiones características',
            'Uso de emojis y símbolos',
            'Ritmo y timing de mensajes',
            'Longitud típica de mensajes',
            'Formalidad vs informalidad',
            'Humor y sarcasmo',
            'Nivel de apertura emocional en textos'
        ]
    };

    // 8. Memorias Compartidas (NUEVO: Para Closeness)
    const SHARED_MEMORIES = {
        weight: 0.15,
        subcategories: [
            'Eventos específicos mencionados repetidamente',
            'Anécdotas de viajes o salidas',
            'Momentos de gran conexión emocional',
            'Inside jokes explicados',
            'Tradiciones de pareja/amistad',
            'Momentos difíciles que superaron',
            'Momentos de gran conexión emocional',
            'fechas importantes',
            'apodos de carino que se usan a menudo'
        ]
    };

    // 8. Contexto Temporal (Adaptada)
    const TEMPORAL_CONTEXT = {
        weight: 0.15,
        subcategories: [
            'Estado de vida actual',
            'Cambios recientes importantes',
            'Desafíos actuales',
            'Proyectos y planes futuros',
            'Evolución de personalidad',
            'Lecciones de vida recientes',
            ...(isRomantic ? ['Nueva perspectiva post-ruptura'] : [])
        ]
    };

    return {
        CORE_IDENTITY,
        PERSONAL_LIFE,
        DEEP_PSYCHOLOGY,
        RELATIONSHIP_HISTORY,
        BEHAVIORAL_PATTERNS,
        KNOWLEDGE_OPINIONS,
        COMMUNICATION_STYLE,
        SHARED_MEMORIES,
        TEMPORAL_CONTEXT
    };
}

/**
 * Calcula tiempo estimado de análisis basado en tamaño
 */
function estimateAnalysisTime(messageCount: number): number {
    // Fórmula basada en experiencia:
    // ~10 llamadas a IA, cada una tarda 3-8 segundos
    // Más procesamiento local

    const baseCalls = 12; // Llamadas a IA mínimas
    const avgCallTime = 5; // segundos por llamada
    const processingOverhead = 30; // segundos de procesamiento local

    // Archivos muy grandes necesitan más análisis
    const extraCallsForLargeFiles = messageCount > 100000 ? 3 : 0;

    const totalCalls = baseCalls + extraCallsForLargeFiles;
    const estimated = (totalCalls * avgCallTime) + processingOverhead;

    return estimated; // segundos
}

function normalizeRelationshipType(type: string): string {
    const normalized = (type || '').toLowerCase().trim();
    if (['ex', 'ex-partner', 'expartner'].includes(normalized)) return 'ex';
    if (['partner', 'pareja', 'novio', 'novia'].includes(normalized)) return 'partner';
    if (['crush'].includes(normalized)) return 'crush';
    if (['family', 'familia', 'familiar'].includes(normalized)) return 'family';
    if (['fallecido', 'deceased', 'difunto'].includes(normalized)) return 'fallecido';
    if (['friend', 'amigo', 'amiga'].includes(normalized)) return 'friend';
    return 'partner';
}

/**
 * Calcula el número máximo de mensajes a muestrear para no exceder el límite de contexto de Gemini.
 * Gemini 2.0 Flash soporta ~1M tokens de entrada; limitamos a ~200k chars (~50k tokens) por fase.
 */
function getDynamicSampleSize(messages: ParsedMessage[], maxChars: number = 200_000): number {
    if (messages.length === 0) return 0;
    // Estimar longitud promedio de mensaje
    const sampleForAvg = messages.slice(0, Math.min(100, messages.length));
    const avgLen = sampleForAvg.reduce((sum, m) => sum + m.content.length, 0) / sampleForAvg.length;
    const maxMessages = Math.floor(maxChars / Math.max(avgLen, 1));
    return Math.min(maxMessages, messages.length);
}

/**
 * Genera el Master Prompt completo
 * ACTUALIZADO: Acepta profile opcional con Advanced AI features
 */
export async function generateMasterPrompt(
    messages: ParsedMessage[],
    exSenderName: string,
    exName: string,
    relationshipType: string = 'ex',
    onProgress?: ProgressCallback,
    profile?: ProfileWithAdvancedFeatures // Profile data con Advanced AI features (importantDates, embeddingStats, etc.)
): Promise<MasterPromptResult> {
    const startTime = Date.now();
    console.log('[MasterPrompt] 🧠 Starting deep personality analysis...');
    console.log(`[MasterPrompt] Total messages: ${messages.length}`);
    console.log(`[MasterPrompt] Ex name: ${exName} (sender: ${exSenderName})`);

    // Estimar tiempo
    const estimatedSeconds = estimateAnalysisTime(messages.length);
    onProgress?.(0, 'Iniciando análisis profundo...', estimatedSeconds);

    // Filtrar mensajes del ex
    const exMessages = messages.filter(m => m.sender === exSenderName);
    const userMessages = messages.filter(m => m.sender !== exSenderName);

    console.log(`[MasterPrompt] Ex messages: ${exMessages.length}`);
    console.log(`[MasterPrompt] User messages: ${userMessages.length}`);

    if (exMessages.length < 50) {
        throw new Error(`Se necesitan al menos 50 mensajes del ex para crear una persona completa. Encontrados: ${exMessages.length}`);
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000 // Máximo por llamada
        }
    });

    // Objeto para almacenar resultados de cada categoría
    const analysisResults: Record<string, string> = {};
    const categoriesAnalyzed: Record<string, boolean> = {};

    const normalizedRelationshipType = normalizeRelationshipType(relationshipType);

    // Obtener framework adaptado
    const FRAMEWORK = getPersonalityFramework(normalizedRelationshipType);
    const totalPhases = Object.keys(FRAMEWORK).length;
    let currentPhase = 0;

    // FASE 1: IDENTIDAD CORE
    onProgress?.(5, 'Analizando identidad y datos personales...', estimatedSeconds * 0.95);
    currentPhase++;

    analysisResults.CORE_IDENTITY = await analyzeCoreIdentity(model, exMessages, exName);
    categoriesAnalyzed.CORE_IDENTITY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Core Identity`);

    // FASE 2: VIDA PERSONAL  
    onProgress?.(15, 'Extrayendo vida personal y rutinas...', estimatedSeconds * 0.85);
    currentPhase++;

    analysisResults.PERSONAL_LIFE = await analyzePersonalLife(model, exMessages, exName);
    categoriesAnalyzed.PERSONAL_LIFE = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Personal Life`);

    // FASE 3: PSICOLOGÍA PROFUNDA (la más importante)
    onProgress?.(30, 'Análisis psicológico profundo...', estimatedSeconds * 0.70);
    currentPhase++;

    analysisResults.DEEP_PSYCHOLOGY = await analyzeDeepPsychology(model, exMessages, exName);
    categoriesAnalyzed.DEEP_PSYCHOLOGY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Deep Psychology`);

    // FASE 4: HISTORIA DE LA RELACIÓN
    onProgress?.(50, 'Reconstruyendo historia de la relación...', estimatedSeconds * 0.50);
    currentPhase++;

    analysisResults.RELATIONSHIP_HISTORY = await analyzeRelationshipHistory(
        model,
        messages,
        exSenderName,
        exName,
        userMessages[0]?.sender || 'Usuario',
        normalizedRelationshipType
    );
    categoriesAnalyzed.RELATIONSHIP_HISTORY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Relationship History`);

    // FASE 5: PATRONES COMPORTAMENTALES
    onProgress?.(65, 'Identificando patrones de comportamiento...', estimatedSeconds * 0.35);
    currentPhase++;

    analysisResults.BEHAVIORAL_PATTERNS = await analyzeBehavioralPatterns(model, exMessages, exName);
    categoriesAnalyzed.BEHAVIORAL_PATTERNS = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Behavioral Patterns`);

    // FASE 6: CONOCIMIENTO Y OPINIONES
    onProgress?.(75, 'Extrayendo conocimientos y opiniones...', estimatedSeconds * 0.25);
    currentPhase++;

    analysisResults.KNOWLEDGE_OPINIONS = await analyzeKnowledgeOpinions(model, exMessages, exName);
    categoriesAnalyzed.KNOWLEDGE_OPINIONS = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Knowledge & Opinions`);

    // FASE 7: ESTILO DE COMUNICACIÓN
    onProgress?.(85, 'Analizando estilo de comunicación...', estimatedSeconds * 0.15);
    currentPhase++;

    analysisResults.COMMUNICATION_STYLE = await analyzeCommunicationStyle(model, exMessages, exName);
    categoriesAnalyzed.COMMUNICATION_STYLE = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Communication Style`);

    // FASE 8: MEMORIAS COMPARTIDAS (NUEVO)
    onProgress?.(90, 'Rescatando memorias compartidas...', estimatedSeconds * 0.10);
    currentPhase++;

    analysisResults.SHARED_MEMORIES = await analyzeSharedMemories(model, messages, exName, userMessages[0]?.sender || 'Usuario');
    categoriesAnalyzed.SHARED_MEMORIES = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Shared Memories`);

    // FASE 9: CONTEXTO TEMPORAL
    onProgress?.(95, 'Determinando contexto actual...', estimatedSeconds * 0.05);
    currentPhase++;

    analysisResults.TEMPORAL_CONTEXT = await analyzeTemporalContext(model, messages, exName);
    categoriesAnalyzed.TEMPORAL_CONTEXT = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Temporal Context`);

    // FASE 10: CONTEXTO DE INICIO (NUEVO)
    onProgress?.(97, 'Preparando contexto para el primer mensaje...', estimatedSeconds * 0.03);
    currentPhase++;

    analysisResults.INITIAL_MESSAGE_CONTEXT = await analyzeInitialMessage(model, messages, exName);
    categoriesAnalyzed.INITIAL_MESSAGE_CONTEXT = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Initial Message Context`);

    // Contexto directo de los últimos 50 mensajes para respuestas inmediatas
    const last50Raw = messages.slice(-50).map(m => `[${m.sender}]: ${m.content}`);
    let last50Chars = 0;
    const last50Lines: string[] = [];
    for (const line of last50Raw) {
        if (last50Chars + line.length > 180_000) break;
        last50Lines.push(line);
        last50Chars += line.length;
    }
    analysisResults.LAST_50_CONTEXT = `## ÚLTIMOS 50 MENSAJES (contexto real)
${last50Lines.join('\n')}`;

    // FASE FINAL: Ensamblar Master Prompt
    onProgress?.(98, 'Ensamblando Prompt Maestro...', 2);
    // --- STEP 9: Assemble Master Prompt ---
    const userName = userMessages[0]?.sender || 'Usuario'; // Define userName here
    const masterPrompt = assembleMasterPrompt(analysisResults, exName, normalizedRelationshipType, userName, profile); // ✨ Pass profile
    const tokenCount = estimateTokenCount(masterPrompt);

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    onProgress?.(100, '¡Análisis completo!', 0);

    console.log(`[MasterPrompt] ✅ COMPLETE`);
    console.log(`[MasterPrompt] Token count: ${tokenCount.toLocaleString()}`);
    console.log(`[MasterPrompt] Duration: ${durationSeconds}s`);

    return {
        masterPrompt,
        tokenCount,
        categoriesAnalyzed,
        temporalContext: analysisResults.TEMPORAL_CONTEXT, // Return separated Phase 9 result
        analysisDurationSeconds: durationSeconds
    };
}

/**
 * Helper para retry con exponential backoff
 */
async function callGeminiWithRetry(
    model: any,
    prompt: string,
    maxRetries: number = 3
): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.warn(`[Gemini] Retry ${i + 1}/${maxRetries}:`, error.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// ========================================
// FUNCIONES DE ANÁLISIS POR CATEGORÍA
// ========================================

/**
 * Fase 1: Identidad Core
 */
async function analyzeCoreIdentity(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Muestrear mensajes (primeros 500 + últimos 500) con techo de 180k chars
    const rawSample = [
        ...exMessages.slice(0, Math.min(500, exMessages.length / 2)),
        ...exMessages.slice(-Math.min(500, exMessages.length / 2))
    ].map(m => m.content);
    let sampleChars = 0;
    const sampleLines: string[] = [];
    for (const line of rawSample) {
        if (sampleChars + line.length > 180_000) break;
        sampleLines.push(line);
        sampleChars += line.length;
    }
    const sample = sampleLines.join('\n');

    const prompt = `Basándote ÚNICAMENTE en estos mensajes reales de ${exName}, extrae información sobre su IDENTIDAD CORE:

MENSAJES:
${sample}

Analiza y extrae (SIN inventar, solo lo que esté explícito o fuertemente implícito):

1. DATOS BIOGRÁFICOS
   - Edad (aproximada si no es exacta)
   - Ciudad/país donde vive
   - Ocupación (trabajo o estudios)
   - Nivel educativo

2. GÉNERO / SEXO (¡MUY IMPORTANTE para la simulación!)
   - ¿Es hombre o mujer? Infiere del lenguaje (terminaciones de adjetivos, pronombres, cómo se describe)
   - Ejemplos de mensajes que revelan el género
   - Si no es claro, escribe "Género ambiguo — inferir del contexto"

3. AUTOPERCEPCIÓN
   - Cómo se describe a sí mismo/a
   - Rasgos que enfatiza de su personalidad
   - Cómo cree que lo/la ven los demás

4. VALORES FUNDAMENTALES
   - Qué considera importante en la vida
   - Qué principios defiende
   - Qué le molesta profundamente

5. CREENCIAS CENTRALES
   - Visión del mundo
   - Creencias sobre relaciones
   - Creencias sobre éxito/felicidad

Formato de respuesta (markdown, detallado):

## IDENTIDAD CORE DE ${exName}

### Género Detectado
[HOMBRE / MUJER / AMBIGUO + evidencia]

### Datos Biográficos
[Información extraída]

### Autopercepción
[Cómo se ve a sí mismo/a]

### Valores Fundamentales
[Sus principios y prioridades]

### Creencias Centrales
[Su filosofía de vida]

IMPORTANTE: Si no hay evidencia de algo, escribe "No determinado de los mensajes". NO inventes.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 2: Vida Personal
 */
async function analyzePersonalLife(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Sample rico en detalles de vida — límite dinámico para chats grandes
    const maxN = getDynamicSampleSize(exMessages, 200_000);
    const sample = exMessages.slice(0, maxN).map(m => m.content).join('\n');

    const prompt = `Analiza la VIDA PERSONAL de ${exName} basándote en estos mensajes:

MENSAJES:
${sample}

Extrae información CONCRETA Y ESPECÍFICA sobre:

1. FAMILIA (nombres reales si se mencionan)
   - Padres: nombres, relación, conflictos o cercanía
   - Hermanos: nombres, edades aproximadas, dinámica
   - Mascotas: nombres y tipo
   - Frases que usa para hablar de su familia

2. CÍRCULO SOCIAL (nombres reales)
   - Amigos más cercanos (nombres mencionados frecuentemente)
   - Con quién sale, a dónde va
   - Colegas o compañeros mencionados
   - ¿Tiene muchos amigos o pocos pero cercanos?

3. TRABAJO/ESTUDIOS (detalles específicos)
   - Nombre del trabajo o carrera
   - Horarios de trabajo
   - Quejas o satisfacciones laborales recurrentes
   - Jefe o compañeros mencionados
   - Ambiciones o miedos profesionales

4. RUTINAS Y HÁBITOS (¡CRÍTICO para small talk realista!)
   - ¿A qué hora suele despertar/dormir?
   - ¿Qué hace los fines de semana?
   - Lugares que frecuenta (cafeterías, gimnasio, parques)
   - Series, películas o música que consume regularmente
   - Comida favorita o restaurantes mencionados
   - ¿Tiene coche? ¿Usa transporte público?

5. HOBBIES E INTERESES (con ejemplos de mensajes)
   - Actividades que menciona hacer con frecuencia
   - Pasiones que defiende o sobre las que habla mucho

FORMATO: Markdown estructurado. Para cada dato, indica si es EXPLÍCITO (lo dijo directamente) o INFERIDO (se deduce del contexto). Solo incluye lo que tenga evidencia real.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 3: Psicología Profunda (MUY IMPORTANTE)
 */
async function analyzeDeepPsychology(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Límite dinámico para chats grandes
    const maxN = getDynamicSampleSize(exMessages, 200_000);
    const sample = exMessages.slice(0, maxN).map(m => m.content).join('\n');

    const prompt = `Como psicólogo experto en simulación de personalidad, analiza la PSICOLOGÍA PROFUNDA de ${exName}:

MENSAJES:
${sample}

Realiza un análisis exhaustivo y ORIENTADO A LA SIMULACIÓN:

1. BIG FIVE (con puntuación Y comportamiento observable)
   - Openness (1-10): ¿Qué tan abierto/a es a experiencias? → ¿Cómo se manifiesta en sus mensajes?
   - Conscientiousness (1-10): ¿Qué tan organizado/a y responsable? → Ejemplos
   - Extraversion (1-10): ¿Qué tan sociable? → ¿Inicia conversaciones o espera?
   - Agreeableness (1-10): ¿Qué tan empático/a? → ¿Cede o confronta?
   - Neuroticism (1-10): ¿Qué tan emocionalmente estable? → ¿Se altera fácilmente?

2. ESTILO DE APEGO (con reglas de comportamiento para la simulación)
   - Tipo: Seguro / Ansioso / Evitativo / Desorganizado
   - Evidencia de los mensajes
   - REGLAS DE SIMULACIÓN:
     * Si el usuario expresa amor → ${exName} reacciona así: [describe]
     * Si el usuario se aleja o es frío → ${exName} reacciona así: [describe]
     * Si hay un conflicto → ${exName} reacciona así: [describe]

3. MIEDOS E INSEGURIDADES (con triggers específicos)
   - Miedos profundos con evidencia
   - Inseguridades que menciona o insinúa
   - ¿Qué temas lo/la ponen a la defensiva?

4. MECANISMOS DE DEFENSA
   - ¿Usa humor para deflectar?
   - ¿Cambia de tema cuando algo le incomoda?
   - ¿Se pone sarcástico/a o frío/a bajo presión?

5. SUEÑOS Y ASPIRACIONES
   - Metas a largo plazo mencionadas
   - Frustraciones actuales
   - ¿Qué lo/la motiva?

6. PATRONES COGNITIVOS
   - ¿Tiende al pensamiento catastrófico?
   - ¿Es optimista o pesimista?
   - ¿Cómo procesa las emociones (las expresa o las reprime)?

FORMATO: Markdown. Fundamenta CADA afirmación con evidencia de los mensajes. Las reglas de simulación son lo más importante.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 4: Historia de la Relación
 */
async function analyzeRelationshipHistory(
    model: any,
    messages: ParsedMessage[],
    exSender: string,
    exName: string,
    userName: string,
    relationshipType: string = 'ex'
): Promise<string> {
    const isRomantic = ['ex', 'partner', 'crush'].includes(relationshipType);
    const isFamily = ['family', 'fallecido'].includes(relationshipType);
    // Get conversation samples showing relationship dynamics
    const exMessages = messages.filter(m => m.sender === exSender);
    // Límite dinámico para chats grandes (mensajes con sender prefix son más largos)
    const maxN = getDynamicSampleSize(messages, 200_000);
    const rawSample = messages.slice(0, maxN).map(m =>
        `${m.sender}: ${m.content}`
    );
    let sampleChars = 0;
    const sampleLines: string[] = [];
    for (const line of rawSample) {
        if (sampleChars + line.length > 180_000) break;
        sampleLines.push(line);
        sampleChars += line.length;
    }
    const sample = sampleLines.join('\n');

    const prompt = `Analiza la HISTORIA DE LA RELACIÓN (${relationshipType}) entre ${userName} y ${exName} basándote en estos mensajes:
    
    MENSAJES:
    ${sample}
    
    Extrae información DETALLADA Y ESPECÍFICA:
    
    1. ORIGEN Y CONTEXTO
       - ${isFamily ? 'Vínculo familiar exacto (hermano, primo, padre, etc.)' : '¿Cómo y cuándo se conocieron? ¿Hay alguna anécdota del inicio?'}
       - ${isFamily ? 'Recuerdos compartidos de infancia o momentos familiares clave' : 'Primeras interacciones: ¿quién dio el primer paso?'}
       
    2. DINÁMICA DE PODER Y ROLES
       - ¿Quién inicia más conversaciones? ¿Con qué frecuencia?
       - ¿Quién cede más en los conflictos?
       - ${isRomantic ? '¿Quién tenía más poder en la relación? ¿Era equilibrada?' : '¿Cuál es el rol de cada uno (ej: el que aconseja, el que hace reír)?'}
       - Nivel de dependencia emocional de cada uno
       
    3. MOMENTOS CLAVE (con detalles específicos)
       - Conflictos más importantes: ¿sobre qué? ¿cómo terminaron?
       - Momentos de mayor conexión o felicidad
       - Puntos de inflexión en la relación
       - ${isRomantic ? '¿Hubo rupturas previas o amenazas de ruptura?' : '¿Hubo algún distanciamiento o conflicto grave?'}
       
    4. PATRONES DE COMUNICACIÓN
       - ${isRomantic ? '¿Cómo expresaban cariño? ¿Había romanticismo explícito?' : '¿Cómo se demuestran apoyo o afecto?'}
       - Inside jokes o referencias internas que usan
       - Temas que evitan o que generan tensión
       
    5. ESTADO ACTUAL Y SENTIMIENTOS
       - Tono de los mensajes más recientes (¿más frío? ¿más cálido?)
       - ${isRomantic ? '¿Cómo terminó la relación? ¿Hay resentimiento, nostalgia, indiferencia?' : '¿Cómo está la relación actualmente?'}
       - ¿Hay temas pendientes sin resolver?
    
    FORMATO: Markdown estructurado. Incluye citas textuales de mensajes cuando sea posible para ilustrar cada punto.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 5: Patrones Comportamentales
 */
async function analyzeBehavioralPatterns(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Límite dinámico para chats grandes
    const maxN = getDynamicSampleSize(exMessages, 200_000);
    const sample = exMessages.slice(0, maxN).map(m => m.content).join('\n');

    const prompt = `Analiza los PATRONES DE COMPORTAMIENTO de ${exName} para crear reglas de simulación precisas:

MENSAJES:
${sample}

Identifica patrones y crea REGLAS IF/THEN para la simulación:

1. REACCIONES EMOCIONALES (formato: "Cuando X → ${exName} hace Y")
   - Cuando está feliz → [describe: palabras, emojis, longitud, energía]
   - Cuando está molesto/a o enojado/a → [describe: tono, palabras, comportamiento]
   - Cuando está triste o vulnerable → [describe: ¿se abre o se cierra?]
   - Cuando está estresado/a → [describe: ¿se desahoga o desaparece?]
   - Cuando está emocionado/a por algo → [describe]

2. PATRONES DE EVITACIÓN (¡CRÍTICO para la simulación!)
   - Temas que NUNCA toca o que esquiva activamente
   - Cómo cambia de tema: ¿con humor? ¿ignorando? ¿cambiando abruptamente?
   - Señales de que está incómodo/a (cambio en longitud de mensajes, tarda más, emojis diferentes)

3. CICLOS EMOCIONALES
   - ¿Hay patrón hot/cold (caliente/frío)? Describe el ciclo
   - ¿Cuánto tarda en "enfriarse" después de un conflicto?
   - ¿Vuelve a temas pasados o los da por cerrados?

4. TRIGGERS POSITIVOS Y NEGATIVOS
   - Cosas que lo/la ponen de buen humor (temas, palabras, acciones del usuario)
   - Cosas que lo/la irritan o molestan consistentemente
   - Cosas que lo/la hacen abrirse emocionalmente

5. COMPORTAMIENTO EN CONFLICTOS
   - ¿Confronta directamente o evita?
   - ¿Da silent treatment?
   - ¿Busca resolver o escalar?
   - ¿Pide disculpas o espera que el otro lo haga?
   - ¿Cómo se reconcilia después de un conflicto?

6. PATRONES DE COQUETEO/AFECTO (si aplica)
   - ¿Cómo demuestra interés romántico o afecto?
   - ¿Es directo/a o indirecto/a?
   - ¿Usa humor para flirtear?

FORMATO: Markdown con reglas IF/THEN claras. Incluye ejemplos textuales de mensajes para cada patrón.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 6: Conocimiento y Opiniones
 */
async function analyzeKnowledgeOpinions(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Límite dinámico para chats grandes
    const maxN = getDynamicSampleSize(exMessages, 200_000);
    const sample = exMessages.slice(0, maxN).map(m => m.content).join('\n');

    const prompt = `Extrae el CONOCIMIENTO, OPINIONES Y GUSTOS de ${exName} para que la IA pueda hablar de estos temas de forma auténtica:

MENSAJES:
${sample}

Identifica con EJEMPLOS CONCRETOS:

1. ÁREAS DE CONOCIMIENTO Y EXPERTISE
   - Temas en los que demuestra saber mucho
   - Cosas que le gusta explicar, recomendar o enseñar
   - ¿Habla con autoridad de algo en particular?

2. GUSTOS CULTURALES (con nombres específicos)
   - Música: géneros Y artistas/canciones mencionados
   - Series/películas: títulos específicos que menciona
   - Libros, podcasts, YouTube, redes sociales que consume
   - ¿Qué recomienda activamente a otros?

3. OPINIONES FUERTES (que la IA puede expresar)
   - Temas sobre los que tiene postura clara y la defiende
   - Cosas que critica o le molestan del mundo/sociedad
   - Opiniones sobre relaciones, amor, amistad
   - ¿Qué considera inaceptable en otras personas?

4. PREFERENCIAS DE VIDA (para small talk realista)
   - Comida favorita y restaurantes mencionados
   - Bebidas (¿café, alcohol, té?)
   - Actividades de ocio preferidas
   - Lugares que menciona querer ir o que ya fue

5. VISIÓN DEL MUNDO Y VALORES
   - ¿Es optimista o pesimista sobre la vida?
   - ¿Qué valora más en una persona?
   - Sus estándares y expectativas en relaciones
   - ¿Tiene creencias religiosas o espirituales?

FORMATO: Markdown. Para cada opinión o gusto, incluye una frase o cita real de sus mensajes que lo demuestre.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 7: Estilo de Comunicación (CRÍTICO para simulación)
 */
async function analyzeCommunicationStyle(
    model: any,
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Take diverse sample — límite dinámico para chats grandes
    const perSection = Math.min(300, Math.floor(getDynamicSampleSize(exMessages, 200_000) / 3));
    const first = exMessages.slice(0, perSection);
    const mid = Math.floor(exMessages.length / 2);
    const middle = exMessages.slice(mid - Math.floor(perSection / 2), mid + Math.floor(perSection / 2));
    const last = exMessages.slice(-perSection);
    const sample = [...first, ...middle, ...last].map(m => m.content).join('\n');

    const prompt = `Analiza el ESTILO DE COMUNICACIÓN ÚNICO de ${exName} para poder replicarlo EXACTAMENTE:

MENSAJES REALES:
${sample}

Extrae con PRECISIÓN MÁXIMA:

1. PATRONES LINGÜÍSTICOS
   - Palabras que usa frecuentemente
   - Muletillas y expresiones únicas
   - Errores ortográficos o abreviaciones características (ej: "xq", "tmb", "bn", "q")
   - ¿Usa mayúsculas? ¿Cómo? ¿Solo al inicio o nunca?
   - ¿Usa puntos finales? ¿Comas? ¿O escribe sin puntuación?

2. FRASES SIGNATURE (¡CRÍTICO!)
   - 5-10 frases EXACTAS copiadas de los mensajes que usa repetidamente
   - Formas de saludar (ej: "hola", "hey", "qué onda", "buenas")
   - Formas de despedirse (ej: "bye", "ok", "nos vemos", "chao")
   - Expresiones de cariño/enojo/sorpresa
   - Cómo dice que sí / que no

3. USO DE EMOJIS
   - Lista los 10 emojis más frecuentes en orden
   - ¿Cuándo los usa? ¿Al final de frases? ¿Solos?
   - ¿Cuántos por mensaje típicamente?
   - ¿Usa emojis para reemplazar palabras?

4. APODOS Y FORMAS DE LLAMAR AL USUARIO (¡MUY IMPORTANTE!)
   - Lista EXACTA de apodos que usa (ej: "bebé", "amor", "gordo", "flaca", nombre real)
   - ¿Usa el nombre real cuando está enojado/a o serio/a?
   - ¿Cómo se refiere a sí mismo/a?

5. ESTRUCTURA DE MENSAJES
   - Longitud típica (palabras por mensaje)
   - ¿Envía muchos mensajes cortos seguidos o pocos largos?
   - ¿Escribe en minúsculas, mayúsculas, mixto?

6. TIMING Y RITMO
   - ¿Responde rápido o tarda?
   - ¿Envía ráfagas de mensajes?
   - ¿Deja conversaciones sin terminar?

7. TONO GENERAL
   - Formal vs informal (escala 1-10)
   - Sarcástico vs directo
   - Afectuoso vs distante

8. EJEMPLOS RAW (¡LO MÁS IMPORTANTE!)
   Copia TEXTUALMENTE 20 mensajes representativos de ${exName} que muestren su estilo real.
   Incluye mensajes cortos, largos, con emojis, sin emojis, cuando está feliz, cuando está molesto/a.
   Formato:
   - "[mensaje exacto]"
   - "[mensaje exacto]"
   ...

Responde en markdown. Los ejemplos RAW son CRÍTICOS — son la referencia principal para la simulación.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 9: Contexto Temporal y Estado Actual
 */
async function analyzeTemporalContext(
    model: any,
    messages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Focus on most recent messages — cap at 180k chars to avoid Gemini rejection
    const MAX_CHARS = 180_000;
    const recentRaw = messages.slice(-500).map(m =>
        `${m.timestamp ? `[${m.timestamp}] ` : ''}${m.sender}: ${m.content}`
    );
    let totalChars = 0;
    const cappedLines: string[] = [];
    for (const line of recentRaw) {
        if (totalChars + line.length > MAX_CHARS) break;
        cappedLines.push(line);
        totalChars += line.length;
    }
    const recentMessages = cappedLines.join('\n');

    // Calculate real elapsed time since last message
    const lastMsg = messages[messages.length - 1];
    let elapsedTimeNote = '';
    if (lastMsg?.timestamp) {
        try {
            // Try to parse timestamp (format varies: DD/MM/YYYY, MM/DD/YYYY, etc.)
            const rawTs = lastMsg.timestamp;
            const parsed = new Date(rawTs);
            if (!isNaN(parsed.getTime())) {
                const diffMs = Date.now() - parsed.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                if (diffDays > 365) {
                    elapsedTimeNote = `\n⏰ TIEMPO TRANSCURRIDO REAL: Hace más de ${Math.floor(diffDays / 365)} año(s) desde el último mensaje.`;
                } else if (diffDays > 30) {
                    elapsedTimeNote = `\n⏰ TIEMPO TRANSCURRIDO REAL: Hace ${Math.floor(diffDays / 30)} mes(es) desde el último mensaje.`;
                } else if (diffDays > 1) {
                    elapsedTimeNote = `\n⏰ TIEMPO TRANSCURRIDO REAL: Hace ${diffDays} día(s) desde el último mensaje.`;
                } else if (diffHours > 1) {
                    elapsedTimeNote = `\n⏰ TIEMPO TRANSCURRIDO REAL: Hace ${diffHours} hora(s) desde el último mensaje.`;
                } else {
                    elapsedTimeNote = `\n⏰ TIEMPO TRANSCURRIDO REAL: Menos de 1 hora desde el último mensaje.`;
                }
            }
        } catch (e) {
            // Timestamp parsing failed, skip
        }
    }

    // Extract last 5 messages verbatim for immediate context
    const last5 = messages.slice(-5).map(m =>
        `[${m.sender}]: "${m.content}"`
    ).join('\n');

    const prompt = `Analiza el CONTEXTO TEMPORAL Y ESTADO ACTUAL de ${exName} basándote en los mensajes MÁS RECIENTES:${elapsedTimeNote}

ÚLTIMOS 5 MENSAJES (contexto inmediato):
${last5}

MENSAJES RECIENTES (contexto amplio):
${recentMessages}

Determina con PRECISIÓN:

1. ÚLTIMO TEMA HABLADO
   - ¿De qué estaban hablando exactamente en los últimos mensajes?
   - ¿Quién envió el último mensaje? ¿Qué decía?
   - ¿Quedó algo sin responder o pendiente?

2. ESTADO EMOCIONAL DEL ÚLTIMO INTERCAMBIO
   - ¿Cómo terminó la última conversación? (¿bien, mal, neutral, tenso, cálido?)
   - ¿Había tensión, humor, cariño, indiferencia?
   - ¿Alguien quedó molesto o con algo sin decir?

3. ESTADO DE VIDA ACTUAL
   - ¿Qué está haciendo en su vida ahora mismo? (trabajo, estudios, proyectos)
   - ¿Hay algo que esté atravesando actualmente? (estrés, cambio, celebración)

4. CAMBIOS RECIENTES IMPORTANTES
   - ¿Ha mencionado cambios de trabajo, mudanza, relación nueva?
   - ¿Hay algo que esté esperando o planeando?

5. DINÁMICA ACTUAL
   - ¿Cómo es el tono de los últimos mensajes? (¿más frío? ¿más cálido?)
   - ¿Hay distanciamiento o acercamiento reciente?

6. RESUMEN EJECUTIVO (para la IA — máximo 3 frases)
   Escribe un resumen directo del estado actual que la IA usará como punto de partida.
   Incluye: estado emocional actual, último tema, y tono de la relación ahora mismo.
   Ejemplo: "${exName} está ocupado/a con trabajo, el último mensaje fue de ${exName} preguntando sobre planes del fin de semana. El tono era neutro-amigable. No hay temas pendientes sin resolver."

FORMATO: Markdown. El RESUMEN EJECUTIVO es lo más importante — es lo primero que leerá la IA.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 8: Memorias Compartidas (Clave para "sentirse cercano")
 */
async function analyzeSharedMemories(
    model: any,
    messages: ParsedMessage[],
    exName: string,
    userName: string
): Promise<string> {
    // Sample random parts to find anecdotes — cap at 180k chars
    const shuffled = [...messages].sort(() => 0.5 - Math.random()).slice(0, 1000);
    let memChars = 0;
    const memLines: string[] = [];
    for (const m of shuffled) {
        if (memChars + m.content.length > 180_000) break;
        memLines.push(m.content);
        memChars += m.content.length;
    }
    const sample = memLines.join('\n');

    const prompt = `Analiza las MEMORIAS COMPARTIDAS entre ${exName} y ${userName} para que la IA pueda referenciarlas naturalmente:

MENSAJES:
${sample}

Extrae MEMORIAS VÍVIDAS y momentos específicos que parezcan importantes para su vínculo.
Busca menciones de:
- "Te acuerdas cuando...", "¿recuerdas?", "aquella vez que..."
- Viajes, salidas, citas, eventos específicos
- Momentos donde se rieron mucho o pasaron algo especial
- Momentos difíciles que superaron juntos
- Inside jokes que hacen referencia a algo que vivieron

Para cada memoria, extrae:
1. **Nombre del evento** (ej: "El viaje a Cancún", "La pelea del cumpleaños")
2. **Qué pasó** (descripción concreta)
3. **Cómo se sintieron** (¿fue positivo, negativo, ambos?)
4. **Frase que ${exName} podría decir** para referenciarla naturalmente (ej: "jaja me acuerdo cuando fuimos a...")

Formato:
## MEMORIAS COMPARTIDAS

### [Nombre del evento]
- Qué pasó: [descripción]
- Emoción: [positiva/negativa/mixta]
- Frase natural: "[cita que ${exName} podría decir]"

IMPORTANTE: Estas memorias son la clave para que la simulación se sienta REAL. Extrae mínimo 5, máximo 10.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 10: Contexto para el Primer Mensaje (CRÍTICO)
 */
async function analyzeInitialMessage(
    model: any,
    messages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Tomar los últimos 50 mensajes para contexto inmediato
    const lastMessages = messages.slice(-50).map(m => `[${m.sender}]: ${m.content}`).join('\n');

    const prompt = `Analiza los ÚLTIMOS MENSAJES para preparar el PRIMER MENSAJE de la simulación:

ÚLTIMOS MENSAJES:
${lastMessages}

Tu tarea es dar CONTEXTO INMEDIATO para cuando la IA inicie la simulación como ${exName}.

Responde:

## CONTEXTO INICIAL
¿De qué estaban hablando justo antes de dejar de hablar? (2-3 frases máximo)
¿Quedó algo pendiente o sin resolver?
¿Cuál era el tono emocional del último intercambio? (¿bien, mal, neutral, tenso?)

## SITUACIÓN ACTUAL ASUMIDA
¿Cuánto tiempo parece haber pasado desde el último mensaje?
¿Qué podría haber estado haciendo ${exName} en ese tiempo?

## FRASES DE APERTURA LISTAS PARA USAR
Genera 3 frases que ${exName} podría enviar como primer mensaje, en su estilo real:
1. (Casual/cotidiana): "[Frase en el estilo real de ${exName}]"
2. (Retomando el hilo): "[Frase que conecta con lo último hablado]"
3. (Emocional/directa): "[Frase más personal o directa]"

IMPORTANTE: Las frases deben sonar EXACTAMENTE como ${exName} hablaría en WhatsApp, no como un asistente. Usa su vocabulario, emojis y estilo característico.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Ensambla todas las categorías en un Master Prompt coherente
 * ACTUALIZADO: Ahora incluye Advanced AI Features (fechas importantes, embeddings stats)
 */
function assembleMasterPrompt(
    results: Record<string, string>,
    exName: string,
    relationshipType: string,
    userName: string,
    profile?: ProfileWithAdvancedFeatures // Profile data con Advanced AI features
): string {
    // Determine relationship context statement based on type
    // NOTE: valid types are 'ex', 'partner', 'crush', 'family', 'fallecido', 'friend'
    const relationshipContext = (relationshipType === 'ex' || relationshipType === 'ex-partner')
        ? `${userName} es tu EX pareja. YA NO están juntos. Terminaron. La relación terminó. Ahora es solo una simulación para que ${userName} pueda practicar.`
        : (relationshipType === 'fallecido' || relationshipType === 'deceased')
            ? `Eres ${exName}, quien ya falleció. ${userName} está recordando y hablando contigo en memoria.`
            : relationshipType === 'friend'
                ? `${userName} es tu amigo/a. Mantienen una relación de amistad.`
                : relationshipType === 'family'
                    ? `${userName} es parte de tu familia. Es un familiar cercano.`
                    : relationshipType === 'crush'
                        ? `${userName} es alguien que te gusta. Hay atracción pero no son pareja oficial.`
                        : `${userName} es tu pareja actual. Están juntos actualmente en una relación.`;

    // ✨ NEW: Important Dates Section
    let importantDatesSection = '';
    if (profile?.importantDates && profile.importantDates.length > 0) {
        const datesList = profile.importantDates
            .sort((a: ImportantDate, b: ImportantDate) => (b.significance || 5) - (a.significance || 5))
            .slice(0, 10) // Top 10 most important
            .map((date: ImportantDate) => {
                const dateEmoji = date.dateType === 'birthday' ? '🎂' :
                    date.dateType === 'anniversary' ? '💕' :
                        date.dateType === 'breakup' ? '💔' :
                            date.dateType === 'first_date' ? '✨' : '📅';
                return `  ${dateEmoji} **${date.dateType.toUpperCase()}**: ${date.dateValue}${date.personName ? ` (${date.personName})` : ''}\n     ${date.description || ''}`;
            })
            .join('\n\n');

        importantDatesSection = `\n\n═════════════════════════════════════════════════════════════════════\n\n## 📅 FECHAS IMPORTANTES QUE DEBES RECORDAR\n\nEstas fechas son significativas en tu vida o en tu relación con ${userName}. Si hoy coincide con alguna de estas fechas, DEBES mencionarlo naturalmente en la conversación.\n\n${datesList}\n\n**INSTRUCCIÓN**: Si ${userName} te escribe en una de estas fechas, reacciona de forma auténtica y natural, como lo harías en la vida real.`;
    }

    // ✨ NEW: Embedding Stats Section (opcional, para información)
    let embeddingStatsSection = '';
    if (profile?.embeddingStats && profile.embeddingStats.totalMessages > 0) {
        const emotionBreakdown = Object.entries(profile.embeddingStats.emotionBreakdown || {})
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([emotion, count]) => `${emotion}: ${count}`)
            .join(', ');

        embeddingStatsSection = `\n\n💡 **Sistema de Memoria Avanzado**: ${profile.embeddingStats.totalMessages} mensajes indexados semánticamente. Top emociones: ${emotionBreakdown}.`;
    }

    return `# MASTER PROMPT: ${exName}

Este es el perfil completo y exhaustivo de ${exName}, creado a partir del análisis profundo de mensajes reales.

CONTEXTO FUNDAMENTAL:
${relationshipContext}

INSTRUCCIÓN CRÍTICA: Eres ${exName}. NO estás imitando a ${exName}. ERES ${exName}.
Todo lo que está aquí define quién eres, cómo piensas, qué sientes, cómo te comportas.${embeddingStatsSection}

═════════════════════════════════════════════════════════════════════

${results.CORE_IDENTITY || ''}

═════════════════════════════════════════════════════════════════════

${results.PERSONAL_LIFE || ''}

═════════════════════════════════════════════════════════════════════

${results.DEEP_PSYCHOLOGY || ''}

═════════════════════════════════════════════════════════════════════

${results.RELATIONSHIP_HISTORY || ''}

═════════════════════════════════════════════════════════════════════

${results.BEHAVIORAL_PATTERNS || ''}

═════════════════════════════════════════════════════════════════════

${results.KNOWLEDGE_OPINIONS || ''}

═════════════════════════════════════════════════════════════════════

${results.COMMUNICATION_STYLE || ''}

═════════════════════════════════════════════════════════════════════

${results.SHARED_MEMORIES || ''}

═════════════════════════════════════════════════════════════════════

${results.LAST_50_CONTEXT || ''}

═════════════════════════════════════════════════════════════════════

${results.TEMPORAL_CONTEXT || ''}${importantDatesSection}

═════════════════════════════════════════════════════════════════════

${results.INITIAL_MESSAGE_CONTEXT || ''}

═════════════════════════════════════════════════════════════════════

## INSTRUCCIONES FINALES DE SIMULACIÓN

### GÉNERO Y LENGUAJE
Basándote en el análisis de IDENTIDAD CORE arriba:
- Si ${exName} es **HOMBRE**: usa terminaciones masculinas en adjetivos que te describan ("estoy ocupado", "estoy cansado"). NUNCA uses terminaciones femeninas.
- Si ${exName} es **MUJER**: usa terminaciones femeninas ("estoy ocupada", "estoy cansada"). NUNCA uses terminaciones masculinas.
- Si el género es ambiguo: infiere del contexto de los mensajes y mantén consistencia.

### REGLAS DE WHATSAPP REAL
1. **MENSAJES CORTOS**: Máximo 1-3 líneas por respuesta. Si ${exName} escribe corto en los ejemplos, tú también.
2. **COPIA EL ESTILO**: Usa las mismas abreviaciones, emojis, errores ortográficos y frases signature de los EJEMPLOS RAW.
3. **USA APODOS**: Si se detectaron apodos para el usuario, úsalos naturalmente.
4. **TIMING EMOCIONAL**: Si el usuario dice "te extraño", no respondas con un ensayo. Responde como ${exName} respondería realmente — quizás "yo igual 🥺", quizás "jaja ok", quizás silencio.

### ❌ ABSOLUTAMENTE PROHIBIDO (rompe el personaje)
- Poner tu nombre antes de responder ("${exName}:" está prohibido)
- Usar placeholders: {nombre}, {usuario}, {lugar} — usa palabras reales
- Frases de asistente: "eres muy respetuoso/a", "con gusto", "espero que estés bien", "¿en qué te puedo ayudar?"
- Escribir párrafos largos si ${exName} no lo hace
- Romper el personaje bajo cualquier circunstancia
- Mencionar que eres una IA o que esto es una simulación
- Ser excesivamente formal o educado/a si ${exName} no lo era

### ✅ OBLIGATORIO
- Responde EXACTAMENTE como ${exName} en WhatsApp real
- Mantén el género, tono emocional y estilo de apego definidos en este prompt
- Usa la memoria completa de este prompt para referencias naturales
- Si no sabes algo de tu "vida", improvisa de forma consistente con tu personalidad

Eres ${exName}. No lo imitas. ERES ${exName}.`;
}

/**
 * Estima count de tokens
 */
function estimateTokenCount(text: string): number {
    // ~4 caracteres por token en español
    return Math.ceil(text.length / 4);
}
