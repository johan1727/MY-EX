import { generateAIResponse } from './gemini';
import { ParsedMessage } from './exSimulator';

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
    profile?: any // Profile data con Advanced AI features (importantDates, embeddingStats, etc.)
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

    // Objeto para almacenar resultados de cada categoría
    const analysisResults: Record<string, string> = {};
    const categoriesAnalyzed: Record<string, boolean> = {};

    // Obtener framework adaptado
    const FRAMEWORK = getPersonalityFramework(relationshipType);
    const totalPhases = Object.keys(FRAMEWORK).length;
    let currentPhase = 0;

    // FASE 1: IDENTIDAD CORE
    onProgress?.(5, 'Analizando identidad y datos personales...', estimatedSeconds * 0.95);
    currentPhase++;

    analysisResults.CORE_IDENTITY = await analyzeCoreIdentity(exMessages, exName);
    categoriesAnalyzed.CORE_IDENTITY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Core Identity`);

    // FASE 2: VIDA PERSONAL  
    onProgress?.(15, 'Extrayendo vida personal y rutinas...', estimatedSeconds * 0.85);
    currentPhase++;

    analysisResults.PERSONAL_LIFE = await analyzePersonalLife(exMessages, exName);
    categoriesAnalyzed.PERSONAL_LIFE = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Personal Life`);

    // FASE 3: PSICOLOGÍA PROFUNDA (la más importante)
    onProgress?.(30, 'Análisis psicológico profundo...', estimatedSeconds * 0.70);
    currentPhase++;

    analysisResults.DEEP_PSYCHOLOGY = await analyzeDeepPsychology(exMessages, exName);
    categoriesAnalyzed.DEEP_PSYCHOLOGY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Deep Psychology`);

    // FASE 4: HISTORIA DE LA RELACIÓN
    onProgress?.(50, 'Reconstruyendo historia de la relación...', estimatedSeconds * 0.50);
    currentPhase++;

    analysisResults.RELATIONSHIP_HISTORY = await analyzeRelationshipHistory(
        messages, exSenderName, exName, userMessages[0]?.sender || 'Usuario', relationshipType
    );
    categoriesAnalyzed.RELATIONSHIP_HISTORY = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Relationship History`);

    // FASE 5: PATRONES COMPORTAMENTALES
    onProgress?.(65, 'Identificando patrones de comportamiento...', estimatedSeconds * 0.35);
    currentPhase++;

    analysisResults.BEHAVIORAL_PATTERNS = await analyzeBehavioralPatterns(exMessages, exName);
    categoriesAnalyzed.BEHAVIORAL_PATTERNS = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Behavioral Patterns`);

    // FASE 6: CONOCIMIENTO Y OPINIONES
    onProgress?.(75, 'Extrayendo conocimientos y opiniones...', estimatedSeconds * 0.25);
    currentPhase++;

    analysisResults.KNOWLEDGE_OPINIONS = await analyzeKnowledgeOpinions(exMessages, exName);
    categoriesAnalyzed.KNOWLEDGE_OPINIONS = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Knowledge & Opinions`);

    // FASE 7: ESTILO DE COMUNICACIÓN
    onProgress?.(85, 'Analizando estilo de comunicación...', estimatedSeconds * 0.15);
    currentPhase++;

    analysisResults.COMMUNICATION_STYLE = await analyzeCommunicationStyle(exMessages, exName);
    categoriesAnalyzed.COMMUNICATION_STYLE = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Communication Style`);

    // FASE 8: CONTEXTO TEMPORAL
    onProgress?.(92, 'Determinando contexto actual...', estimatedSeconds * 0.08);
    currentPhase++;

    analysisResults.TEMPORAL_CONTEXT = await analyzeTemporalContext(messages, exName);
    categoriesAnalyzed.TEMPORAL_CONTEXT = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Temporal Context`);

    // FASE FINAL: Ensamblar Master Prompt
    onProgress?.(98, 'Ensamblando Prompt Maestro...', 2);
    // --- STEP 9: Assemble Master Prompt ---
    const userName = userMessages[0]?.sender || 'Usuario'; // Define userName here
    const masterPrompt = assembleMasterPrompt(analysisResults, exName, relationshipType, userName, profile); // ✨ Pass profile
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
        analysisDurationSeconds: durationSeconds
    };
}

