// ===============================================
// FILTRADO DE MENSAJES DEL SISTEMA
// ===============================================

/**
 * Filtra mensajes del sistema de WhatsApp (en inglés y español)
 * Incluye: mensajes del sistema, notificaciones, media omitida, etc.
 */
export function cleanSystemMessages(messages: ParsedMessage[]): ParsedMessage[] {
    const systemPhrases = [
        // Español
        'se unió al grupo',
        'te agregó',
        'abandonó',
        'cambió la foto del grupo',
        'cambió la descripción del grupo',
        'cambió el asunto del grupo',
        'mensaje eliminado',
        'mensajes eliminados',
        'imagen omitida',
        'video omitido',
        'audio omitido',
        'GIF omitido',
        'sticker omitido',
        'documento omitido',
        'contacto omitido',
        'ubicación omitida',
        'archivo adjunto omitido',

        // English
        'joined using this group',
        'added you',
        'left',
        'changed the group photo',
        'changed the group description',
        'changed the subject to',
        'this message was deleted',
        'you deleted this message',
        '<media omitted>',
        '<Media omitted>',
        'image omitted',
        'video omitted',
        'audio omitted',
        'GIF omitted',
        'sticker omitted',
        'document omitted',
        'Contact card omitted',
        'location omitted',
        'attached',

        // Números de seguridad
        'número de seguridad',
        'security code',

        // Encriptación
        'los mensajes están cifrados',
        'messages are end-to-end encrypted',
        'end-to-end encrypted',
    ];

    return messages.filter(msg => {
        const lowerContent = msg.content.toLowerCase();

        // Si el mensaje contiene alguna frase del sistema, filtrarlo
        const isSystemMessage = systemPhrases.some(phrase =>
            lowerContent.includes(phrase.toLowerCase())
        );

        // También filtrar si es solo un emoji o muy corto (probablemente ruido)
        const isTooShort = msg.content.trim().length < 2;

        return !isSystemMessage && !isTooShort;
    });
}

// ===============================================
// VALIDACIÓN DE CHAT 1-A-1
// ===============================================

export interface ChatValidationResult {
    valid: boolean;
    error?: string;
    participants?: string[];
    messageCount?: number;
}

/**
 * Valida que el chat sea 1-a-1 (exactamente 2 personas)
 * Detecta si es un chat grupal o individual
 */
export function validateOneOnOneChat(messages: ParsedMessage[]): ChatValidationResult {
    if (!messages || messages.length === 0) {
        return {
            valid: false,
            error: 'No se encontraron mensajes válidos en el archivo. ¿Seguro que es un chat de WhatsApp exportado como texto (.txt)?'
        };
    }

    // Contar participantes únicos
    const uniqueSenders = new Set(messages.map(m => m.sender));
    const participants = Array.from(uniqueSenders);

    if (participants.length < 2) {
        return {
            valid: false,
            error: `Solo se detectó 1 persona (${participants[0]}). Este simulador necesita una conversación entre 2 personas. ¿Exportaste el chat correctamente?`,
            participants,
            messageCount: messages.length
        };
    }

    if (participants.length > 2) {
        return {
            valid: false,
            error: `Se detectaron ${participants.length} personas: ${participants.join(', ')}.\n\n❌ Este simulador SOLO funciona con chats 1-a-1 (dos personas).\n\n💡 Para usar este chat:\n1. Abre WhatsApp\n2. Busca el chat con la persona específica (NO el grupo)\n3. Exporta SOLO ese chat individual\n4. Sube el archivo .txt aquí`,
            participants,
            messageCount: messages.length
        };
    }

    // Validar que haya suficientes mensajes (al menos 50 para un análisis mínimo)
    if (messages.length < 50) {
        return {
            valid: false,
            error: `Solo hay ${messages.length} mensajes.\n\n⚠️ Recomendamos al menos 200-500 mensajes para un análisis preciso.\n\nCon tan pocos mensajes, la IA no puede identificar patrones confiables de personalidad.`,
            participants,
            messageCount: messages.length
        };
    }

    return {
        valid: true,
        participants,
        messageCount: messages.length
    };
}

// ===============================================
// DETECCIÓN AUTOMÁTICA DE IDIOMA
// ===============================================

export type SupportedLanguage = 'es' | 'en' | 'pt';

/**
 * Detecta el idioma predominante en los mensajes
 * Soporta: Español, Inglés, Portugués
 */
