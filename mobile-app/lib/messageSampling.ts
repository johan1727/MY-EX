import { ParsedMessage } from './exSimulator';

/**
 * Token-based sampling strategy
 * Ensures we stay within 500k token limit while maximizing data quality
 */

export interface TokenSamplingStats {
    targetTokens: number;
    estimatedTokens: number;
    messagesIncluded: number;
    totalMessages: number;
    strategy: {
        first: number;        // tokens from start
        recent: number;       // tokens from end
        long: number;         // long messages
        emotional: number;    // emotional keywords
        random: number;       // stratified middle
    };
}

export interface SamplingResult {
    messages: ParsedMessage[];
    stats: TokenSamplingStats;
}

// Average tokens per message (WhatsApp/Telegram)
const AVG_TOKENS_PER_MESSAGE = 20;

// Emotional keywords to detect important messages
const EMOTIONAL_KEYWORDS = [
    'amor', 'te amo', 'te quiero', 'mi amor',
    'enojado', 'enojada', 'molesto', 'molesta', 'furioso', 'furiosa',
    'triste', 'llorar', 'lloro', 'deprimido', 'deprimida',
    'feliz', 'contento', 'contenta', 'alegre', 'emocionado', 'emocionada',
    'perdón', 'perdona', 'disculpa', 'lo siento',
    'extraño', 'extrañar', 'te extraño', 'te necesito',
    'terminar', 'terminamos', 'ruptura', 'adiós', 'déjame',
    'gracias', 'te agradezco', 'increíble', 'maravilloso',
    'preocupado', 'preocupada', 'nervioso', 'nerviosa', 'ansioso', 'ansiosa',
    'celos', 'celoso', 'celosa', 'desconfío',
    'familia', 'mamá', 'papá', 'hermano', 'hermana',
    'trabajo', 'estudio', 'universidad', 'escuela',
    'aniversario', 'cumpleaños', 'primera vez'
];

/**
 * Estimate token count for a message
 */
function estimateTokens(message: ParsedMessage): number {
    if (!message.content) return 0;

    // More accurate: ~4 chars per token in Spanish
    const charCount = message.content.length;
    return Math.ceil(charCount / 4);
}

/**
 * Check if message contains emotional keywords
 */
function hasEmotionalContent(message: ParsedMessage): boolean {
    if (!message.content) return false;

    const contentLower = message.content.toLowerCase();
    return EMOTIONAL_KEYWORDS.some(keyword => contentLower.includes(keyword));
}

/**
 * Calculate message importance score (0-1)
 */
function calculateImportance(message: ParsedMessage, index: number, total: number): number {
    let score = 0;

    // Length bonus (longer = more context)
    const tokens = estimateTokens(message);
    if (tokens > 50) score += 0.3;
    else if (tokens > 20) score += 0.2;

    // Emotional content bonus
    if (hasEmotionalContent(message)) score += 0.4;

    // Position bonus (first and last 10% are important)
    const position = index / total;
    if (position < 0.1 || position > 0.9) score += 0.3;

    return Math.min(score, 1);
}

/**
 * Filter messages by minimum length
 */
function filterLongMessages(messages: ParsedMessage[], targetCount: number): ParsedMessage[] {
    const sorted = [...messages].sort((a, b) => {
        const tokensA = estimateTokens(a);
        const tokensB = estimateTokens(b);
        return tokensB - tokensA;
    });

    return sorted.slice(0, targetCount);
}

/**
 * Filter messages with emotional content
 */
function filterEmotionalMessages(messages: ParsedMessage[], targetCount: number): ParsedMessage[] {
    const emotional = messages.filter(msg => hasEmotionalContent(msg));

    // Sort by importance
    const sorted = emotional.sort((a, b) => {
        const scoreA = calculateImportance(a, messages.indexOf(a), messages.length);
        const scoreB = calculateImportance(b, messages.indexOf(b), messages.length);
        return scoreB - scoreA;
    });

    return sorted.slice(0, targetCount);
}

/**
 * Stratified random sampling from middle section
 */