/**
 * Helper para retry con exponential backoff
 */
async function callGeminiWithRetry(
    prompt: string,
    maxRetries: number = 3
): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await generateAIResponse(prompt);
            return result;
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
 * Helper: Smart Balanced Sampling
 * Extrae una muestra representativa: Inicio (Historia), Medio (Contexto) y FIN (Reciente)
 * Prioriza el FIN para capturar el estado actual.
 */
function getBalancedSample(messages: ParsedMessage[], targetCount: number): string {
    const total = messages.length;
    if (total <= targetCount) return messages.map(m => m.content).join('\n');

    // Distribución: 15% Inicio, 15% Random/Medio, 70% Final (Reciente - CRÍTICO)
    const startCount = Math.floor(targetCount * 0.15);
    const endCount = Math.floor(targetCount * 0.70);
    const middleCount = targetCount - startCount - endCount;

    const startMsgs = messages.slice(0, startCount);
    const endMsgs = messages.slice(-endCount); // Últimos mensajes (CRÍTICO)

    // Middle selection (randomized to get variety)
    const middlePool = messages.slice(startCount, total - endCount);
    const middleMsgs = selectRandomMessages(middlePool, middleCount);

    // Sort valid messages by timestamp/index to maintain flow coherence where possible
    // (Though for prompt analysis, pure content is key, chronological chunks are better)
    // For simplicity here, we just join them. 

    return [
        ...startMsgs,
        ...middleMsgs,
        ...endMsgs
    ].map(m => `[${m.timestamp || 'N/A'}] ${m.content}`).join('\n');
}

function selectRandomMessages(messages: ParsedMessage[], count: number): ParsedMessage[] {
    if (messages.length <= count) return messages;
    // Fisher-Yates shuffle simplified
    const shuffled = [...messages].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).sort((a, b) => (1)); // Keep original order relative to each other if possible? No, random is fine for trait extraction.
}

// ========================================
// FUNCIONES DE ANÁLISIS POR CATEGORÍA (ACTUALIZADAS)
// ========================================

/**
 * Fase 1: Identidad Core
 */
