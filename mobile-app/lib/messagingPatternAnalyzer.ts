/**
 * MESSAGING PATTERN ANALYZER
 * Feature #2: Detects if person sends "metralleta" (bursts) or "biblia" (long messages)
 */

import type { ParsedMessage } from './exSimulator';

export interface MessagingPattern {
    avgMessagesPerBurst: number;
    burstFrequency: number;
    avgMessageLength: number;
    style: 'metralleta' | 'biblia' | 'balanceado';
    examplesShort?: string[];
    examplesLong?: string[];
}

/**
 * Analyze messaging pattern from messages
 */
export function detectMessagingPattern(
    messages: ParsedMessage[],
    exSenderName: string
): MessagingPattern {
    const exMessages = messages.filter(m => m.sender === exSenderName);

    if (exMessages.length === 0) {
        return {
            avgMessagesPerBurst: 1,
            burstFrequency: 0,
            avgMessageLength: 50,
            style: 'balanceado'
        };
    }

    // 1. Calculate average message length
    const totalLength = exMessages.reduce((sum, m) => sum + m.content.length, 0);
    const avgMessageLength = totalLength / exMessages.length;

    // 2. Detect bursts (consecutive messages within 2 minutes)
    const bursts: ParsedMessage[][] = [];
    let currentBurst: ParsedMessage[] = [exMessages[0]];

    for (let i = 1; i < exMessages.length; i++) {
        const prev = exMessages[i - 1];
        const curr = exMessages[i];

        // Check if timestamps are within 2 minutes
        const timeDiff = curr.timestamp && prev.timestamp
            ? new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()
            : 0;

        if (timeDiff > 0 && timeDiff < 2 * 60 * 1000) { // 2 minutes
            currentBurst.push(curr);
        } else {
            if (currentBurst.length > 1) {
                bursts.push(currentBurst);
            }
            currentBurst = [curr];
        }
    }

    if (currentBurst.length > 1) {
        bursts.push(currentBurst);
    }

    // 3. Calculate metrics
    const avgMessagesPerBurst = bursts.length > 0
        ? bursts.reduce((sum, b) => sum + b.length, 0) / bursts.length
        : 1;

    const burstFrequency = bursts.length / exMessages.length;

    // 4. Determine style
    let style: 'metralleta' | 'biblia' | 'balanceado';

    if (avgMessagesPerBurst > 3 && avgMessageLength < 50) {
        style = 'metralleta'; // Many short messages
    } else if (avgMessagesPerBurst < 2 && avgMessageLength > 150) {
        style = 'biblia'; // Few long messages
    } else {
        style = 'balanceado';
    }

    // 5. Get examples
    const shortMessages = exMessages
        .filter(m => m.content.length < 30)
        .slice(0, 5)
        .map(m => m.content);

    const longMessages = exMessages
        .filter(m => m.content.length > 100)
        .slice(0, 3)
        .map(m => m.content);

    return {
        avgMessagesPerBurst: Number(avgMessagesPerBurst.toFixed(1)),
        burstFrequency: Number(burstFrequency.toFixed(2)),
        avgMessageLength: Math.round(avgMessageLength),
        style,
        examplesShort: shortMessages,
        examplesLong: longMessages
    };
}
