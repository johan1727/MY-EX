import { supabase } from './supabase';
import { createEmbedding, SemanticMatch } from './vectorRAG'; // Ahora usa Gemini
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMessage } from './exSimulator';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'nostalgic' | 'loving' | 'neutral';

export interface EmotionalMemory {
    id?: string;
    profileId: string;
    userId: string;
    memoryType: 'happy' | 'conflict' | 'milestone' | 'painful';
    title: string;
    summary: string;
    messageIds: string[];
    emotionalScore: number; // -1 (muy negativo) a 1 (muy positivo)
    dateRange: {
        start: string;
        end: string;
    };
    createdAt?: string;
}

export interface EmotionalContext {
    currentEmotion: EmotionType;
    intensity: number; // 0-1
    matches: SemanticMatch[];
}

/**
 * EMOTIONAL RAG: Recupera mensajes similares basados en EMOCIÓN, no solo contenido
 * 
 * Esto es lo que diferencia una IA básica de una que REALMENTE entiende contexto emocional.
 * Paper: "Emotional RAG: Incorporating Emotional Factors into RAG for Role-Playing" (2024)
 */
export async function retrieveByEmotion(
    userMessage: string,
    profileId: string,
    options: {
        limit?: number;
        threshold?: number;
        exName?: string; // Filtrar solo respuestas del ex
    } = {}
): Promise<EmotionalContext> {
    const {
        limit = 5,
        threshold = 0.70, // Ligeramente más bajo que semantic normal
        exName
    } = options;

    // 1. Detectar emoción del mensaje del usuario
    const currentEmotion = detectDetailedEmotion(userMessage);
    const intensity = calculateEmotionalIntensity(userMessage);

    console.log(`[EmotionalRAG] Detected emotion: ${currentEmotion} (intensity: ${intensity.toFixed(2)})`);

    try {
        // 2. Convertir mensaje a embedding
        const queryEmbedding = await createEmbedding(userMessage);

        // 3. Buscar mensajes con emoción SIMILAR usando función SQL especializada
        const { data, error } = await supabase.rpc('match_messages_by_emotion', {
            query_embedding: queryEmbedding,
            target_emotion: currentEmotion,
            match_threshold: threshold,
            match_count: limit * 2, // Buscar más para poder filtrar
            filter_profile_id: profileId
        });

        if (error) throw error;

        // 4. Filtrar por ex si se especifica
        let results = data || [];
        if (exName) {
            results = results.filter((r: any) => r.sender === exName);
        }

        // 5. Ordenar por combinación de similitud semántica + score emocional
        results.sort((a: any, b: any) => {
            const scoreA = (a.similarity * 0.7) + (Math.abs(a.emotional_score) * 0.3);
            const scoreB = (b.similarity * 0.7) + (Math.abs(b.emotional_score) * 0.3);
            return scoreB - scoreA;
        });

        // 6. Tomar top N
        const topResults = results.slice(0, limit);

        const matches: SemanticMatch[] = topResults.map((row: any) => ({
            id: row.id,
            messageText: row.message_text,
            sender: row.sender,
            timestamp: row.msg_timestamp, // Cambio: SQL usa msg_timestamp
            emotionalTone: row.emotional_tone,
            similarity: row.similarity
        }));

        console.log(`[EmotionalRAG] Found ${matches.length} emotionally similar messages`);

        return {
            currentEmotion,
            intensity,
            matches
        };
    } catch (error) {
        console.error('[EmotionalRAG] Error:', error);
        return {
            currentEmotion,
            intensity,
            matches: []
        };
    }
}

/**
 * Detección detallada de emoción con matices
 */
