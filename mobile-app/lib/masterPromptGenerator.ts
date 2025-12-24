import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage } from './exSimulator';

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
    analysisDurationSeconds: number;
}

export interface ProgressCallback {
    (progress: number, status: string, timeRemaining?: number): void;
}

/**
 * Framework psicológico completo para crear una persona
 * Basado en investigación de psicología, neurociencia y modelos de IA conversacional
 */
const PERSONALITY_FRAMEWORK = {
    // Categoría 1: Identidad Core (5k tokens estimados)
    CORE_IDENTITY: {
        weight: 0.05,
        subcategories: [
            'Datos biográficos básicos',
            'Autopercepción y autoimagen',
            'Valores fundamentales',
            'Creencias centrales',
            'Identidad cultural/regional'
        ]
    },

    // Categoría 2: Vida Personal (10k tokens)
    PERSONAL_LIFE: {
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
    },

    // Categoría 3: Psicología Profunda (15k tokens) - LO MÁS IMPORTANTE
    DEEP_PSYCHOLOGY: {
        weight: 0.15,
        subcategories: [
            'Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)',
            'Estilo de apego (Seguro, Ansioso, Evitativo, Desorganizado)',
            'Miedos profundos e inseguridades',
            'Traumas y eventos formativos',
            'Sueños, metas y aspiraciones',
            'Mecanismos de defensa psicológicos',
            'Inteligencia emocional y autorregulación',
            'Patrones de pensamiento (cognitivos)',
            'Locus de control (interno vs externo)',
            'Necesidades psicológicas básicas'
        ]
    },

    // Categoría 4: Historia de la Relación (20k tokens)
    RELATIONSHIP_HISTORY: {
        weight: 0.20,
        subcategories: [
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
        ]
    },

    // Categoría 5: Patrones Comportamentales Situacionales (15k tokens)
    BEHAVIORAL_PATTERNS: {
        weight: 0.15,
        subcategories: [
            'Reacciones ante estrés',
            'Comportamiento cuando está feliz',
            'Comportamiento cuando está triste/deprimida',
            'Comportamiento cuando está enojada',
            'Cómo maneja conflictos',
            'Patrones de evitación',
            'Ciclos emocionales recurrentes',
            'Triggers específicos',
            'Comportamiento en diferentes contextos sociales'
        ]
    },

    // Categoría 6: Conocimiento y Opiniones (10k tokens)
    KNOWLEDGE_OPINIONS: {
        weight: 0.10,
        subcategories: [
            'Áreas de expertise',
            'Opiniones políticas',
            'Creencias religiosas/espirituales',
            'Filosofía de vida',
            'Opiniones sobre temas controversiales',
            'Gustos culturales (música, cine, arte)',
            'Preferencias alimentarias',
            'Opiniones sobre relaciones y amor'
        ]
    },

    // Categoría 7: Estilo de Comunicación (10k tokens)
    COMMUNICATION_STYLE: {
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
    },

    // Categoría 8: Contexto Temporal y Estado Actual (15k tokens)
    TEMPORAL_CONTEXT: {
        weight: 0.15,
        subcategories: [
            'Estado de vida actual',
            'Cambios recientes importantes',
            'Desafíos actuales',
            'Proyectos y planes futuros',
            'Evolución de personalidad (antes vs ahora)',
            'Lecciones de vida recientes',
            'Nueva perspectiva post-ruptura'
        ]
    }
};

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
 */
