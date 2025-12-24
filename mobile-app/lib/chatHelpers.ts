/**
 * Helper functions for realistic chat simulation
 */

export interface MessageFragment {
    text: string;
    delay: number; // milliseconds to wait before sending this fragment
}

/**
 * Split a long response into multiple natural message fragments
 * Mimics how people actually type in WhatsApp (several short messages)
 */
export function fragmentMessage(text: string, attachmentStyle: string): MessageFragment[] {
    // If message is already short, don't fragment
    if (text.length < 50) {
        return [{ text, delay: 0 }];
    }

    const fragments: MessageFragment[] = [];

    // Split by sentence endings
    const sentences = text.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);

    // If only one sentence, try to split by clauses
    if (sentences.length <= 1) {
        const clauses = text.split(/([,;]\s+)/).filter(s => s.trim().length > 0);

        // Group clauses into fragments
        let current = '';
        for (let i = 0; i < clauses.length; i++) {
            current += clauses[i];

            // Send fragment if it's long enough or it's the last one
            if (current.length >= 40 || i === clauses.length - 1) {
                if (current.trim()) {
                    fragments.push({
                        text: current.trim(),
                        delay: calculateFragmentDelay(current, attachmentStyle)
                    });
                }
                current = '';
            }
        }
    } else {
        // Group sentences into fragments (max 2 sentences per fragment)
        let current = '';
        for (let i = 0; i < sentences.length; i++) {
            current += sentences[i];

            // Send every 1-2 sentences
            if (current.length >= 60 || i === sentences.length - 1) {
                if (current.trim()) {
                    fragments.push({
                        text: current.trim(),
                        delay: calculateFragmentDelay(current, attachmentStyle)
                    });
                }
                current = '';
            }
        }
    }

    // Ensure we have at least one fragment
    if (fragments.length === 0) {
        fragments.push({ text, delay: 0 });
    }

    return fragments;
}

/**
 * Calculate realistic delay between message fragments
 */
function calculateFragmentDelay(text: string, attachmentStyle: string): number {
    const baseDelay = 800;  // Base typing time
    const textDelay = text.length * 30;  // ~30ms per character

    let multiplier = 1;

    // Attachment style affects typing speed
    switch (attachmentStyle) {
        case 'ansioso':
            multiplier = 0.6;  // Types faster (anxious)
            break;
        case 'evitativo':
            multiplier = 1.8;  // Types slower (avoidant, thinks more)
            break;
        case 'seguro':
            multiplier = 1.0;  // Normal speed
            break;
        default:
            multiplier = 1.2;
    }

    // Add some randomness (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4);

    const totalDelay = (baseDelay + textDelay) * multiplier * randomFactor;

    // Cap delays (min 500ms, max 4000ms)
    return Math.max(500, Math.min(totalDelay, 4000));
}

/**
 * Calculate delay before ex starts typing (initial response delay)
 */
export function calculateInitialDelay(
    userMessage: string,
    attachmentStyle: string,
    emotionalTone: string
): number {
    // Check if message is emotional/intense
    const emotionalKeywords = [
        'te amo', 'te extraño', 'te necesito', 'perdón', 'lo siento',
        'volver', 'otra oportunidad', 'error', 'equivoqué'
    ];

    const isEmotional = emotionalKeywords.some(keyword =>
        userMessage.toLowerCase().includes(keyword)
    );

    let baseDelay = 2000;  // 2 seconds default

    // Attachment style dramatically affects initial delay
    if (attachmentStyle === 'ansioso') {
        baseDelay = 800;  // Responds quickly
    } else if (attachmentStyle === 'evitativo') {
        baseDelay = isEmotional ? 6000 : 3000;  // Much slower, especially for emotional msgs
    } else if (attachmentStyle === 'seguro') {
        baseDelay = 1500;  // Moderate, consistent
    }

    // Emotional tone also affects
    if (emotionalTone === 'fría' && isEmotional) {
        baseDelay *= 1.5;  // Takes longer when cold and message is emotional
    }

    // Add randomness (±30%)
    const randomFactor = 0.7 + (Math.random() * 0.6);

    return Math.floor(baseDelay * randomFactor);
}

/**
 * Build enhanced system prompt with REAL message examples
 */
export function buildEnhancedPrompt(
    profileData: any,
    userName: string,
    userMessage: string,
    conversationHistory: any[]
): string {
    const profile = profileData.profile;
    const samples = profileData.messageSamples;

    // Select 20-30 random examples from ex's messages
    const exampleCount = 25;
    const exExamples = samples?.exMessages
        ? selectRandomSamples(samples.exMessages, exampleCount)
        : [];

    // Select 2-3 conversation examples
    const convExamples = samples?.conversations?.slice(0, 3) || [];

    const examplesSection = exExamples.length > 0 ? `
═══════════════════════════════════════════════════════════════
EJEMPLOS REALES DE CÓMO ESCRIBÍAS (imita este estilo EXACTO):
═══════════════════════════════════════════════════════════════

${exExamples.map((msg, i) => `Ejemplo ${i + 1}: "${msg}"`).join('\n')}

OBSERVA en estos ejemplos:
- Tu longitud típica de mensaje: ${samples?.avgMessageLength || 30} caracteres
- Tus emojis favoritos: ${(profile.commonEmojis || samples?.commonEmojis || []).join(' ')}
- Cuándo usas mayúsculas vs minúsculas
- Tu puntuación y estilo de escritura
- Tus expresiones únicas

═══════════════════════════════════════════════════════════════
CONVERSACIONES REALES DE EJEMPLO:
═══════════════════════════════════════════════════════════════

${convExamples.map((conv, i) => `
[${conv.context}]
${conv.messages.map(m => `${m.sender === 'user' ? userName : profileData.exName}: ${m.text}`).join('\n')}
`).join('\n---\n')}

INSTRUCCION CRITICA: Responde EXACTAMENTE como lo harías tú en WhatsApp real.
- Mensajes cortos (1-3 líneas típicamente, como en tus ejemplos)
- Usa tus expresiones y emojis característicos
- Mantén TU estilo de puntuación y capitalización
- NO seas formal ni escribas párrafos largos
` : '';

    const contextHistory = conversationHistory
        .slice(-6)
        .map(m => `${m.role === 'user' ? userName : profileData.exName}: ${m.content}`)
        .join('\n');

    return `IDENTIDAD Y CONTEXTO:
Eres ${profileData.exName}, ex pareja de ${userName}. La relación ya terminó.

PERSONALIDAD:
- Estilo de comunicación: ${profile.communicationStyle || 'mixta'}
- Tipo de apego: ${profile.attachmentStyle || 'seguro'}
- Tono emocional: ${profile.emotionalTone || 'variable'}

${examplesSection}

═══════════════════════════════════════════════════════════════
CONTEXTO CONVERSACIONAL RECIENTE:
═══════════════════════════════════════════════════════════════

${contextHistory}

═══════════════════════════════════════════════════════════════

MENSAJE ACTUAL DE ${userName}: "${userMessage}"

AHORA RESPONDE COMO ${profileData.exName} (natural, corto, auténtico como en tus ejemplos):`;
}

/**
 * Select random samples from array
 */
function selectRandomSamples(array: string[], count: number): string[] {
    if (array.length <= count) return array;

    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