export function detectDetailedEmotion(text: string): EmotionType {
    const lower = text.toLowerCase();

    // Definir patrones emocionales (expandido vs detectBasicEmotion)
    const emotionPatterns: Record<EmotionType, string[]> = {
        loving: [
            'te amo', 'te quiero', 'mi amor', 'amor mío', 'bebé',
            'cariño', 'te necesito', 'eres todo', 'mi vida',
            '❤️', '😍', '💕', '💖', '💗'
        ],
        nostalgic: [
            'recuerdo', 'recordar', 'extraño', 'echo de menos',
            'aquella vez', 'cuando', 'antes', 'solíamos',
            'quisiera volver', 'aquellos tiempos', 'me acuerdo'
        ],
        happy: [
            'feliz', 'contento', 'alegre', 'genial', 'increíble',
            'jaja', 'jeje', 'jajaja', 'me encanta', 'perfecto',
            '😊', '😄', '😁', '🥰', '🎉'
        ],
        sad: [
            'triste', 'mal', 'llorar', 'llorando', 'deprimido',
            'solo', 'vacío', 'duele', 'dolor', 'sufro',
            '😢', '😞', '😔', '💔', '😭'
        ],
        angry: [
            'enojado', 'molesto', 'furioso', 'rabia', 'odio',
            'harto', 'cansado', 'no aguanto', 'me molesta',
            '😠', '😡', '🤬', '💢'
        ],
        anxious: [
            'nervioso', 'preocupado', 'ansioso', 'estresado',
            'miedo', 'tengo miedo', 'me da miedo', 'ansiedad',
            '😰', '😨', '😟'
        ],
        neutral: [] // Default
    };

    // Contar matches y calcular scores
    const scores: Record<EmotionType, number> = {
        happy: 0,
        sad: 0,
        angry: 0,
        anxious: 0,
        nostalgic: 0,
        loving: 0,
        neutral: 0
    };

    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
        scores[emotion as EmotionType] = patterns.filter(pattern =>
            lower.includes(pattern)
        ).length;
    });

    // Encontrar emoción dominante
    const dominantEmotion = Object.entries(scores).reduce((max, [emotion, score]) =>
        score > max.score ? { emotion: emotion as EmotionType, score } : max
        , { emotion: 'neutral' as EmotionType, score: 0 });

    return dominantEmotion.score > 0 ? dominantEmotion.emotion : 'neutral';
}

/**
 * Calcula intensidad emocional (0 = débil, 1 = muy fuerte)
 */
