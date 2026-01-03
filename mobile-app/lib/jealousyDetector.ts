/**
 * JEALOUSY DETECTOR
 * Feature #5: Detects names that triggered jealousy
 */

import type { ParsedMessage } from './exSimulator';

export interface JealousyTrigger {
    name: string;
    context: string;
    conflictCount: number;
    examples: string[];
}

/**
 * Detect jealousy triggers using AI
 */
export async function detectJealousyTriggers(
    messages: ParsedMessage[],
    exName: string,
    exSenderName: string,
    model: any
): Promise<JealousyTrigger[]> {
    // Filter messages with negative sentiment and person names
    const suspiciousMessages = messages.filter(m => {
        const hasJealousyWords = /celoso|celos|amigo|amiga|salir|fiesta|otro|otra|ex|preocupa/i.test(m.content);
        const hasQuestions = /quién|con quién|dónde|qué hiciste/i.test(m.content);
        return hasJealousyWords || hasQuestions;
    }).slice(0, 300);

    if (suspiciousMessages.length < 5) {
        return [];
    }

    const chatText = suspiciousMessages
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');

    const prompt = `Analiza este chat y detecta NOMBRES de personas que causaban CELOS o CONFLICTOS.

CHAT:
${chatText.slice(0, 10000)}

Busca nombres de:
- Amigos/as que generaban inseguridad
- Ex parejas mencionadas
- Compañeros/as de trabajo
- Personas con las que ${exName} se ponía celoso/a

Responde en formato JSON:
{
  "triggers": [
    {
      "name": "Nombre de la persona",
      "context": "relación (amigo, ex, compañera de trabajo, etc)",
      "conflictCount": número_de_veces_mencionado_en_conflicto,
      "examples": ["ejemplo de reacción celosa 1", "ejemplo 2"]
    }
  ]
}

REGLAS:
- Solo incluir personas mencionadas en contexto de celos/conflicto
- NO incluir familiares cercanos (mamá, papá, hermano)
- conflictCount: aproximado basado en frecuencia
- Máximo 5 personas

Responde SOLO con el JSON.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);

        if (!data.triggers || !Array.isArray(data.triggers)) {
            return [];
        }

        const triggers: JealousyTrigger[] = data.triggers.map((item: any) => ({
            name: item.name || '',
            context: item.context || 'desconocido',
            conflictCount: typeof item.conflictCount === 'number' ? item.conflictCount : 1,
            examples: Array.isArray(item.examples) ? item.examples.slice(0, 2) : []
        }));

        console.log('[JealousyDetector] Found', triggers.length, 'jealousy triggers');
        return triggers;

    } catch (error) {
        console.error('[JealousyDetector] Failed:', error);
        return [];
    }
}

/**
 * Check if user message mentions a jealousy trigger
 */
export function checkJealousyTrigger(
    userMessage: string,
    jealousyTriggers: JealousyTrigger[]
): JealousyTrigger | null {
    if (!jealousyTriggers || jealousyTriggers.length === 0) {
        return null;
    }

    const messageLower = userMessage.toLowerCase();

    for (const trigger of jealousyTriggers) {
        const nameLower = trigger.name.toLowerCase();

        // Check for exact name or partial match
        if (messageLower.includes(nameLower)) {
            return trigger;
        }

        // Check for first name only (if it's a full name)
        const firstName = nameLower.split(' ')[0];
        if (firstName.length > 2 && messageLower.includes(firstName)) {
            return trigger;
        }
    }

    return null;
}
