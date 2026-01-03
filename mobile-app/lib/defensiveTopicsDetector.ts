/**
 * DEFENSIVE TOPICS DETECTOR
 * Feature #4: Detects topics where person became defensive
 */

import type { ParsedMessage } from './exSimulator';

export interface DefensiveTopic {
    topic: string;
    examples: string[];
    intensity: number; // 1-10
    triggerWords: string[];
}

/**
 * Detect defensive topics using AI
 */
export async function detectDefensiveTopics(
    messages: ParsedMessage[],
    exName: string,
    exSenderName: string,
    model: any
): Promise<DefensiveTopic[]> {
    // Sample conversations where conflict arose
    const conflictMessages = messages.filter(m => {
        const hasNegativeWords = /pero|no|nunca|siempre|culpa|problema|molesta|fastidio/i.test(m.content);
        const isLong = m.content.length > 100;
        return hasNegativeWords || isLong;
    }).slice(0, 500); // Limit sample

    if (conflictMessages.length < 10) {
        return [];
    }

    const chatText = conflictMessages
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');

    const prompt = `Analiza este chat y detecta temas donde ${exName} se ponía DEFENSIVO/A o contraatacaba.

CHAT:
${chatText.slice(0, 12000)}

Identifica temas que causaban defensividad. Busca patrones donde ${exName}:
- Cambia de tema bruscamente
- Contraataca ("y tú qué?", "tú también...")
- Se justifica excesivamente
- Niega o minimiza
- Culpa a otros

Responde en formato JSON:
{
  "topics": [
    {
      "topic": "nombre del tema",
      "examples": ["ejemplo de respuesta defensiva 1", "ejemplo 2"],
      "intensity": 1-10,
      "triggerWords": ["palabras", "que", "activan", "defensividad"]
    }
  ]
}

REGLAS:
- Solo temas mencionados 3+ veces
- intensity: qué tan defensivo/a se ponía (10 = muy defensivo)
- triggerWords: palabras específicas que causaban la reacción
- Máximo 5 temas

Responde SOLO con el JSON.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);

        if (!data.topics || !Array.isArray(data.topics)) {
            return [];
        }

        const topics: DefensiveTopic[] = data.topics.map((item: any) => ({
            topic: item.topic || '',
            examples: Array.isArray(item.examples) ? item.examples.slice(0, 3) : [],
            intensity: typeof item.intensity === 'number' ? item.intensity : 5,
            triggerWords: Array.isArray(item.triggerWords) ? item.triggerWords : []
        }));

        console.log('[DefensiveDetector] Found', topics.length, 'defensive topics');
        return topics;

    } catch (error) {
        console.error('[DefensiveDetector] Failed:', error);
        return [];
    }
}

/**
 * Check if user message touches a defensive topic
 */
export function checkDefensiveTrigger(
    userMessage: string,
    defensiveTopics: DefensiveTopic[]
): DefensiveTopic | null {
    if (!defensiveTopics || defensiveTopics.length === 0) {
        return null;
    }

    const messageLower = userMessage.toLowerCase();

    // Check each topic for trigger words
    for (const topic of defensiveTopics) {
        const hasTopicWord = topic.topic.toLowerCase().split(' ').some(word =>
            messageLower.includes(word)
        );

        const hasTriggerWord = topic.triggerWords.some(trigger =>
            messageLower.includes(trigger.toLowerCase())
        );

        if (hasTopicWord || hasTriggerWord) {
            return topic;
        }
    }

    return null;
}