function calculateEmotionalIntensity(text: string): number {
    let intensity = 0.5; // Base neutral

    // Factores que aumentan intensidad:

    // 1. Mayúsculas
    const upperCaseRatio = (text.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / text.length;
    if (upperCaseRatio > 0.5) {
        intensity += 0.2; // GRITAR aumenta intensidad
    }

    // 2. Puntuación múltiple (!!!, ???)
    const multiPunctuation = (text.match(/[!?]{2,}/g) || []).length;
    intensity += Math.min(multiPunctuation * 0.1, 0.3);

    // 3. Repetición de letras (holaaa, nooo)
    const letterRepetition = (text.match(/(.)\1{2,}/g) || []).length;
    intensity += Math.min(letterRepetition * 0.05, 0.2);

    // 4. Emojis intensos
    const intenseEmojis = ['😭', '😡', '❤️', '💔', '😍', '🤬'];
    const intenseEmojiCount = intenseEmojis.filter(e => text.includes(e)).length;
    intensity += Math.min(intenseEmojiCount * 0.1, 0.2);

    // 5. Palabras absolutas (nunca, siempre, todo, nada)
    const absoluteWords = ['nunca', 'siempre', 'todo', 'nada', 'jamás', 'never', 'always'];
    const absoluteCount = absoluteWords.filter(w => text.toLowerCase().includes(w)).length;
    intensity += Math.min(absoluteCount * 0.1, 0.2);

    // Normalizar 0-1
    return Math.min(intensity, 1);
}

/**
 * Construye contexto emocional para el prompt del simulador
 */
export function buildEmotionalContext(emotionalContext: EmotionalContext): string {
    if (emotionalContext.matches.length === 0) {
        return 'Sin contexto emocional previo relevante.';
    }

    const { currentEmotion, intensity, matches } = emotionalContext;

    let context = `CONTEXTO EMOCIONAL DEL USUARIO:\n`;
    context += `Emoción detectada: ${translateEmotion(currentEmotion)} (intensidad: ${(intensity * 10).toFixed(1)}/10)\n\n`;
    context += `RESPUESTAS SIMILARES DEL PASADO:\n`;
    context += `Cuando el usuario expresó emociones similares antes, tú respondiste:\n\n`;

    matches.forEach((match, i) => {
        context += `${i + 1}. "${match.messageText.substring(0, 150)}${match.messageText.length > 150 ? '...' : ''}"\n`;
        context += `   (Similitud: ${(match.similarity * 100).toFixed(0)}%)\n\n`;
    });

    context += `\n⚠️ INSTRUCCIÓN: Usa estos ejemplos como GUÍA para tu respuesta actual. `;
    context += `Mantén el MISMO tono emocional y estilo que mostraste en esas respuestas pasadas.\n`;

    return context;
}

function translateEmotion(emotion: EmotionType): string {
    const translations: Record<EmotionType, string> = {
        happy: 'Feliz/Alegre',
        sad: 'Triste/Melancólico',
        angry: 'Enojado/Molesto',
        anxious: 'Ansioso/Preocupado',
        nostalgic: 'Nostálgico',
        loving: 'Amoroso/Cariñoso',
        neutral: 'Neutral'
    };
    return translations[emotion];
}

/**
 * Determina si debería usar Emotional RAG para esta query
 * (no todos los mensajes lo necesitan)
 */
export function shouldUseEmotionalRAG(userMessage: string): boolean {
    const emotionalIndicators = [
        'te extraño', 'te amo', 'te quiero', 'recuerdo', 'recordar',
        'perdón', 'disculpa', 'triste', 'solo', 'mal',
        'feliz', 'contento', 'enojado', 'molesto',
        '❤️', '😢', '😊', '😍', '💔'
    ];

    const lower = userMessage.toLowerCase();
    return emotionalIndicators.some(indicator => lower.includes(indicator));
}

// ============================================================================
// EMOTIONAL MEMORIES SYSTEM
// ============================================================================

/**
 * EMOTIONAL MEMORIES: Crea resúmenes automáticos de momentos clave
 * usando clustering emocional + Gemini AI
 */
export async function createEmotionalMemories(
    messages: ParsedMessage[],
    profileId: string,
    userId: string,
    onProgress?: (current: number, total: number) => void
): Promise<EmotionalMemory[]> {
    console.log('[EmotionalMemories] Starting creation...');

    if (messages.length < 20) {
        console.log('[EmotionalMemories] Not enough messages (<20)');
        return [];
    }

    const memories: EmotionalMemory[] = [];

    // PASO 1: Clasificar todos los mensajes por emoción
    const classifiedMessages = messages.map((msg, idx) => ({
        ...msg,
        id: `msg_${idx}_${Date.now()}`, // Generate ID for tracking
        emotion: detectDetailedEmotion(msg.content),
        intensity: calculateEmotionalIntensity(msg.content),
        timestampDate: new Date(msg.timestamp || Date.now())
    }));

    // PASO 2: Crear clusters temporales (ventanas de 7 días con misma emoción)
    const clusters = createEmotionalClusters(classifiedMessages);

    console.log(`[EmotionalMemories] Created ${clusters.length} clusters`);

    // PASO 3: Generar memorias solo para clusters significativos (Top 20 más intensos)
    let significantClusters = clusters.filter(c => c.messages.length >= 5);

    // Sort by intensity to prioritize the most emotional moments
    significantClusters.sort((a, b) => b.avgIntensity - a.avgIntensity);

    // LIMIT TO TOP 20 to prevent infinite loops (user reported 1/1144)
    significantClusters = significantClusters.slice(0, 20);

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    });

    let processed = 0;
    for (const cluster of significantClusters) {
        try {
            // Generar resumen con Gemini
            const memory = await generateMemorySummary(cluster, model, profileId, userId);
            if (memory) {
                memories.push(memory);

                // Guardar en Supabase
                await saveEmotionalMemory(memory);
            }

            processed++;
            onProgress?.(processed, significantClusters.length);
        } catch (err) {
            console.error('[EmotionalMemories] Error generating memory:', err);
        }
    }

    console.log(`[EmotionalMemories] Created ${memories.length} memories`);
    return memories;
}

/**
 * Crea clusters de mensajes con emociones similares en ventanas temporales
 */
interface EmotionalCluster {
    emotion: EmotionType;
    messages: Array<ParsedMessage & { id: string; emotion: EmotionType; intensity: number; timestampDate: Date }>;
    avgIntensity: number;
    dateRange: { start: Date; end: Date };
}