export function detectLanguage(messages: ParsedMessage[]): SupportedLanguage {
    // Tomar una muestra de 100 mensajes (o todos si son menos)
    const sample = messages
        .slice(0, Math.min(100, messages.length))
        .map(m => m.content)
        .join(' ')
        .toLowerCase();

    // Palabras comunes en cada idioma
    const spanishWords = ['que', 'como', 'pero', 'para', 'con', 'por', 'una', 'este', 'esta', 'muy'];
    const englishWords = ['the', 'what', 'how', 'but', 'with', 'for', 'this', 'that', 'have', 'very'];
    const portugueseWords = ['que', 'como', 'mas', 'para', 'com', 'por', 'uma', 'este', 'esta', 'muito'];

    let spanishScore = 0;
    let englishScore = 0;
    let portugueseScore = 0;

    spanishWords.forEach(word => {
        const matches = sample.match(new RegExp(`\\b${word}\\b`, 'g'));
        spanishScore += matches ? matches.length : 0;
    });

    englishWords.forEach(word => {
        const matches = sample.match(new RegExp(`\\b${word}\\b`, 'g'));
        englishScore += matches ? matches.length : 0;
    });

    portugueseWords.forEach(word => {
        const matches = sample.match(new RegExp(`\\b${word}\\b`, 'g'));
        portugueseScore += matches ? matches.length : 0;
    });

    // Bonus español: tildes y ñ
    if (sample.match(/[áéíóúñ]/)) {
        spanishScore += 10;
    }

    // Bonus portugués: ç y ã, õ
    if (sample.match(/[çãõ]/)) {
        portugueseScore += 10;
    }

    // Determinar ganador
    if (englishScore > spanishScore && englishScore > portugueseScore) {
        return 'en';
    }
    if (portugueseScore > spanishScore) {
        return 'pt';
    }
    return 'es'; // Default a español
}

// ===============================================
// CACHÉ DE ANÁLISIS PARCIAL (RECOVERY)
// ===============================================

import { storage } from './storage';

export interface AnalysisCache {
    exName: string;
    block1?: any;
    block2?: any;
    block3?: any;
    timestamp: number;
    language: SupportedLanguage;
}

/**
 * Guarda el progreso del análisis en storage para recovery
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function saveAnalysisProgress(
    exName: string,
    blockNumber: 1 | 2 | 3,
    data: any,
    language: SupportedLanguage
): Promise<void> {
    const cacheKey = `analysis_cache_${exName}`;

    // Leer caché existente
    let cache: AnalysisCache = {
        exName,
        timestamp: Date.now(),
        language
    };

    try {
        const existing = await storage.getItem(cacheKey);
        if (existing) {
            cache = JSON.parse(existing);
        }
    } catch (e) {
        console.warn('[AnalysisCache] Error leyendo caché:', e);
    }

    // Actualizar bloque correspondiente
    cache[`block${blockNumber}` as 'block1' | 'block2' | 'block3'] = data;
    cache.timestamp = Date.now();

    // Guardar
    try {
        await storage.setItem(cacheKey, JSON.stringify(cache));
        console.log(`[AnalysisCache] ✅ Bloque ${blockNumber} guardado`);
    } catch (e) {
        console.error('[AnalysisCache] Error guardando caché:', e);
    }
}

/**
 * Recupera el progreso del análisis desde storage
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function loadAnalysisProgress(exName: string): Promise<AnalysisCache | null> {
    const cacheKey = `analysis_cache_${exName}`;

    try {
        const cached = await storage.getItem(cacheKey);
        if (!cached) return null;

        const cache: AnalysisCache = JSON.parse(cached);

        // Validar que no sea muy antiguo (24 horas)
        const ageHours = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
        if (ageHours > 24) {
            console.log('[AnalysisCache] Caché expirado (>24h), ignorando');
            await storage.removeItem(cacheKey);
            return null;
        }

        console.log(`[AnalysisCache] ✅ Caché encontrado para "${exName}":`, {
            block1: !!cache.block1,
            block2: !!cache.block2,
            block3: !!cache.block3,
            age: `${Math.round(ageHours * 60)} min`
        });

        return cache;
    } catch (e) {
        console.error('[AnalysisCache] Error cargando caché:', e);
        return null;
    }
}

/**
 * Limpia el caché de análisis una vez completado exitosamente
 * Works on both web (localStorage) and native (AsyncStorage)
 */
export async function clearAnalysisCache(exName: string): Promise<void> {
    const cacheKey = `analysis_cache_${exName}`;
    await storage.removeItem(cacheKey);
    console.log(`[AnalysisCache] 🧹 Caché limpiado para "${exName}"`);
}
