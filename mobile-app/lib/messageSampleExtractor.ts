import { ParsedMessage } from './exSimulator';

/**
 * Extract representative message samples for realistic simulation
 * Returns actual messages that the AI can use as examples
 */

export interface MessageSamples {
    exMessages: string[];           // 150 representative messages from ex
    userMessages: string[];         // 50 messages from user for context
    conversations: ConversationSample[];  // 5-10 complete conversation threads
    commonEmojis: string[];         // Ex's favorite emojis
    avgMessageLength: number;       // Average chars per message
    responseTimePattern: 'fast' | 'medium' | 'slow' | 'variable';
}

export interface ConversationSample {
    context: string;                // What they were talking about
    messages: Array<{
        sender: 'user' | 'ex';
        text: string;
    }>;
}

/**
 * Extract message samples from parsed messages
 */
export function extractMessageSamples(
    messages: ParsedMessage[],
    exSenderName: string
): MessageSamples {
    console.log('[MessageSamples] Extracting samples...');
    console.log('[MessageSamples] Total messages:', messages.length);
    console.log('[MessageSamples] Ex name:', exSenderName);

    // Separate ex and user messages
    const exMessages = messages.filter(m => m.sender === exSenderName);
    const userMessages = messages.filter(m => m.sender !== exSenderName);

    console.log('[MessageSamples] Ex messages:', exMessages.length);
    console.log('[MessageSamples] User messages:', userMessages.length);

    // 1. Sample 150 representative ex messages
    const exSamples = sampleRepresentativeMessages(exMessages, 150);

    // 2. Sample 50 user messages for context
    const userSamples = sampleRepresentativeMessages(userMessages, 50);

    // 3. Extract conversation threads
    const conversations = extractConversationThreads(messages, exSenderName, 10);

    // 4. Extract common emojis
    const emojis = extractCommonEmojis(exMessages);

    // 5. Calculate average message length
    const totalChars = exMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const avgLength = Math.round(totalChars / exMessages.length);

    // 6. Detect response time pattern (based on message clustering)
    const responsePattern = detectResponsePattern(exMessages);

    console.log('[MessageSamples] Extracted:', {
        exSamples: exSamples.length,
        userSamples: userSamples.length,
        conversations: conversations.length,
        emojis: emojis.length,
        avgLength,
        responsePattern
    });

    return {
        exMessages: exSamples,
        userMessages: userSamples,
        conversations,
        commonEmojis: emojis,
        avgMessageLength: avgLength,
        responseTimePattern: responsePattern
    };
}

/**
 * Sample representative messages using stratified sampling
 */
function sampleRepresentativeMessages(messages: ParsedMessage[], targetCount: number): string[] {
    if (messages.length <= targetCount) {
        return messages.map(m => m.content || '').filter(c => c.length > 0);
    }

    const samples: string[] = [];

    // Strategy: take messages from different parts of the timeline
    // 30% from start, 40% from middle, 30% from end
    const startCount = Math.floor(targetCount * 0.3);
    const middleCount = Math.floor(targetCount * 0.4);
    const endCount = targetCount - startCount - middleCount;

    // Start messages
    const startMsgs = messages.slice(0, Math.min(messages.length * 0.2, 1000));
    samples.push(...selectDiverseMessages(startMsgs, startCount));

    // Middle messages (stratified across middle 60%)
    const middleStart = Math.floor(messages.length * 0.2);
    const middleEnd = Math.floor(messages.length * 0.8);
    const middleMsgs = messages.slice(middleStart, middleEnd);
    samples.push(...selectDiverseMessages(middleMsgs, middleCount));

    // End messages
    const endMsgs = messages.slice(-Math.min(messages.length * 0.2, 1000));
    samples.push(...selectDiverseMessages(endMsgs, endCount));

    return samples;
}

/**
 * Select diverse messages (varying lengths, content types)
 */
function selectDiverseMessages(messages: ParsedMessage[], count: number): string[] {
    if (messages.length <= count) {
        return messages.map(m => m.content || '').filter(c => c.length > 0);
    }

    // Group by length categories
    const short = messages.filter(m => (m.content?.length || 0) < 20);
    const medium = messages.filter(m => {
        const len = m.content?.length || 0;
        return len >= 20 && len < 100;
    });
    const long = messages.filter(m => (m.content?.length || 0) >= 100);

    const samples: string[] = [];

    // Distribute samples: 40% medium, 30% short, 30% long
    const mediumCount = Math.floor(count * 0.4);
    const shortCount = Math.floor(count * 0.3);
    const longCount = count - mediumCount - shortCount;

    // Sample from each category
    samples.push(...uniformSample(medium, mediumCount).map(m => m.content || ''));
    samples.push(...uniformSample(short, shortCount).map(m => m.content || ''));
    samples.push(...uniformSample(long, longCount).map(m => m.content || ''));

    return samples.filter(s => s.length > 0);
}