function createEmotionalClusters(
    classifiedMessages: Array<ParsedMessage & { id: string; emotion: EmotionType; intensity: number; timestampDate: Date }>
): EmotionalCluster[] {
    const clusters: EmotionalCluster[] = [];
    const WINDOW_DAYS = 7;
    const MIN_MESSAGES = 3;

    // Ordenar por timestamp
    const sorted = [...classifiedMessages].sort((a, b) =>
        a.timestampDate.getTime() - b.timestampDate.getTime()
    );

    let currentCluster: EmotionalCluster | null = null;

    for (const msg of sorted) {
        if (!currentCluster) {
            // Iniciar nuevo cluster
            currentCluster = {
                emotion: msg.emotion,
                messages: [msg],
                avgIntensity: msg.intensity,
                dateRange: { start: msg.timestampDate, end: msg.timestampDate }
            };
        } else {
            const daysDiff = (msg.timestampDate.getTime() - currentCluster.dateRange.end.getTime()) / (1000 * 60 * 60 * 24);

            // Si mismo tipo de emoción Y dentro de ventana temporal
            if (msg.emotion === currentCluster.emotion && daysDiff <= WINDOW_DAYS) {
                currentCluster.messages.push(msg);
                currentCluster.dateRange.end = msg.timestampDate;
                currentCluster.avgIntensity = currentCluster.messages.reduce((sum, m) => sum + m.intensity, 0) / currentCluster.messages.length;
            } else {
                // Guardar cluster actual si es significativo
                if (currentCluster.messages.length >= MIN_MESSAGES) {
                    clusters.push(currentCluster);
                }

                // Iniciar nuevo cluster
                currentCluster = {
                    emotion: msg.emotion,
                    messages: [msg],
                    avgIntensity: msg.intensity,
                    dateRange: { start: msg.timestampDate, end: msg.timestampDate }
                };
            }
        }
    }

    // Guardar último cluster
    if (currentCluster && currentCluster.messages.length >= MIN_MESSAGES) {
        clusters.push(currentCluster);
    }

    return clusters;
}

/**
 * Genera resumen usando Gemini AI
 */
async function generateMemorySummary(
    cluster: EmotionalCluster,
    model: any,
    profileId: string,
    userId: string
): Promise<EmotionalMemory | null> {
    // Tomar muestra de mensajes del cluster
    const sampleSize = Math.min(cluster.messages.length, 20);
    const step = Math.floor(cluster.messages.length / sampleSize);
    const sample = cluster.messages.filter((_, i) => i % step === 0).slice(0, sampleSize);

    const messagesText = sample.map(m =>
        `[${m.sender}]: ${m.content}`
    ).join('\n');

    const emotionContext = {
        happy: 'momentos felices y positivos',
        sad: 'momentos tristes o melancólicos',
        angry: 'conflictos y discusiones',
        anxious: 'preocupaciones y ansiedad',
        nostalgic: 'recuerdos nostálgicos',
        loving: 'expresiones de amor y cariño',
        neutral: 'conversaciones neutrales'
    }[cluster.emotion];

    const prompt = `Analiza estos mensajes de una conversación y genera un resumen corto de la MEMORIA EMOCIONAL:

CONTEXTO: Estos mensajes representan ${emotionContext}
MENSAJES:
${messagesText}

GENERA:
1. TÍTULO: Un título corto y descriptivo (máx 60 caracteres), ejemplo: "Viaje a la playa en verano", "Pelea sobre celos"
2. RESUMEN: Un resumen en 2-3 oraciones de qué sucedió y por qué fue importante emocionalmente

FORMATO DE RESPUESTA (JSON):
{
  "title": "título aquí",
  "summary": "resumen aquí"
}

IMPORTANTE: 
- Usa lenguaje natural en español
- Sé específico sobre el evento o tema
- Captura la esencia emocional
- NO inventes detalles que no estén en los mensajes`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Intentar parsear JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('[EmotionalMemories] No JSON found in response');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Determinar tipo de memoria
        const memoryType = determineMemoryType(cluster.emotion, cluster.avgIntensity);

        // Calcular score emocional
        const emotionalScore = calculateClusterScore(cluster);

        return {
            profileId,
            userId,
            memoryType,
            title: parsed.title,
            summary: parsed.summary,
            messageIds: cluster.messages.map(m => m.id || '').filter(Boolean),
            emotionalScore,
            dateRange: {
                start: cluster.dateRange.start.toISOString(),
                end: cluster.dateRange.end.toISOString()
            }
        };
    } catch (err) {
        console.error('[EmotionalMemories] Gemini error:', err);
        return null;
    }
}

