/**
 * TOP CONFLICTS DETECTOR
 * Feature #7: Identifies recurring conflict topics
 */

import type { ParsedMessage } from './exSimulator';

export interface TopConflict {
    topic: string;
    occurrences: number;
    severity: number;
    examples: string[];
}

import { generateAIResponse } from './gemini';

export interface TopConflict {
    topic: string;
    occurrences: number;
    severity: number;
    examples: string[];
}

/**
 * Detect top 5 recurring conflicts using AI
 */
export async function detectTopConflicts(
    messages: ParsedMessage[],
    exName: string
): Promise<TopConflict[]> {
    // Filter messages that look like conflicts
    const conflictMessages = messages.filter(m => {
        const hasConflictWords = /pero|nunca|siempre|Harto|molesta|problema|culpa|discutir|pelea/i.test(m.content);
        const hasNegativeWords = /no|nunca|mal|odio|fastidio|cansa/i.test(m.content);
        const isLong = m.content.length > 80;
        return (hasConflictWords || hasNegativeWords) && isLong;
    }).slice(0, 400);

    if (conflictMessages.length < 10) {
        return [];
    }

    const chatText = conflictMessages
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');

    const prompt = `Analiza este chat e identifica los 5 TEMAS MÁS RECURRENTES de CONFLICTOS o DISCUSIONES.

CHAT:
${chatText.slice(0, 12000)}

Identifica patrones de conflicto repetitivos. Busca temas como:
- Tiempo (no pasar suficiente tiempo juntos, horarios)
- Celos (inseguridad, terceros)
- Familia (problemas con familia de alguno)
- Dinero (gastos, responsabilidades económicas)
- Comunicación (falta de comunicación, malentendidos)
- Hábitos (cosas que molestan del otro)
- Futuro (planes a futuro, compromiso)
- Amigos (salidas, prioridades)

Responde en formato JSON:
{
  "conflicts": [
    {
      "topic": "nombre del tema",
      "occurrences": número_aproximado_de_veces,
      "severity": 1-10,
      "examples": ["cita textual 1", "cita 2"]
    }
  ]
}

REGLAS:
- Solo los 5 temas MÁS frecuentes
- occurrences: cuenta aproximada de cuántas veces se discutió
- severity: 10 = conflicto muy grave, 1 = molestia menor
- examples: máximo 2 citas textuales cortas

Responde SOLO con el JSON.`;

    try {
        const response = await generateAIResponse(prompt);

        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);

        if (!data.conflicts || !Array.isArray(data.conflicts)) {
            return [];
        }

        const conflicts: TopConflict[] = data.conflicts
            .slice(0, 5) // Maximum 5
            .map((item: any) => ({
                topic: item.topic || '',
                occurrences: typeof item.occurrences === 'number' ? item.occurrences : 1,
                severity: typeof item.severity === 'number' ? Math.min(10, Math.max(1, item.severity)) : 5,
                examples: Array.isArray(item.examples) ? item.examples.slice(0, 2) : []
            }));

        console.log('[TopConflicts] Found', conflicts.length, 'recurring conflicts');
        return conflicts;

    } catch (error) {
        console.error('[TopConflicts] Failed:', error);
        return [];
    }
}
