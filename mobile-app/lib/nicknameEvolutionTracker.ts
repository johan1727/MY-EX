/**
 * NICKNAME EVOLUTION TRACKER
 * Feature #6: Tracks how pet names changed during relationship
 */

import type { ParsedMessage } from './exSimulator';

export interface NicknameEvolution {
    nickname: string;
    startPeriod: string;
    endPeriod: string;
    phase: 'honeymoon' | 'stable' | 'crisis' | 'breakup';
    frequency: number;
}

import { generateAIResponse } from './gemini';

export interface NicknameEvolution {
    nickname: string;
    startPeriod: string;
    endPeriod: string;
    phase: 'honeymoon' | 'stable' | 'crisis' | 'breakup';
    frequency: number;
}

/**
 * Detect nickname evolution using AI
 */
export async function detectNicknameEvolution(
    messages: ParsedMessage[],
    exName: string
): Promise<NicknameEvolution[]> {
    // Split messages into time periods
    const totalMessages = messages.length;
    const third = Math.floor(totalMessages / 3);

    const earlyMessages = messages.slice(0, third);
    const middleMessages = messages.slice(third, third * 2);
    const lateMessages = messages.slice(third * 2);

    const periods = [
        { name: 'início', msgs: earlyMessages },
        { name: 'medio', msgs: middleMessages },
        { name: 'final', msgs: lateMessages }
    ];

    // Extract sample messages for analysis
    const sampleTexts = periods.map(p => ({
        period: p.name,
        text: p.msgs.slice(0, 200).map(m => `${m.sender}: ${m.content}`).join('\n')
    }));

    const prompt = `Analiza cómo evolucionaron los APODOS/NOMBRES CARIÑOSOS en esta relación a lo largo del tiempo.

INICIO DE LA RELACIÓN:
${sampleTexts[0].text.slice(0, 3000)}

MEDIO DE LA RELACIÓN:
${sampleTexts[1].text.slice(0, 3000)}

FINAL DE LA RELACIÓN:
${sampleTexts[2].text.slice(0, 3000)}

Identifica cómo cambiaron los apodos/formas de referirse. Busca:
- Apodos cariñosos ("mi amor", "bebé", "amor", "bb", "nena")
- Diminutivos del nombre
- Formalidad (nombre completo vs apodo)

Responde en formato JSON:
{
  "evolution": [
    {
      "nickname": "apodo usado",
      "startPeriod": "início/medio/final",
      "endPeriod": "meio/final/actual",
      "phase": "honeymoon/stable/crisis/breakup",
      "frequency": 1-10
    }
  ]
}

REGLAS:
- Detecta el CAMBIO (ej: de "mi amor" → solo el nombre)
- phase: honeymoon = apodos muy cariñosos, breakup = solo nombre o nada
- frequency: qué tan seguido se usaba
- Ordena cronológicamente

Responde SOLO con el JSON.`;

    try {
        const response = await generateAIResponse(prompt);

        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);

        if (!data.evolution || !Array.isArray(data.evolution)) {
            return [];
        }

        const evolution: NicknameEvolution[] = data.evolution.map((item: any) => ({
            nickname: item.nickname || '',
            startPeriod: item.startPeriod || 'início',
            endPeriod: item.endPeriod || 'final',
            phase: ['honeymoon', 'stable', 'crisis', 'breakup'].includes(item.phase)
                ? item.phase
                : 'stable',
            frequency: typeof item.frequency === 'number' ? item.frequency : 5
        }));

        console.log('[NicknameEvolution] Detected', evolution.length, 'nickname changes');
        return evolution;

    } catch (error) {
        console.error('[NicknameEvolution] Failed:', error);
        return [];
    }
}

/**
 * Get current phase nickname based on user selection
 */
export function getNicknameForPhase(
    phase: 'honeymoon' | 'stable' | 'crisis' | 'breakup',
    nicknameEvolution: NicknameEvolution[],
    exName: string
): string {
    if (!nicknameEvolution || nicknameEvolution.length === 0) {
        return exName;
    }

    // Find nickname that matches the selected phase
    const matchingNickname = nicknameEvolution.find(n => n.phase === phase);

    if (matchingNickname) {
        return matchingNickname.nickname;
    }

    // Fallback: return most appropriate based on phase
    if (phase === 'honeymoon') {
        // Return most affectionate nickname
        return nicknameEvolution.sort((a, b) => b.frequency - a.frequency)[0]?.nickname || exName;
    } else if (phase === 'breakup') {
        // Return formal name or least affectionate
        return nicknameEvolution.sort((a, b) => a.frequency - b.frequency)[0]?.nickname || exName;
    }

    return exName;
}