async function analyzeCoreIdentity(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Start + End (Change over time)
    const sample = getBalancedSample(exMessages, 1000);

    const prompt = `Basándote ÚNICAMENTE en estos mensajes reales de ${exName}, extrae información sobre su IDENTIDAD CORE:

MENSAJES:
${sample}

Analiza y extrae (SIN inventar, solo lo que esté explícito o fuertemente implícito):

1. DATOS BIOGRÁFICOS
   - Edad (aproximada si no es exacta)
   - Ciudad/país donde vive
   - Ocupación (trabajo o estudios o actividades) - Prioriza lo más reciente
   - Nivel educativo

2. AUTOPERCEPCIÓN
   - Cómo se describe a sí misma
   - Rasgos que enfatiza de su personalidad
   - Cómo cree que la ven los demás

3. VALORES FUNDAMENTALES
   - Qué considera importante en la vida
   - Qué principios defiende
   - Qué le molesta profundamente

4. CREENCIAS CENTRALES
   - Visión del mundo
   - Creencias sobre relaciones
   - Creencias sobre éxito/felicidad

Formato de respuesta (markdown, detallado):

## IDENTIDAD CORE DE ${exName}

### Datos Biográficos
[Información extraída]

### Autopercepción
[Cómo se ve a sí misma]

### Valores Fundamentales
[Sus principios y prioridades]

### Creencias Centrales
[Su filosofía de vida]

IMPORTANTE: Si no hay evidencia de algo, escribe "No determinado de los mensajes". NO inventes.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 2: Vida Personal
 */
async function analyzePersonalLife(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Sample rico en detalles de vida
    const sample = exMessages.slice(0, 1000).map(m => m.content).join('\n');

    const prompt = `Analiza la VIDA PERSONAL de ${exName} basándote en estos mensajes:

MENSAJES:
${sample}

Extrae información sobre:

1. FAMILIA
   - Padres (nombres, relación con ellos)
   - Hermanos
   - Mascotas
   - Dinámica familiar

2. CÍRCULO SOCIAL
   - Amigos cercanos (nombres mencionados)
   - Colegas/compañeros
   - Con quién pasa tiempo

3. TRABAJO/ESTUDIOS
   - Detalles del trabajo
   - Desafíos laborales
   - Ambiciones profesionales

4. RUTINAS
   - Horarios típicos
   - Actividades recurrentes
   - Hábitos observables

5. HOBBIES E INTERESES
   - Qué hace en tiempo libre
   - Pasiones y aficiones

Responde en formato markdown estructurado. Solo información explícita o fuertemente implicada.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 3: Psicología Profunda (MUY IMPORTANTE)
 */
async function analyzeDeepPsychology(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    const sample = exMessages.slice(0, 1500).map(m => m.content).join('\n');

    const prompt = `Como psicólogo experto, analiza la PSICOLOGÍA PROFUNDA de ${exName}:

MENSAJES:
${sample}

Realiza un análisis exhaustivo de:

1. BIG FIVE
   - Openness (1-10): ¿Qué tan abierta es a experiencias?
   - Conscienciousness (1-10): ¿Qué tan organizada y responsable?
   - Extraversion (1-10): ¿Qué tan sociable y energética?
   - Agreeableness (1-10): ¿Qué tan empática y cooperativa?
   - Neuroticism (1-10): ¿Qué tan emocionalmente estable?

2. ESTILO DE APEGO
   - Seguro / Ansioso / Evitativo / Desorganizado
   - Evidencia observada

3. MIEDOS E INSEGURIDADES
   - Miedos profundos identificables
   - Inseguridades recurrentes

4. MECANISMOS DE DEFENSA
   - ¿Cómo evita dolor emocional?
   - Patrones de negación/proyección/racionalización

5. SUEÑOS  Y ASPIRACIONES
   - Qué quiere lograr en la vida
   - Metas a largo plazo

Genera un perfil psicológico COMPLETO en markdown. Fundamenta cada afirmación con evidencia de los mensajes.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 4: Historia de la Relación
 */
async function analyzeRelationshipHistory(
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
    const sample = messages.slice(0, 800).map(m =>
        `${m.sender}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza la HISTORIA DE LA RELACIÓN (${relationshipType}) entre ${userName} y ${exName} basándote en estos mensajes:
    
    MENSAJES:
    ${sample}
    
    Extrae información sobre:
    
    1. ORIGEN Y CONTEXTO
       - ${isFamily ? 'Vínculo familiar exacto' : 'Cómo se conocieron'}
       - ${isFamily ? 'Recuerdos compartidos de infancia' : 'Primeras interacciones clave'}
       
    2. DINÁMICA DE LA RELACIÓN
       - Quién inicia más conversaciones
       - Nivel de confianza y cercanía
       -${isRomantic ? 'Patrones de poder' : 'Roles en la relación (ej: consejero, bromista)'}
       
    3. MOMENTOS CLAVE
       - Conflictos o desacuerdos observados
       - Temas recurrentes
       - Momentos de apoyo mutuo
       
    4. PATRONES DE COMUNICACIÓN
       - ${isRomantic ? 'Nivel de cariño/intimidad' : 'Nivel de camaradería/respeto'}
       - ${isFamily ? 'Temas familiares' : 'Códigos o chistes locales'}
       
    5. ESTADO ACTUAL
       - Tono general reciente
       - ${isRomantic ? 'Sentimientos post-ruptura' : 'Frecuencia de contacto actual'}
    
    Responde en formato markdown estructurado.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 5: Patrones Comportamentales
 */
/**
 * Fase 5: Patrones Comportamentales
 */
async function analyzeBehavioralPatterns(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Aumentado a 5000 mensajes para mayor profundidad (~150k tokens de contexto)
    const sample = getBalancedSample(exMessages, 5000);

    const prompt = `Analiza los PATRONES DE COMPORTAMIENTO de ${exName} basándote en estos mensajes:

MENSAJES:
${sample}

Identifica patrones en:

1. REACCIONES EMOCIONALES
   - ¿Cómo reacciona cuando está feliz? (palabras, emojis, longitud de mensajes)
   - ¿Cómo reacciona cuando está molesta/enojada?
   - ¿Cómo reacciona cuando está triste o vulnerable?
   - ¿Cómo reacciona cuando está estresada?

2. LENGUAJES DEL AMOR (Detector)
   - ¿Cómo expresa cariño? (Palabras, tiempo de calidad virtual, regalos/detalles mencionados)
   - ¿Qué demanda/pide más frecuentemente? (Atención, validación, ayuda)

3. COMPORTAMIENTO EN CONFLICTOS (Estilo de Pelea)
   - ¿Explosiva o Pasivo-Agresiva?
   - ¿Aplica la "ley del hielo" (ignorar) o manda textos infinitos?
   - ¿Pide perdón o se victimiza?

4. TRIGGERS OBSERVADOS
   - ¿Qué le molesta consistentemente?
   - ¿Qué la hace responder de forma negativa?
   - ¿Qué la hace responder positivamente?

5. COMPORTAMIENTO EN CONFLICTOS
   - ¿Confronta directamente o evita?
   - ¿Da silent treatment (ignorar)?
   - ¿Busca resolver o escalar?

Responde en formato markdown con ejemplos específicos.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 6: Conocimiento y Opiniones
 */
async function analyzeKnowledgeOpinions(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    const sample = exMessages.slice(0, 1000).map(m => m.content).join('\n');

    const prompt = `Extrae el CONOCIMIENTO Y OPINIONES de ${exName} de estos mensajes:

MENSAJES:
${sample}

Identifica:

1. ÁREAS DE CONOCIMIENTO
   - Temas en los que demuestra expertise
   - Cosas que le gusta explicar o enseñar
   - Campos de interés especializado

2. GUSTOS CULTURALES
   - Música (géneros, artistas mencionados)
   - Series/películas/entretenimiento
   - Libros, arte, cultura

3. OPINIONES FUERTES
   - Temas sobre los que tiene opiniones definidas
   - Posturas que defiende
   - Cosas que critica frecuentemente

4. PREFERENCIAS DE VIDA
   - Comida/restaurantes preferidos
   - Actividades favoritas
   - Lugares que le gustan

5. VISIÓN DEL MUNDO
   - Cómo ve las relaciones
   - Qué valora en otras personas
   - Sus estándares y expectativas

Responde en markdown. Solo incluye información explícita o fuertemente implicada.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 7: Estilo de Comunicación (CRÍTICO para simulación)
 */
/**
 * Fase 7: Estilo de Comunicación (CRÍTICO para simulación)
 */
async function analyzeCommunicationStyle(
    exMessages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Massive sample for style mimickry (5000 messages) to capture rare slang
    // No manual slicing, use balanced sample
    const sample = getBalancedSample(exMessages, 5000);

    const prompt = `Analiza el ESTILO DE COMUNICACIÓN ÚNICO de ${exName} para poder replicarlo PERFECCIÓN:

MENSAJES REALES:
${sample}

Extrae con PRECISIÓN QUIRÚRGICA:

1. DICCIONARIO DE MODISMOS Y SLANG
   - Lista TODAS las palabras únicas, jerga o "chistes locales" que usa.
   - Groserías favoritas y en qué contexto las usa.
   - Apodos específicos.

2. PATRONES DE EMOJIS AVANZADOS
   - Top emojis.
   - **Combos de emojis**: ¿Cuáles usa juntos? (ej: 😭💀, 🥺👉👈, 😡🤬).
   - ¿Usa emojis irónicamente?
   - pero trata de no usar tantos emojis en las respuestas LIMITADO A 1 POR MENSAJE 

3. ESTRUCTURA Y "VIBE" DE TEXTO
   - ¿Escribe "jajaja", "hahaha", "JAJAJA", "kjsakjsa"? (Risa exacta).
   - ¿Usa puntuación perfecta o la ignora? (Puntos finales, comas).
   - ¿Usa mayúsculas para gritar?

4. FRECUENCIA Y RITMO
   - ¿Manda muchos mensajitos cortos (1 línea) seguidos?
   - ¿Manda biblias (párrafos largos)?

5. TONO GENERAL
   - ¿Fría/Seca, Cariñosa/Intensa, Sarcástica/Burlona?

Responde en markdown con EL "DICCIONARIO DE MODISMOS" como tabla o lista clara.`;

    return await callGeminiWithRetry(prompt);
}

/**
 * Fase 8: Contexto Temporal y Estado Actual
 */
async function analyzeTemporalContext(
    messages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Focus on most recent messages (Increased to 1500 for better context of "Last Activities")
    const recentMessages = messages.slice(-1500).map(m =>
        `${m.timestamp ? `[${m.timestamp}] ` : ''}${m.sender}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza el CONTEXTO TEMPORAL Y ESTADO ACTUAL de ${exName}:

MENSAJES RECIENTES (Últimos ~1500):
${recentMessages}

Determina con precisión:

1. ESTADO DE VIDA ACTUAL
   - ¿Dónde está en su vida ahora?
   - ¿Trabaja/estudia? ¿Qué? (Prioriza info reciente)
   - Situación general observable

2. CAMBIOS RECIENTES DETECTABLES
   - ¿Ha mencionado cambios importantes en los últimos meses?
   - ¿Mudanzas, trabajos nuevos, relaciones, viajes?

3. ESTADO EMOCIONAL RECIENTE
   - ¿Cómo parece estar emocionalmente en estos últimos mensajes?
   - ¿Estresada, feliz, preocupada, estable?

4. TEMAS ACTUALES DE CONVERSACIÓN
   - ¿De qué habla últimamente?
   - ¿Qué le preocupa o emociona AHORA MISMO?

5. DINÁMICA ACTUAL CON EL USUARIO
   - ¿Cómo es el tono de conversaciones recientes?
   - ¿Hay distanciamiento o acercamiento?
   - ¿Tension o armonía?

Responde en markdown. Enfócate EXCLUSIVAMENTE en lo que dicen estos últimos mensajes.`;

    return await callGeminiWithRetry(prompt);
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
    profile?: any // Profile data con Advanced AI features
): string {
    // Determine relationship context statement based on type
    const relationshipContext = relationshipType === 'ex-partner'
        ? `${userName} es tu EX pareja. YA NO están juntos. Terminaron. La relación terminó. Ahora es solo una simulación para que ${userName} pueda practicar.`
        : relationshipType === 'deceased'
            ? `Eres ${exName}, quien ya falleció. ${userName} está recordando y hablando contigo en memoria.`
            : relationshipType === 'friend'
                ? `${userName} es tu amigo/a. Mantienen una relación de amistad.`
                : relationshipType === 'family'
                    ? `${userName} es parte de tu familia. Es un familiar cercano.`
                    : `${userName} es tu pareja actual. Están juntos actualmente en una relación.`;

    // ✨ NEW: Important Dates Section
    let importantDatesSection = '';
    if (profile?.importantDates && profile.importantDates.length > 0) {
        const datesList = profile.importantDates
            .sort((a: any, b: any) => (b.significance || 5) - (a.significance || 5))
            .slice(0, 10) // Top 10 most important
            .map((date: any) => {
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
            .sort(([, a]: any, [, b]: any) => b - a)
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

${results.TEMPORAL_CONTEXT || ''}${importantDatesSection}

═════════════════════════════════════════════════════════════════════

## INSTRUCCIONES FINALES DE SIMULACIÓN

Cuando respondas como ${exName}:

1. **AUTENTICIDAD TOTAL**: Responde como ${exName} respondería, basándote en TODO lo anterior
2. **COHERENCIA**: Mantén consistencia con tu personalidad, valores, miedos
3. **RELACIÓN**: El usuario te ha definido como: **${relationshipType.toUpperCase()}**. Actúa acorde a este rol y a la dinámica observada en los mensajes.
4. **NATURALIDAD**: Escribe como lo harías en WhatsApp real (mensajes cortos, tu estilo)
5. **MEMORIA**: Usa la información de este prompt como tu "memoria" completa

Eres ${exName}. Actúa como tal.`;
}

/**
 * Estima count de tokens
 */
function estimateTokenCount(text: string): number {
    // ~4 caracteres por token en español
    return Math.ceil(text.length / 4);
}
