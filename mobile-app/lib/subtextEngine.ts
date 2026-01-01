/**
 * subtextEngine.ts
 * 
 * Maneja el subtexto: lo que NO se dice pero se comunica.
 * intención real ≠ texto literal
 */

// ============= TYPES =============

export interface SubtextAnalysis {
    literal: string;
    intended: string;
    hiddenEmotion?: string;
    avoidanceTopic?: string;
}

export interface ResponseSubtext {
    text: string;
    hasSubtext: boolean;
    subtextType?: 'hidden_anger' | 'masked_hurt' | 'fake_indifference' | 'passive_aggressive' | 'testing';
}

// ============= SUBTEXTO EN MENSAJES RECIBIDOS =============

/**
 * Analiza el subtexto de un mensaje del usuario
 */
export function analyzeMessageSubtext(
    message: string,
    recentContext: string[]
): SubtextAnalysis {
    const messageLower = message.toLowerCase();

    // Detectar respuestas neutras que esconden molestia
    const neutralButAngry = [
        { pattern: 'está bien', intended: 'No está bien pero no quiero discutir' },
        { pattern: 'como quieras', intended: 'Estoy molesto/a' },
        { pattern: 'haz lo que quieras', intended: 'Me importa pero pretendo que no' },
        { pattern: 'no pasa nada', intended: 'Sí pasa algo' },
        { pattern: 'da igual', intended: 'No me da igual' },
        { pattern: 'ok.', intended: 'Estoy cortante a propósito' }
    ];

    for (const check of neutralButAngry) {
        if (messageLower.includes(check.pattern)) {
            return {
                literal: message,
                intended: check.intended,
                hiddenEmotion: 'anger'
            };
        }
    }

    // Cambios de tema para evitar algo
    const topicChangePatterns = [
        'bueno, y tú',
        'oye, cambiando de tema',
        'pero bueno,',
        'en fin',
        'anyway'
    ];

    for (const pattern of topicChangePatterns) {
        if (messageLower.includes(pattern)) {
            return {
                literal: message,
                intended: 'Quiero evitar este tema',
                avoidanceTopic: extractAvoidedTopic(recentContext)
            };
        }
    }

    // Sin subtexto detectado
    return {
        literal: message,
        intended: message
    };
}

function extractAvoidedTopic(recentContext: string[]): string {
    // Simple: el tema evitado es lo último que se habló
    if (recentContext.length > 0) {
        const lastMessage = recentContext[recentContext.length - 1];
        // Extraer keywords
        const words = lastMessage.toLowerCase().split(' ');
        const keywords = words.filter(w => w.length > 4);
        return keywords[0] || 'tema anterior';
    }
    return 'tema sensible';
}

// ============= SUBTEXTO EN RESPUESTAS =============

/**
 * Agrega subtexto a una respuesta según emoción oculta
 */
export function addSubtextToResponse(
    response: string,
    hiddenEmotion: string | undefined,
    intensity: number
): ResponseSubtext {
    if (!hiddenEmotion || intensity < 0.3) {
        return { text: response, hasSubtext: false };
    }

    // Modificar según emoción oculta
    switch (hiddenEmotion) {
        case 'anger':
            return addHiddenAnger(response, intensity);
        case 'hurt':
            return addMaskedHurt(response, intensity);
        case 'jealousy':
            return addFakeIndifference(response, intensity);
        default:
            return { text: response, hasSubtext: false };
    }
}

function addHiddenAnger(response: string, intensity: number): ResponseSubtext {
    // Sutilezas de enojo oculto
    const modifiers = [
        // Acortar y poner punto final
        (r: string) => r.replace(/!+$/, '.'),
        // Quitar emojis cariñosos
        (r: string) => r.replace(/[❤️💕😘🥰💖]/g, ''),
        // Agregar "bueno" distante
        (r: string) => 'Bueno, ' + r.toLowerCase()
    ];

    const modifier = modifiers[Math.floor(intensity * modifiers.length)];
    return {
        text: modifier(response),
        hasSubtext: true,
        subtextType: 'hidden_anger'
    };
}

function addMaskedHurt(response: string, intensity: number): ResponseSubtext {
    // Pretender que no duele
    const suffixes = [
        ' jaja',
        ' pero bueno',
        ', no importa',
        ' en fin'
    ];

    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return {
        text: response + suffix,
        hasSubtext: true,
        subtextType: 'masked_hurt'
    };
}

function addFakeIndifference(response: string, intensity: number): ResponseSubtext {
    // Fingir que no importa
    const prefixes = [
        'Ah, ',
        'Mm, ',
        'Ps ',
        'Ah ok, '
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    // Quitar signos de exclamación (demasiado entusiasta)
    const cooledResponse = response.replace(/!/g, '.');

    return {
        text: prefix + cooledResponse.toLowerCase(),
        hasSubtext: true,
        subtextType: 'fake_indifference'
    };
}

// ============= SILENCIOS ESTRATÉGICOS =============

/**
 * Determina si debería haber un "silencio" (no responder o tardar)
 */
export function shouldStrategicSilence(
    userMessage: string,
    currentEmotion: string,
    emotionIntensity: number
): { silence: boolean; durationMinutes: number; reason: string } {
    const messageLower = userMessage.toLowerCase();

    // Preguntas que no se quieren responder
    const avoidQuestions = [
        'con quién estás',
        'dónde estás',
        'qué haces',
        'por qué no contestas',
        'me ignoras'
    ];

    for (const question of avoidQuestions) {
        if (messageLower.includes(question) && currentEmotion === 'annoyed') {
            return {
                silence: true,
                durationMinutes: 15 + Math.floor(Math.random() * 30),
                reason: 'avoiding_question'
            };
        }
    }

    // Cuando está muy herido/a - silencio como castigo
    if ((currentEmotion === 'hurt' || currentEmotion === 'angry') && emotionIntensity > 0.7) {
        return {
            silence: Math.random() < 0.4,
            durationMinutes: 30 + Math.floor(Math.random() * 60),
            reason: 'emotional_withdrawal'
        };
    }

    return { silence: false, durationMinutes: 0, reason: '' };
}

// ============= DOBLE INTENCIÓN =============

/**
 * Mensajes con doble intención
 */
export function detectDoubleIntention(message: string): {
    hasDouble: boolean;
    surface: string;
    hidden: string;
} {
    const doubleIntentionPatterns = [
        {
            pattern: /qué tal.*\?/i,
            surface: 'Pregunta casual',
            hidden: 'Quiero saber qué haces/con quién estás'
        },
        {
            pattern: /cómo estuvo.*\?/i,
            surface: 'Pregunta sobre el evento',
            hidden: 'Quiero saber si pensaste en mí'
        },
        {
            pattern: /sales mucho últimamente/i,
            surface: 'Observación',
            hidden: 'Me molesta que salgas tanto'
        },
        {
            pattern: /ya casi no hablamos/i,
            surface: 'Observación',
            hidden: 'Te estoy reclamando'
        }
    ];

    for (const check of doubleIntentionPatterns) {
        if (check.pattern.test(message)) {
            return {
                hasDouble: true,
                surface: check.surface,
                hidden: check.hidden
            };
        }
    }

    return { hasDouble: false, surface: message, hidden: message };
}
