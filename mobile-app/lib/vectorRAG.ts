import { ParsedMessage } from './exSimulator';
import { supabase } from './supabase';

// Usar Edge Function para embeddings (Seguro)
// const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface MessageEmbedding {
    id?: string;
    messageText: string;
    sender: string;
    timestamp?: string;
    embedding: number[];
    emotionalTone?: string;
    emotionalScore?: number;
}

export interface SemanticMatch {
    id: string;
    messageText: string;
    sender: string;
    timestamp?: string;
    emotionalTone?: string;
    similarity: number;
}

/**
 * Convierte un texto a embedding usando Edge Function (Seguro)
 */
export async function createEmbedding(text: string): Promise<number[]> {
    try {
        const { data, error } = await supabase.functions.invoke('embeddings', {
            body: { input: text }
        });

        if (error) {
            console.error('[VectorRAG] Edge Function Error:', error);
            throw new Error(error.message);
        }

        if (!data || !data.embedding) {
            throw new Error('Invalid response from embedding service');
        }

        return data.embedding;
    } catch (error) {
        console.error('[VectorRAG] Error creating embedding:', error);
        throw error;
    }
}

/**
 * Convierte múltiples mensajes a embeddings (procesa por lotes en Edge Function)
 */
export async function embedMessages(
    messages: ParsedMessage[],
    profileId: string,
    userId: string,
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    console.log(`[VectorRAG] Embedding ${messages.length} messages...`);

    const total = messages.length;

    // Procesar en lotes de 10
    const BATCH_SIZE = 10;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        const batchTexts = batch.map(m => m.content);

        onProgress?.(Math.min(i + BATCH_SIZE, total), total);

        try {
            // Llamar a Edge Function con el lote de textos
            const { data, error } = await supabase.functions.invoke('embeddings', {
                body: { batch: batchTexts }
            });

            if (error) {
                console.error('[VectorRAG] Edge Function Batch Error:', error);
                // Skip batch on error
                continue;
            }

            const embeddingsList = data?.embeddings;

            if (!embeddingsList || !Array.isArray(embeddingsList) || embeddingsList.length !== batch.length) {
                console.error('[VectorRAG] Mismatch in embeddings count');
                continue;
            }

            // Mapear resultados a objetos para insertar
            const embeddingsToInsert = batch.map((msg, index) => {
                const embedding = embeddingsList[index];
                if (!embedding) return null;

                return {
                    profile_id: profileId,
                    user_id: userId,
                    content: msg.content,
                    sender: msg.sender,
                    timestamp: msg.timestamp,
                    embedding: embedding,
                    emotional_tone: detectBasicEmotion(msg.content),
                    emotional_score: calculateEmotionalScore(msg.content),
                    role: msg.sender,
                    ex_profile_id: profileId
                };
            }).filter(e => e !== null);

            // Insertar en Supabase
            if (embeddingsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('message_embeddings')
                    .insert(embeddingsToInsert);

                if (insertError) {
                    console.error(`[VectorRAG] Error inserting batch at ${i}:`, insertError);
                } else {
                    console.log(`[VectorRAG] Batch ${i}-${i + embeddingsToInsert.length} completed`);
                }
            }

        } catch (err) {
            console.error(`[VectorRAG] Error processing batch ${i}:`, err);
        }

        // Delay entre lotes para no saturar Rate Limits de Supabase/Gemini
        if (i + BATCH_SIZE < messages.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`[VectorRAG] ✅ All ${messages.length} messages process completed`);
}

/**
 * Búsqueda semántica de mensajes similares
 */
export async function semanticSearch(
    query: string,
    profileId: string,
    options: {
        limit?: number;
        threshold?: number;
        sender?: string; // Filtrar por sender específico
    } = {}
): Promise<SemanticMatch[]> {
    const {
        limit = 5,
        threshold = 0.75,
        sender
    } = options;

    try {
        // 1. Convertir query a embedding
        const queryEmbedding = await createEmbedding(query);

        // 2. Buscar en Supabase usando función match_messages
        const { data, error } = await supabase.rpc('match_messages', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: limit,
            filter_profile_id: profileId
        });

        if (error) throw error;

        // 3. Filtrar por sender si se especifica
        let results = data || [];
        if (sender) {
            results = results.filter((r: any) => r.sender === sender);
        }

        return results.map((row: any) => ({
            id: row.id,
            messageText: row.message_text,
            sender: row.sender,
            timestamp: row.msg_timestamp, // Cambio: SQL usa msg_timestamp
            emotionalTone: row.emotional_tone,
            similarity: row.similarity
        }));
    } catch (error) {
        console.error('[VectorRAG] Semantic search error:', error);
        return [];
    }
}