function stratifiedSample(messages: ParsedMessage[], targetCount: number): ParsedMessage[] {
    // Skip first and last 10%
    const startIdx = Math.floor(messages.length * 0.1);
    const endIdx = Math.floor(messages.length * 0.9);
    const middleMessages = messages.slice(startIdx, endIdx);

    if (middleMessages.length <= targetCount) {
        return middleMessages;
    }

    // Divide into strata
    const strataCount = 10;
    const strataSize = Math.floor(middleMessages.length / strataCount);
    const samplesPerStrata = Math.floor(targetCount / strataCount);

    const sampled: ParsedMessage[] = [];

    for (let i = 0; i < strataCount; i++) {
        const strataStart = i * strataSize;
        const strataEnd = (i + 1) * strataSize;
        const strata = middleMessages.slice(strataStart, strataEnd);

        // Weight by importance
        const weighted = strata.map((msg, idx) => ({
            message: msg,
            importance: calculateImportance(msg, strataStart + idx, messages.length)
        }));

        // Sort by importance and take top N
        weighted.sort((a, b) => b.importance - a.importance);
        sampled.push(...weighted.slice(0, samplesPerStrata).map(w => w.message));
    }

    return sampled;
}

/**
 * Remove duplicate messages
 */
function deduplicateMessages(messages: ParsedMessage[]): ParsedMessage[] {
    const seen = new Set<string>();
    const unique: ParsedMessage[] = [];

    for (const msg of messages) {
        // Use timestamp + sender + content as key
        const timestamp = typeof msg.timestamp === 'object' && msg.timestamp instanceof Date
            ? msg.timestamp.getTime()
            : new Date(msg.timestamp).getTime();
        const key = `${timestamp}_${msg.sender}_${msg.content}`;

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(msg);
        }
    }

    // Sort by timestamp
    return unique.sort((a, b) => {
        const aTime = typeof a.timestamp === 'object' && a.timestamp instanceof Date
            ? a.timestamp.getTime()
            : new Date(a.timestamp).getTime();
        const bTime = typeof b.timestamp === 'object' && b.timestamp instanceof Date
            ? b.timestamp.getTime()
            : new Date(b.timestamp).getTime();
        return aTime - bTime;
    });
}

/**
 * Main intelligent token sampling function
 * Samples messages to stay within token limit while maximizing information
 */
export function intelligentTokenSampling(
    messages: ParsedMessage[],
    maxTokens: number = 500000
): SamplingResult {
    console.log(`[TokenSampling] Starting with ${messages.length} messages`);

    // Calculate total tokens
    const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg), 0);
    console.log(`[TokenSampling] Estimated total tokens: ${totalTokens}`);

    // If within limit, use all messages
    if (totalTokens <= maxTokens) {
        console.log(`[TokenSampling] Within limit, using all messages`);
        return {
            messages,
            stats: {
                targetTokens: maxTokens,
                estimatedTokens: totalTokens,
                messagesIncluded: messages.length,
                totalMessages: messages.length,
                strategy: {
                    first: totalTokens,
                    recent: 0,
                    long: 0,
                    emotional: 0,
                    random: 0
                }
            }
        };
    }

    console.log(`[TokenSampling] Exceeds limit, applying intelligent sampling...`);

    // Strategic sampling
    const samples: {
        first: ParsedMessage[];
        recent: ParsedMessage[];
        long: ParsedMessage[];
        emotional: ParsedMessage[];
        random: ParsedMessage[];
    } = {
        first: [],
        recent: [],
        long: [],
        emotional: [],
        random: []
    };

    // 1. First messages (inicio de relación - crítico)
    samples.first = messages.slice(0, Math.min(1000, messages.length));
    console.log(`[TokenSampling] First: ${samples.first.length} messages`);

    // 2. Recent messages (estado actual - crítico)  
    samples.recent = messages.slice(-Math.min(2000, messages.length));
    console.log(`[TokenSampling] Recent: ${samples.recent.length} messages`);

    // 3. Long messages (más contexto)
    samples.long = filterLongMessages(messages, 2000);
    console.log(`[TokenSampling] Long: ${samples.long.length} messages`);

    // 4. Emotional messages (palabras clave)
    samples.emotional = filterEmotionalMessages(messages, 3000);
    console.log(`[TokenSampling] Emotional: ${samples.emotional.length} messages`);

    // 5. Stratified random from MIDDLE (desarrollo de relación - IMPORTANTE)
    samples.random = stratifiedSample(messages, 20000); // AUMENTADO de 15k a 20k
    console.log(`[TokenSampling] Middle (random stratified): ${samples.random.length} messages`);

    // Merge and deduplicate
    const allSamples = [
        ...samples.first,
        ...samples.recent,
        ...samples.long,
        ...samples.emotional,
        ...samples.random
    ];

    const uniqueSamples = deduplicateMessages(allSamples);
    console.log(`[TokenSampling] After deduplication: ${uniqueSamples.length} messages`);
    console.log(`[TokenSampling] 📊 Distribution => Inicio: ${samples.first.length} | MEDIO: ${samples.random.length} | Final: ${samples.recent.length}`);

    // Calculate final token count
    const finalTokens = uniqueSamples.reduce((sum, msg) => sum + estimateTokens(msg), 0);
    console.log(`[TokenSampling] Final estimated tokens: ${finalTokens}`);

    // Calculate strategy breakdown
    const strategy = {
        first: samples.first.reduce((sum, msg) => sum + estimateTokens(msg), 0),
        recent: samples.recent.reduce((sum, msg) => sum + estimateTokens(msg), 0),
        long: samples.long.reduce((sum, msg) => sum + estimateTokens(msg), 0),
        emotional: samples.emotional.reduce((sum, msg) => sum + estimateTokens(msg), 0),
        random: samples.random.reduce((sum, msg) => sum + estimateTokens(msg), 0)
    };

    return {
        messages: uniqueSamples,
        stats: {
            targetTokens: maxTokens,
            estimatedTokens: finalTokens,
            messagesIncluded: uniqueSamples.length,
            totalMessages: messages.length,
            strategy
        }
    };
}