function determineMemoryType(emotion: EmotionType, intensity: number): 'happy' | 'conflict' | 'milestone' | 'painful' {
    if (emotion === 'happy' || emotion === 'loving') {
        return intensity > 0.7 ? 'milestone' : 'happy';
    } else if (emotion === 'angry') {
        return 'conflict';
    } else if (emotion === 'sad' || emotion === 'anxious') {
        return 'painful';
    } else {
        return intensity > 0.6 ? 'milestone' : 'happy';
    }
}

function calculateClusterScore(cluster: EmotionalCluster): number {
    const emotionScores: Record<EmotionType, number> = {
        happy: 0.7,
        loving: 0.9,
        nostalgic: 0.3,
        neutral: 0,
        anxious: -0.4,
        sad: -0.6,
        angry: -0.8
    };

    const baseScore = emotionScores[cluster.emotion];
    const intensityModifier = cluster.avgIntensity - 0.5; // -0.5 a 0.5

    return Math.max(-1, Math.min(1, baseScore + intensityModifier));
}

/**
 * Guarda memoria en Supabase
 */
async function saveEmotionalMemory(memory: EmotionalMemory): Promise<void> {
    const { error } = await supabase
        .from('emotional_memories')
        .insert({
            profile_id: memory.profileId,
            user_id: memory.userId,
            memory_type: memory.memoryType,
            title: memory.title,
            summary: memory.summary,
            message_ids: memory.messageIds,
            emotional_score: memory.emotionalScore,
            date_start: memory.dateRange.start,
            date_end: memory.dateRange.end
        });

    if (error) {
        console.error('[EmotionalMemories] Supabase error:', error);
        throw error;
    }
}



function getMemoryTypesForEmotion(emotion: EmotionType): Array<'happy' | 'conflict' | 'milestone' | 'painful'> {
    switch (emotion) {
        case 'happy':
        case 'loving':
            return ['happy', 'milestone'];
        case 'angry':
            return ['conflict'];
        case 'sad':
        case 'anxious':
            return ['painful'];
        case 'nostalgic':
            return ['milestone', 'happy'];
        default:
            return ['happy', 'conflict', 'milestone', 'painful'];
    }
}

/**
 * Recupera memorias emocionales relevantes basadas en la emoción actual
 */
export async function retrieveRelevantMemories(
    currentEmotion: EmotionType,
    profileId: string,
    userId: string
): Promise<EmotionalMemory[]> {
    try {
        // Mapear emoción a tipo de memoria
        let memoryType = 'happy';
        if (currentEmotion === 'sad' || currentEmotion === 'anxious') memoryType = 'painful';
        if (currentEmotion === 'angry') memoryType = 'conflict';
        if (currentEmotion === 'loving' || currentEmotion === 'happy') memoryType = 'happy';

        const { data, error } = await supabase
            .from('emotional_memories')
            .select('*')
            .eq('profile_id', profileId)
            .eq('user_id', userId)
            .eq('memory_type', memoryType)
            .order('emotional_score', { ascending: false })
            .limit(3);

        if (error) {
            console.warn('[EmotionalRAG] Error fetching memories:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('[EmotionalRAG] Unexpected error:', err);
        return [];
    }
}

/**
 * Recupera fechas importantes que coinciden con el día de hoy
 */
export async function getTodaysImportantDates(
    profileId: string
): Promise<Array<{ type: string; description: string }>> {
    try {
        // Usar la función RPC si es posible, o hacer query directa con filtro de fecha
        const { data, error } = await supabase
            .rpc('get_todays_important_dates', { p_profile_id: profileId });

        if (error) {
            // Fallback: Query manual si RPC falla
            console.warn('[EmotionalRAG] RPC error, trying manual query:', error);
            return []; // Por ahora retornamos vacío para evitar crash
        }

        return data?.map((d: any) => ({
            type: d.date_type,
            description: d.description
        })) || [];
    } catch (err) {
        console.error('[EmotionalRAG] Date fetch error:', err);
        return [];
    }
}