/**
 * Uniform sampling across a message array
 */
function uniformSample(messages: ParsedMessage[], count: number): ParsedMessage[] {
    if (messages.length <= count) return messages;

    const step = messages.length / count;
    const samples: ParsedMessage[] = [];

    for (let i = 0; i < count; i++) {
        const index = Math.floor(i * step);
        if (index < messages.length) {
            samples.push(messages[index]);
        }
    }

    return samples;
}

/**
 * Extract complete conversation threads (back-and-forth exchanges)
 */
function extractConversationThreads(
    messages: ParsedMessage[],
    exSenderName: string,
    maxThreads: number
): ConversationSample[] {
    console.log('[ConversationThreads] Extracting...');

    const threads: ConversationSample[] = [];
    let i = 0;

    // Look for conversational exchanges (at least 3 back-and-forth)
    while (i < messages.length - 5 && threads.length < maxThreads) {
        const window = messages.slice(i, i + 10);

        // Check if this is a conversation (alternating senders)
        const senders = window.map(m => m.sender);
        const hasExchange = senders.some((s, idx) => {
            if (idx === 0) return false;
            return s !== senders[idx - 1];
        });

        if (hasExchange) {
            // Extract this thread
            const threadMessages = window.slice(0, 6).map(m => ({
                sender: (m.sender === exSenderName ? 'ex' : 'user') as 'user' | 'ex',
                text: m.content || ''
            }));

            // Infer context from message content
            const allText = threadMessages.map(m => m.text).join(' ').toLowerCase();
            let context = 'Conversación casual';

            if (allText.includes('amor') || allText.includes('extrañ')) {
                context = 'Tema emocional';
            } else if (allText.includes('plan') || allText.includes('ir') || allText.includes('salir')) {
                context = 'Haciendo planes';
            } else if (allText.includes('trabajo') || allText.includes('estudi')) {
                context = 'Hablando del día';
            } else if (allText.includes('enoj') || allText.includes('molest')) {
                context = 'Discusión/conflicto';
            }

            threads.push({
                context,
                messages: threadMessages
            });

            i += 15; // Skip ahead to avoid overlapping threads
        } else {
            i += 5;
        }
    }

    // If we didn't find enough, add some from different parts
    if (threads.length < 3) {
        const sections = [
            messages.slice(0, 6),
            messages.slice(Math.floor(messages.length / 2), Math.floor(messages.length / 2) + 6),
            messages.slice(-6)
        ];

        for (const section of sections) {
            if (threads.length >= maxThreads) break;

            threads.push({
                context: 'Conversación de ejemplo',
                messages: section.map(m => ({
                    sender: (m.sender === exSenderName ? 'ex' : 'user') as 'user' | 'ex',
                    text: m.content || ''
                }))
            });
        }
    }

    console.log('[ConversationThreads] Extracted:', threads.length);
    return threads.slice(0, maxThreads);
}

/**
 * Extract most commonly used emojis
 */
function extractCommonEmojis(messages: ParsedMessage[]): string[] {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiCounts = new Map<string, number>();

    messages.forEach(msg => {
        const emojis = msg.content?.match(emojiRegex) || [];
        emojis.forEach(emoji => {
            emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
        });
    });

    // Sort by frequency and take top 10
    const sorted = Array.from(emojiCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([emoji]) => emoji);

    console.log('[Emojis] Found:', sorted.join(' '));
    return sorted;
}

/**
 * Detect response time pattern based on message clustering
 */
function detectResponsePattern(messages: ParsedMessage[]): 'fast' | 'medium' | 'slow' | 'variable' {
    // Simplified: if many short messages, assume fast responder
    // If mostly longer messages, assume slower/thoughtful
    const avgLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length;

    if (avgLength < 15) return 'fast';
    if (avgLength < 40) return 'medium';
    if (avgLength < 80) return 'slow';
    return 'variable';
}