/**
 * Sample messages specifically for a stage focus
 */
export function sampleForStage(
    messages: ParsedMessage[],
    focus: string,
    maxTokens: number = 100000
): ParsedMessage[] {
    console.log(`[StageS ampling] Sampling for ${focus} (max ${maxTokens} tokens)`);

    let filtered: ParsedMessage[] = [];

    switch (focus) {
        case 'PERSONAL_INFO':
            // Look for self-references, age mentions, location, work
            filtered = messages.filter(msg => {
                const content = msg.content?.toLowerCase() || '';
                return content.includes('años') ||
                    content.includes('trabajo') ||
                    content.includes('estudio') ||
                    content.includes('vivo') ||
                    content.includes('casa') ||
                    content.includes('ciudad');
            });
            break;

        case 'FAMILY':
            filtered = messages.filter(msg => {
                const content = msg.content?.toLowerCase() || '';
                return content.includes('mamá') ||
                    content.includes('papá') ||
                    content.includes('madre') ||
                    content.includes('padre') ||
                    content.includes('hermano') ||
                    content.includes('hermana') ||
                    content.includes('familia') ||
                    content.includes('mascota') ||
                    content.includes('perro') ||
                    content.includes('gato');
            });
            break;

        case 'SOCIAL_CIRCLE':
            filtered = messages.filter(msg => {
                const content = msg.content?.toLowerCase() || '';
                return content.includes('amigo') ||
                    content.includes('amiga') ||
                    content.includes('compañero') ||
                    content.includes('compañera') ||
                    content.includes('conocido') ||
                    content.includes('gente');
            });
            break;

        case 'ROUTINES':
            filtered = messages.filter(msg => {
                const content = msg.content?.toLowerCase() || '';
                return content.includes('desayuno') ||
                    content.includes('comida') ||
                    content.includes('cena') ||
                    content.includes('dormir') ||
                    content.includes('despertar') ||
                    content.includes('trabajo') ||
                    content.includes('gym') ||
                    content.includes('hora');
            });
            break;

        case 'EMOTIONS_TOPICS':
            filtered = messages.filter(msg => hasEmotionalContent(msg));
            break;

        case 'IMPORTANT_DATES':
            filtered = messages.filter(msg => {
                const content = msg.content?.toLowerCase() || '';
                return content.includes('aniversario') ||
                    content.includes('cumpleaños') ||
                    content.includes('fecha') ||
                    content.includes('día') ||
                    content.includes('primera vez') ||
                    content.includes('conocimos') ||
                    /\d{1,2}[\/\-]\d{1,2}/.test(content); // Date patterns
            });
            break;

        case 'RELATIONSHIP_DYNAMICS':
            // All messages are relevant for dynamics
            filtered = messages;
            break;

        default:
            filtered = messages;
    }

    console.log(`[StageSampling] Filtered to ${filtered.length} relevant messages`);

    // If still too many, sample intelligently
    if (filtered.length === 0) {
        filtered = messages; // Fallback to all
    }

    const totalTokens = filtered.reduce((sum, msg) => sum + estimateTokens(msg), 0);

    if (totalTokens <= maxTokens) {
        return filtered;
    }

    // Need to further sample
    const ratio = maxTokens / totalTokens;
    const targetCount = Math.floor(filtered.length * ratio);

    // Take mix of first, middle, last
    const firstPart = Math.floor(targetCount * 0.3);
    const middlePart = Math.floor(targetCount * 0.4);
    const lastPart = targetCount - firstPart - middlePart;

    const sampled = [
        ...filtered.slice(0, firstPart),
        ...stratifiedSample(filtered, middlePart),
        ...filtered.slice(-lastPart)
    ];

    return deduplicateMessages(sampled);
}