/**
 * Detección básica de emoción (mejorar con modelo ML si es necesario)
 */
function detectBasicEmotion(text: string): string {
    const lower = text.toLowerCase();

    // Palabras indicadoras de emociones
    const emotions = {
        happy: ['feliz', 'contento', 'alegre', 'genial', 'increíble', 'jaja', 'jeje', '😊', '😄', '❤️', '😍'],
        sad: ['triste', 'mal', 'llorar', 'deprimido', '😢', '😞', '💔'],
        angry: ['enojado', 'molesto', 'furioso', 'rabia', 'odio', '😠', '😡'],
        anxious: ['nervioso', 'preocupado', 'ansioso', 'estresado', 'miedo'],
        nostalgic: ['recuerdo', 'extraño', 'echo de menos', 'recordar', 'aquella vez'],
        loving: ['te amo', 'te quiero', 'amor', 'cariño', 'mi amor', 'bebé', 'amor mío']
    };

    // Contar matches para cada emoción
    const scores: Record<string, number> = {};
    Object.entries(emotions).forEach(([emotion, keywords]) => {
        scores[emotion] = keywords.filter(kw => lower.includes(kw)).length;
    });

    // Retornar emoción con más matches
    const maxEmotion = Object.entries(scores).reduce((a, b) =>
        b[1] > a[1] ? b : a
    );

    return maxEmotion[1] > 0 ? maxEmotion[0] : 'neutral';
}

/**
 * Calcula score emocional de -1 (negativo) a +1 (positivo)
 */
function calculateEmotionalScore(text: string): number {
    const lower = text.toLowerCase();

    const positiveWords = [
        'feliz', 'amor', 'genial', 'increíble', 'hermoso', 'perfecto',
        'jaja', 'jeje', '❤️', '😍', '😊', '😄', '💕'
    ];

    const negativeWords = [
        'triste', 'odio', 'mal', 'horrible', 'terrible', 'enojado',
        'llorar', '😢', '😞', '💔', '😠', '😡'
    ];

    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

    const total = positiveCount + negativeCount;
    if (total === 0) return 0; // Neutral

    // Normalizar a -1 a +1
    return (positiveCount - negativeCount) / total;
}

/**
 * Elimina embeddings existentes para un perfil (útil para re-análisis)
 */
export async function clearEmbeddings(profileId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('message_embeddings')
            .delete()
            .eq('profile_id', profileId);

        if (error) throw error;
        console.log(`[VectorRAG] Cleared embeddings for profile ${profileId}`);
    } catch (error) {
        console.error('[VectorRAG] Error clearing embeddings:', error);
        throw error;
    }
}

/**
 * Verifica si un perfil ya tiene embeddings
 */
export async function hasEmbeddings(profileId: string): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('message_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profileId);

        if (error) throw error;
        return (count || 0) > 0;
    } catch (error) {
        console.error('[VectorRAG] Error checking embeddings:', error);
        return false;
    }
}

/**
 * Estadísticas de embeddings para un perfil
 */
export async function getEmbeddingStats(profileId: string): Promise<{
    totalMessages: number;
    emotionBreakdown: Record<string, number>;
}> {
    try {
        const { data, error } = await supabase
            .from('message_embeddings')
            .select('emotional_tone')
            .eq('profile_id', profileId);

        if (error) throw error;

        const emotionBreakdown: Record<string, number> = {};
        data?.forEach((row: any) => {
            const emotion = row.emotional_tone || 'neutral';
            emotionBreakdown[emotion] = (emotionBreakdown[emotion] || 0) + 1;
        });

        return {
            totalMessages: data?.length || 0,
            emotionBreakdown
        };
    } catch (error) {
        console.error('[VectorRAG] Error getting stats:', error);
        return {
            totalMessages: 0,
            emotionBreakdown: {}
        };
    }
}
