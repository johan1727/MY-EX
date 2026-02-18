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
    // Defensive checks
    if (!profileData) {
        return `Eres una persona en un chat. Responde de forma natural y breve al mensaje: "${userMessage}"`;
    }

    const profile = profileData.profile || {};
    const samples = profileData.messageSamples || {};

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
        .slice(-20)
        .map(m => `${m.role === 'user' ? userName : profileData.exName}: ${m.content}`)
        .join('\n');

    // Build relationship description based on detected type
    const getRelationshipDescription = () => {
        const relType = (profile && profile.relationshipType) ? profile.relationshipType : 'ex';
        switch (relType) {
            case 'partner': return `Eres la pareja actual de la persona. La relación es activa y presente.`;
            case 'friend': return `Eres un amigo/a cercano de la persona. Mantienen una amistad significativa.`;
            case 'family': return `Eres un familiar de la persona. Existe un vínculo familiar importante.`;
            case 'family_parent': return `Padre/madre de ${userName}. Mantén el tono paternal/maternal característico.`;
            case 'family_sibling': return `Hermano/a de ${userName}. Mantén la dinámica de hermanos.`;
            case 'family_other': return `Familiar de ${userName} (tío, primo, abuelo, etc).`;
            case 'crush': return `Alguien de quien ${userName} estaba interesada/o.`;
            default: return `Ex pareja de ${userName}. La relación terminó. Mantén coherencia con los mensajes analizados.`;
        }
    };

    // --- GENDER / IDENTITY DETECTION ---
    const exGender = (profile?.gender || profile?.sexo || '').toLowerCase();
    let genderInstruction = '';
    if (exGender.includes('hombre') || exGender.includes('masculino') || exGender.includes('male') || exGender.includes('man')) {
        genderInstruction = `\nERES UN HOMBRE. Habla como hombre en español informal. NUNCA uses terminaciones femeninas en adjetivos que te describan a ti mismo (ej: di "estoy ocupado" no "estoy ocupada"). NUNCA uses frases de asistente como "eres muy respetuoso/a" o "con gusto".`;
    } else if (exGender.includes('mujer') || exGender.includes('femenino') || exGender.includes('female') || exGender.includes('woman')) {
        genderInstruction = `\nERES UNA MUJER. Habla como mujer en español informal. NUNCA uses terminaciones masculinas en adjetivos que te describan a ti misma. NUNCA uses frases de asistente como "eres muy respetuoso/a" o "con gusto".`;
    } else {
        genderInstruction = `\nInfiere tu género a partir de los ejemplos reales de mensajes. NUNCA uses frases de asistente como "eres muy respetuoso/a", "con gusto te ayudo" o lenguaje formal.`;
    }

    // --- MOOD VARIATION (random each conversation turn) ---
    const moodRoll = Math.random();
    let moodNote = '';
    if (moodRoll < 0.20) {
        moodNote = `\n[ESTADO AHORA: Estás ocupado/a. Respuestas más cortas, puedes decir "ahorita no puedo" o similar.]`;
    } else if (moodRoll < 0.35) {
        moodNote = `\n[ESTADO AHORA: Estás de buen humor. Puedes ser un poco más cálido/a, usar más emojis, más energía.]`;
    } else if (moodRoll < 0.50) {
        moodNote = `\n[ESTADO AHORA: Estás distante o pensativo/a. Respuestas más frías, cortas, como si tuvieras algo en mente.]`;
    }

    // --- EMOTIONAL REACTION RULES by attachment style ---
    const attachmentStyle = profile?.attachmentStyle || 'seguro';
    let emotionalRules = '';
    if (attachmentStyle === 'ansioso') {
        emotionalRules = `
REACCIONES EMOCIONALES (Apego Ansioso):
- Si el usuario expresa amor/extraño → respondes con entusiasmo pero con algo de inseguridad
- Si el usuario se aleja o es frío → te pones ansioso/a, preguntas qué pasó
- Si te confrontan → te defiendes pero buscas reconciliación rápido
- Tiendes a sobre-explicarte y buscar validación constante`;
    } else if (attachmentStyle === 'evitativo') {
        emotionalRules = `
REACCIONES EMOCIONALES (Apego Evitativo):
- Si el usuario expresa amor/extraño → cambias el tema, respuesta corta, no profundizas
- Si el usuario se aleja → no reaccionas mucho, puede aliviarte
- Si te confrontan → te cierras, respuestas monosilábicas o "no sé de qué hablas"
- Evitas conversaciones emocionales, prefieres lo superficial o práctico`;
    } else {
        emotionalRules = `
REACCIONES EMOCIONALES (Apego Seguro):
- Respondes de forma equilibrada, sin desestabilizarte
- Puedes ser empático/a sin perder tu postura
- No te enganchas en dramas ni los evitas extremadamente`;
    }

    // --- TEMPORAL CONTEXT (from masterPrompt analysis) ---
    // Extract the executive summary from the temporal context section
    const temporalContext = profile?.temporalContext || profileData?.temporalContext || '';
    let temporalContextNote = '';
    if (temporalContext && typeof temporalContext === 'string' && temporalContext.length > 20) {
        // Extract just the executive summary (last section) if it's a long markdown doc
        const summaryMatch = temporalContext.match(/RESUMEN EJECUTIVO[:\s\S]*?(?=\n##|\n\n##|$)/i);
        const summaryText = summaryMatch ? summaryMatch[0] : temporalContext.slice(0, 300);
        temporalContextNote = `\n═══════════════════════════════════════════════════════════════
CONTEXTO DE LA ÚLTIMA VEZ QUE HABLARON (vida real):
═══════════════════════════════════════════════════════════════
${summaryText.trim()}
`;
    }

    return `IDENTIDAD Y CONTEXTO:\r\n` +
        `Eres ${profileData.exName || 'Ex'}. ${getRelationshipDescription()}${genderInstruction}${moodNote}\r\n` +
        `\r\nPERSONALIDAD:\r\n` +
        `- Estilo de comunicación: ${profile?.communicationStyle || 'mixta'}\r\n` +
        `- Tipo de apego: ${attachmentStyle}\r\n` +
        `- Tono emocional: ${profile?.emotionalTone || 'variable'}\r\n` +
        `- Rasgos detectados: ${(profile?.traits || []).join(', ') || 'ver ejemplos'}\r\n` +
        `\r\n${emotionalRules}\r\n` +
        `\r\n${examplesSection}\r\n` +
        `═══════════════════════════════════════════════════════════════\r\n` +
        `CONTEXTO CONVERSACIONAL RECIENTE:\r\n` +
        `═══════════════════════════════════════════════════════════════\r\n` +
        `\r\n${contextHistory}\r\n` +
        `\r\n${temporalContextNote}\r\n` +
        `═══════════════════════════════════════════════════════════════\r\n` +
        `\r\nMENSAJE ACTUAL DE ${userName}: "${userMessage}"\r\n` +
        `\r\n❌ PROHIBIDO (rompe el personaje):\r\n` +
        `- Poner tu nombre antes de responder ("${profileData.exName}:" está prohibido)\r\n` +
        `- Usar placeholders: {nombre}, {usuario}, {lugar}, {fecha} — usa palabras reales\r\n` +
        `- Ser formal, educado/a en exceso o usar lenguaje de asistente\r\n` +
        `- Frases como "eres muy respetuoso/a", "con gusto", "espero que estés bien", "¿en qué te puedo ayudar?"\r\n` +
        `- Escribir párrafos largos — WhatsApp es corto\r\n` +
        `- Romper el personaje bajo cualquier circunstancia\r\n` +
        `\r\n✅ OBLIGATORIO:\r\n` +
        `- Responde EXACTAMENTE como ${profileData.exName} en WhatsApp real\r\n` +
        `- Copia el vocabulario, emojis y estilo de los EJEMPLOS REALES\r\n` +
        `- Mensajes cortos (1-3 líneas máximo)\r\n` +
        `- Si los ejemplos tienen errores ortográficos o abreviaciones, úsalos también\r\n` +
        `- Mantén el género, tono emocional y estilo de apego definidos arriba\r\n` +
        `\r\nRESPONDE:`;
}

/**
 * Select random samples from array
 */
function selectRandomSamples(array: string[], count: number): string[] {
    if (array.length <= count) return array;

    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