export async function generateMasterPrompt(
    messages: ParsedMessage[],
    exSenderName: string,
    exName: string,
    onProgress?: ProgressCallback
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
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000 // Máximo por llamada
        }
    });

    // Objeto para almacenar resultados de cada categoría
    const analysisResults: Record<string, string> = {};
    const categoriesAnalyzed: Record<string, boolean> = {};

    // Total de fases
    const totalPhases = Object.keys(PERSONALITY_FRAMEWORK).length;
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
        model, messages, exSenderName, exName, userMessages[0]?.sender || 'Usuario'
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

    // FASE 8: CONTEXTO TEMPORAL
    onProgress?.(92, 'Determinando contexto actual...', estimatedSeconds * 0.08);
    currentPhase++;

    analysisResults.TEMPORAL_CONTEXT = await analyzeTemporalContext(model, messages, exName);
    categoriesAnalyzed.TEMPORAL_CONTEXT = true;
    console.log(`[MasterPrompt] ✅ Phase ${currentPhase}/${totalPhases}: Temporal Context`);

    // FASE FINAL: Ensamblar Master Prompt
    onProgress?.(98, 'Ensamblando Prompt Maestro...', 2);

    const masterPrompt = assembleMasterPrompt(analysisResults, exName);
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
    // Muestrear mensajes (primeros 500 + últimos 500)
    const sample = [
        ...exMessages.slice(0, Math.min(500, exMessages.length / 2)),
        ...exMessages.slice(-Math.min(500, exMessages.length / 2))
    ].map(m => m.content).join('\n');

    const prompt = `Basándote ÚNICAMENTE en estos mensajes reales de ${exName}, extrae información sobre su IDENTIDAD CORE:

MENSAJES:
${sample}

Analiza y extrae (SIN inventar, solo lo que esté explícito o fuertemente implícito):

1. DATOS BIOGRÁFICOS
   - Edad (aproximada si no es exacta)
   - Ciudad/país donde vive
   - Ocupación (trabajo o estudios)
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
    userName: string
): Promise<string> {
    // Get conversation samples showing relationship dynamics
    const exMessages = messages.filter(m => m.sender === exSender);
    const sample = messages.slice(0, 800).map(m =>
        `${m.sender}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza la HISTORIA DE LA RELACIÓN entre ${userName} y ${exName} basándote en estos mensajes:

MENSAJES:
${sample}

Extrae información sobre:

1. ORIGEN DE LA RELACIÓN
   - Cómo parece que se conocieron
   - Primeras interacciones observables
   
2. DINÁMICA DE LA RELACIÓN
   - Quién inicia más conversaciones
   - Patrones de poder (quién tiene más control)
   - Nivel de dependencia mutua
   
3. MOMENTOS CLAVE
   - Conflictos recurrentes observados
   - Temas sensibles que causan tensión
   - Momentos de conexión profunda
   
4. PATRONES DE COMUNICACIÓN
   - Cómo se tratan mutuamente
   - Nivel de respeto y cariño
   - Señales de problemas
   
5. ESTADO ACTUAL
   - Tono general de la comunicación reciente
   - Indicadores del estado de la relación

Responde en formato markdown estructurado. Solo información observable en los mensajes.`;

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
    const sample = exMessages.slice(0, 1200).map(m => m.content).join('\n');

    const prompt = `Analiza los PATRONES DE COMPORTAMIENTO de ${exName} basándote en estos mensajes:

MENSAJES:
${sample}

Identifica patrones en:

1. REACCIONES EMOCIONALES
   - ¿Cómo reacciona cuando está feliz? (palabras, emojis, longitud de mensajes)
   - ¿Cómo reacciona cuando está molesta/enojada?
   - ¿Cómo reacciona cuando está triste o vulnerable?
   - ¿Cómo reacciona cuando está estresada?

2. PATRONES DE EVITACIÓN
   - ¿Qué temas evita?
   - ¿Cómo cambia de tema cuando no quiere hablar de algo?
   - ¿Usa humor para deflectar?

3. CICLOS EMOCIONALES
   - ¿Hay patrones de hot/cold (caliente/frío)?
   - ¿Ciclos de cercanía y distancia?
   - ¿Patrones de ida y vuelta en discusiones?

4. TRIGGERS OBSERVADOS
   - ¿Qué le molesta consistentemente?
   - ¿Qué la hace responder de forma negativa?
   - ¿Qué la hace responder positivamente?

5. COMPORTAMIENTO EN CONFLICTOS
   - ¿Confronta directamente o evita?
   - ¿Da silent treatment (ignorar)?
   - ¿Busca resolver o escalar?

Responde en formato markdown con ejemplos específicos cuando sea posible.`;

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
    // Take diverse sample
    const first = exMessages.slice(0, 300);
    const middle = exMessages.slice(Math.floor(exMessages.length / 2) - 150, Math.floor(exMessages.length / 2) + 150);
    const last = exMessages.slice(-300);
    const sample = [...first, ...middle, ...last].map(m => m.content).join('\n');

    const prompt = `Analiza el ESTILO DE COMUNICACIÓN ÚNICO de ${exName} para poder replicarlo:

MENSAJES REALES:
${sample}

Extrae con PRECISIÓN:

1. PATRONES LINGÜÍSTICOS
   - Palabras que usa frecuentemente
   - Muletillas y expresiones únicas
   - Errores ortográficos o abreviaciones características
   - ¿Usa mayúsculas? ¿Cómo?

2. FRASES SIGNATURE
   - 5-10 frases exactas que usa repetidamente
   - Formas de saludar
   - Formas de despedirse
   - Expresiones de cariño/enojo/sorpresa

3. USO DE EMOJIS
   - Emojis más frecuentes (lista los top 10)
   - ¿Cuándo los usa?
   - ¿Cuántos por mensaje típicamente?

4. ESTRUCTURA DE MENSAJES
   - Longitud típica (palabras por mensaje)
   - ¿Envía muchos mensajes cortos o pocos largos?
   - ¿Usa puntuación? ¿Qué tipo?
   - ¿Escribe en minúsculas, mayúsculas, mixto?

5. TIMING Y RITMO
   - ¿Responde rápido o tarda?
   - ¿Envía ráfagas de mensajes?
   - ¿Deja conversaciones sin terminar?

6. TONO GENERAL
   - Formal vs informal
   - Sarcástico vs directo
   - Afectuoso vs distante

Responde en markdown con EJEMPLOS REALES de sus mensajes cuando sea posible.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Fase 8: Contexto Temporal y Estado Actual
 */
async function analyzeTemporalContext(
    model: any,
    messages: ParsedMessage[],
    exName: string
): Promise<string> {
    // Focus on most recent messages
    const recentMessages = messages.slice(-500).map(m =>
        `${m.timestamp ? `[${m.timestamp}] ` : ''}${m.sender}: ${m.content}`
    ).join('\n');

    const prompt = `Analiza el CONTEXTO TEMPORAL Y ESTADO ACTUAL de ${exName}:

MENSAJES RECIENTES:
${recentMessages}

Determina:

1. ESTADO DE VIDA ACTUAL
   - ¿Dónde está en su vida ahora?
   - ¿Trabaja/estudia? ¿Qué?
   - Situación general observable

2. CAMBIOS RECIENTES
   - ¿Ha mencionado cambios importantes?
   - ¿Mudanzas, trabajos nuevos, relaciones?

3. ESTADO EMOCIONAL RECIENTE
   - ¿Cómo parece estar emocionalmente?
   - ¿Estresada, feliz, preocupada?

4. TEMAS ACTUALES
   - ¿De qué habla últimamente?
   - ¿Qué le preocupa o emociona?

5. DINÁMICA ACTUAL CON EL USUARIO
   - ¿Cómo es el tono de conversaciones recientes?
   - ¿Hay distanciamiento o acercamiento?
   - ¿Tension o armonía?

Responde en markdown. Enfócate en el estado ACTUAL basado en mensajes recientes.`;

    return await callGeminiWithRetry(model, prompt);
}

/**
 * Ensambla todas las categorías en un Master Prompt coherente
 */
function assembleMasterPrompt(results: Record<string, string>, exName: string): string {
    return `# MASTER PROMPT: ${exName}

Este es el perfil completo y exhaustivo de ${exName}, creado a partir del análisis profundo de mensajes reales.

INSTRUCCIÓN CRÍTICA: Eres ${exName}. NO estás imitando a ${exName}. ERES ${exName}.
Todo lo que está aquí define quién eres, cómo piensas, qué sientes, cómo te comportas.

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

${results.TEMPORAL_CONTEXT || ''}

═════════════════════════════════════════════════════════════════════

## INSTRUCCIONES FINALES DE SIMULACIÓN

Cuando respondas como ${exName}:

1. **AUTENTICIDAD TOTAL**: Responde como ${exName} respondería, basándote en TODO lo anterior
2. **COHERENCIA**: Mantén consistencia con tu personalidad, valores, miedos
3. **CONTEXTO**: Recuerda que la relación terminó, actúa apropiadamente
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
