import { ParsedMessage } from './exSimulator';

/**
 * Estimates token count for a message
 * Rough estimate: 1 token ≈ 4 characters for Spanish text
 */
function estimateTokens(message: ParsedMessage): number {
    const contentLength = message.content?.length || 0;
    const senderLength = message.sender?.length || 0;
    const totalChars = contentLength + senderLength;

    // Rough estimate: 1 token per 4 characters
    return Math.ceil(totalChars / 4);
}

/**
 * Calculates total tokens for an array of messages
 */
function calculateTotalTokens(messages: ParsedMessage[]): number {
    return messages.reduce((total, msg) => total + estimateTokens(msg), 0);
}

/**
 * Intelligently samples messages from a large conversation based on TOKEN LIMIT
 * instead of message count, to better utilize available context.
 * 
 * Target: ~500,000 tokens (adaptive to message length)
 * 
 * Distribution:
 * - 40% from most recent messages
 * - 20% from beginning
 * - 20% from middle period
 * - 20% distributed throughout
 */
export function intelligentMessageSampling(messages: ParsedMessage[]): {
    messages: ParsedMessage[];
    wasLimited: boolean;
    samplingInfo: string;
} {
    const TARGET_TOKENS = 500000;
    const total = messages.length;

    // Calculate total tokens in conversation
    const totalTokens = calculateTotalTokens(messages);

    console.log('[Sampling] Conversation stats:', {
        totalMessages: total,
        totalTokens: totalTokens.toLocaleString(),
        avgTokensPerMessage: Math.round(totalTokens / total)
    });

    // If under token limit, use all messages
    if (totalTokens <= TARGET_TOKENS) {
        console.log('[Sampling] Under token limit, using all messages');
        return {
            messages,
            wasLimited: false,
            samplingInfo: ''
        };
    }

    console.log('[Sampling] Applying token-based intelligent sampling...');

    // Calculate target tokens for each section
    const recentTokenTarget = Math.floor(TARGET_TOKENS * 0.40); // 40%
    const beginningTokenTarget = Math.floor(TARGET_TOKENS * 0.20); // 20%
    const middleTokenTarget = Math.floor(TARGET_TOKENS * 0.20); // 20%
    const distributedTokenTarget = Math.floor(TARGET_TOKENS * 0.20); // 20%

    // 1. Extract recent messages up to token limit
    const recentMessages: ParsedMessage[] = [];
    let recentTokens = 0;
    for (let i = total - 1; i >= 0 && recentTokens < recentTokenTarget; i--) {
        const msg = messages[i];
        const tokens = estimateTokens(msg);
        if (recentTokens + tokens <= recentTokenTarget) {
            recentMessages.unshift(msg);
            recentTokens += tokens;
        }
    }

    // 2. Extract beginning messages up to token limit
    const beginningMessages: ParsedMessage[] = [];
    let beginningTokens = 0;
    for (let i = 0; i < total && beginningTokens < beginningTokenTarget; i++) {
        const msg = messages[i];
        const tokens = estimateTokens(msg);
        if (beginningTokens + tokens <= beginningTokenTarget) {
            beginningMessages.push(msg);
            beginningTokens += tokens;
        }
    }

    // 3. Extract middle messages up to token limit
    const middleStart = Math.floor(total / 2);
    const middleMessages: ParsedMessage[] = [];
    let middleTokens = 0;

    // Sample from both sides of middle
    let leftIdx = middleStart;
    let rightIdx = middleStart + 1;

    while (middleTokens < middleTokenTarget && (leftIdx >= 0 || rightIdx < total)) {
        // Alternate between left and right
        if (leftIdx >= 0) {
            const msg = messages[leftIdx];
            const tokens = estimateTokens(msg);
            if (middleTokens + tokens <= middleTokenTarget) {
                middleMessages.unshift(msg);
                middleTokens += tokens;
            }
            leftIdx--;
        }

        if (rightIdx < total && middleTokens < middleTokenTarget) {
            const msg = messages[rightIdx];
            const tokens = estimateTokens(msg);
            if (middleTokens + tokens <= middleTokenTarget) {
                middleMessages.push(msg);
                middleTokens += tokens;
            }
            rightIdx++;
        }
    }

    // 4. Distributed sampling from remaining messages
    const usedIndices = new Set<number>();

    // Mark used indices
    for (let i = 0; i < beginningMessages.length; i++) {
        const idx = messages.indexOf(beginningMessages[i]);
        if (idx !== -1) usedIndices.add(idx);
    }
    for (let i = 0; i < recentMessages.length; i++) {
        const idx = messages.lastIndexOf(recentMessages[i]);
        if (idx !== -1) usedIndices.add(idx);
    }

    const availableMessages = messages.filter((_, idx) => !usedIndices.has(idx));
    const distributedMessages: ParsedMessage[] = [];
    let distributedTokens = 0;

    // Sample evenly distributed
    const step = Math.max(1, Math.floor(availableMessages.length / 1000));
    for (let i = 0; i < availableMessages.length && distributedTokens < distributedTokenTarget; i += step) {
        const msg = availableMessages[i];
        const tokens = estimateTokens(msg);
        if (distributedTokens + tokens <= distributedTokenTarget) {
            distributedMessages.push(msg);
            distributedTokens += tokens;
        }
    }

    // Combine and sort chronologically
    const finalMessages = [
        ...beginningMessages,
        ...middleMessages,
        ...distributedMessages,
        ...recentMessages
    ].sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const finalTokens = calculateTotalTokens(finalMessages);

    const samplingInfo = `Muestreo inteligente basado en tokens:\n• ${recentMessages.length.toLocaleString()} mensajes recientes (~${recentTokens.toLocaleString()} tokens)\n• ${beginningMessages.length.toLocaleString()} del inicio (~${beginningTokens.toLocaleString()} tokens)\n• ${middleMessages.length.toLocaleString()} del período medio (~${middleTokens.toLocaleString()} tokens)\n• ${distributedMessages.length.toLocaleString()} distribuidos (~${distributedTokens.toLocaleString()} tokens)\n\nTotal: ${finalMessages.length.toLocaleString()} mensajes (~${finalTokens.toLocaleString()} tokens)`;

    console.log('[Sampling] Token-based sampling complete:', {
        totalMessages: finalMessages.length,
        totalTokens: finalTokens,
        breakdown: {
            recent: { messages: recentMessages.length, tokens: recentTokens },
            beginning: { messages: beginningMessages.length, tokens: beginningTokens },
            middle: { messages: middleMessages.length, tokens: middleTokens },
            distributed: { messages: distributedMessages.length, tokens: distributedTokens }
        }
    });

    return {
        messages: finalMessages,
        wasLimited: true,
        samplingInfo
    };
}
