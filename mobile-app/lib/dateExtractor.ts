import { ParsedMessage } from './exSimulator';
import { supabase } from './supabase';

export interface ImportantDate {
    id?: string;
    dateType: 'birthday' | 'anniversary' | 'breakup' | 'first_date' | 'other';
    dateValue: string; // MM-DD para recurrentes, YYYY-MM-DD para específicas
    isRecurring: boolean;
    personName?: string;
    description: string;
    emotionalCharge: 'positive' | 'negative' | 'neutral';
    significance: number; // 1-10
    detectedFromMessage?: string;
}

/**
 * Extrae fechas importantes del historial de chat
 */
/**
 * Extrae fechas importantes del historial de chat
 */
export function extractImportantDates(
    messages: ParsedMessage[],
    exName: string,
    userName: string,
    relationshipType: string = 'ex'
): ImportantDate[] {
    const dates: ImportantDate[] = [];
    const isRomantic = ['ex', 'partner', 'crush'].includes(relationshipType);

    // Keywords de cumpleaños
    const birthdayKeywords = [
        'feliz cumpleaños', 'happy birthday', 'cumple', 'cumpleaños',
        'tu cumple', 'mi cumple', 'años', 'birthday'
    ];

    // Keywords de aniversario (Solo si es romántico o muy cercano)
    const anniversaryKeywords = [
        'aniversario', 'anniversary', 'hace un año', 'año que',
        'primer mes', 'meses juntos', 'años juntos', 'nuestro aniversario'
    ];

    // Keywords de primera cita (Solo romántico)
    const firstDateKeywords = [
        'primera cita', 'primera vez que', 'nos conocimos',
        'first date', 'cuando nos vimos'
    ];

    messages.forEach((msg, idx) => {
        const lower = msg.content.toLowerCase();

        // 1. DETECTAR CUMPLEAÑOS (Universal)
        if (birthdayKeywords.some(kw => lower.includes(kw))) {
            const dateMatch = extractDateFromMessage(msg);
            const personName = inferPersonFromContext(msg.content, [exName, userName]);

            dates.push({
                dateType: 'birthday',
                dateValue: dateMatch || extractMMDDFromTimestamp(msg.timestamp),
                isRecurring: true, // Cumpleaños se repiten cada año
                personName: personName,
                description: msg.content.substring(0, 100),
                emotionalCharge: 'positive',
                significance: 9,
                detectedFromMessage: msg.content
            });
        }

        // 2. DETECTAR ANIVERSARIOS (Solo Romántico)
        if (isRomantic && anniversaryKeywords.some(kw => lower.includes(kw))) {
            const dateMatch = extractDateFromMessage(msg);

            dates.push({
                dateType: 'anniversary',
                dateValue: dateMatch || extractMMDDFromTimestamp(msg.timestamp),
                isRecurring: true,
                description: msg.content.substring(0, 100),
                emotionalCharge: 'positive',
                significance: 10, // Muy importante
                detectedFromMessage: msg.content
            });
        }

        // 3. DETECTAR PRIMERA CITA (Solo Romántico)
        if (isRomantic && firstDateKeywords.some(kw => lower.includes(kw))) {
            const dateMatch = extractDateFromMessage(msg);

            dates.push({
                dateType: 'first_date',
                dateValue: dateMatch || extractMMDDFromTimestamp(msg.timestamp),
                isRecurring: true,
                description: msg.content.substring(0, 100),
                emotionalCharge: 'positive',
                significance: 9,
                detectedFromMessage: msg.content
            });
        }
    });

    // 4. DETECTAR FECHA DE RUPTURA (Solo Romántico)
    if (isRomantic) {
        const breakupDate = detectBreakupDate(messages);
        if (breakupDate) {
            dates.push({
                dateType: 'breakup',
                dateValue: breakupDate,
                isRecurring: true,
                description: 'Fecha aproximada de ruptura',
                emotionalCharge: 'negative',
                significance: 10,
            });
        }
    }

    // Eliminar duplicados basados en date_value
    const uniqueDates = deduplicateDates(dates);

    console.log(`[DateExtractor] Detectadas ${uniqueDates.length} fechas importantes (Relación: ${relationshipType})`);
    return uniqueDates;
}

/**
 * Intenta extraer fecha del contenido del mensaje
 */
function extractDateFromMessage(msg: ParsedMessage): string | null {
    const content = msg.content;

    // Patrones de fecha comunes
    const patterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // DD/MM/YYYY o MM/DD/YYYY
        /(\d{1,2}) de ([a-zA-Zá-ú]+)/,               // "14 de febrero"
        /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) (\d{1,2})/i
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            // Convertir a MM-DD o YYYY-MM-DD
            return normalizeDate(match[0]);
        }
    }

    return null;
}

/**
 * Extrae MM-DD del timestamp del mensaje
 */
function extractMMDDFromTimestamp(timestamp?: string): string {
    if (!timestamp) return '01-01'; // Default

    try {
        const date = new Date(timestamp);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    } catch {
        return '01-01';
    }
}

/**
 * Normaliza fecha a formato MM-DD
 */
function normalizeDate(dateStr: string): string {
    // Mapeo de meses en español
    const monthMap: Record<string, string> = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    // Si ya está en formato MM-DD, retornarlo
    if (/^\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Convertir "14 de febrero" a "02-14"
    const monthMatch = dateStr.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) (\d{1,2})/i);
    if (monthMatch) {
        const month = monthMap[monthMatch[1].toLowerCase()];
        const day = String(monthMatch[2]).padStart(2, '0');
        return `${month}-${day}`;
    }

    // Intentar parsear fecha genérica
    try {
        const date = new Date(dateStr);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    } catch {
        return '01-01';
    }
}

/**
 * Infiere a quién pertenece el cumpleaños del contexto
 */
function inferPersonFromContext(content: string, names: string[]): string | undefined {
    const lower = content.toLowerCase();

    // Buscar nombres en el mensaje
    for (const name of names) {
        if (lower.includes(name.toLowerCase())) {
            return name;
        }
    }

    // Detectar posesivos
    if (lower.includes('tu cumple') || lower.includes('tu cumpleaños')) {
        return names[0]; // Asumimos que el primero es el ex
    }

    if (lower.includes('mi cumple') || lower.includes('mi cumpleaños')) {
        return names[1]; // El segundo es el usuario
    }

    return undefined;
}

/**
 * Detecta la fecha aproximada de ruptura
 * ACTUALIZADO: Keywords masivamente expandidos para detectar rupturas indirectas
 */
function detectBreakupDate(messages: ParsedMessage[]): string | null {
    // ===== KEYWORDS DE RUPTURA DIRECTA =====
    const directBreakupKeywords = [
        'terminamos', 'terminar', 'termino',
        'acabamos', 'acabar', 'acabo',
        'ya no estamos', 'ya no somos',
        'no más', 'no mas',
        'break up', 'broke up', 'over', 'done',
        'se acabó', 'se acabo',
        'esto ya terminó', 'esto ya termino'
    ];

    // ===== KEYWORDS DE CIERRE EMOCIONAL =====
    const closureKeywords = [
        'darle fin', 'dar fin',
        'despedida', 'despedirme', 'despedirnos',
        'dejarlo así', 'dejarlo asi',
        'hasta donde pudimos', 'hasta donde se pudo',
        'ya no funciona', 'no funciona',
        'lo intentamos', 'intentamos',
        'es mejor así', 'es mejor asi',
        'es lo mejor',
        'seguir adelante', 'cada quien por su lado',
        'tomar caminos separados', 'caminos diferentes'
    ];

    // ===== KEYWORDS DE ESPACIO/DISTANCIA =====
    const spaceKeywords = [
        'necesito espacio', 'darnos espacio', 'demos espacio',
        'distancia', 'distanciarnos', 'alejarnos',
        'tiempo para mí', 'tiempo para mi',
        'no me busques', 'no me contactes',
        'respeto tu decisión', 'respeto tu decision',
        'respeta mi decisión', 'respeta mi decision',
        'dejemos de hablar', 'dejar de vernos'
    ];

    // ===== KEYWORDS DE NO VOLVER =====
    const finalityKeywords = [
        'ya no quiero', 'ya no puedo',
        'no puedo seguir', 'no puedo más', 'no puedo mas',
        'no funciona', 'no sale',
        'no somos compatibles',
        'ya no siento', 'ya no es igual',
        'perdimos la chispa',
        'ya no te amo', 'ya no te quiero'
    ];

    // ===== KEYWORDS DE AGRADECIMIENTO/CIERRE =====
    const gratitudeClosureKeywords = [
        'te agradezco por todo', 'gracias por todo',
        'fue bonito', 'fue lindo', 'fue hermoso',
        'te quise mucho', 'te quise un montón', 'te quise un monton',
        'te guardo con cariño', 'te guardo con carino',
        'siempre te recordaré', 'siempre te recordare',
        'fuiste importante', 'me quedo con',
        'aprendí mucho', 'aprendi mucho',
        'suerte en todo', 'te deseo lo mejor',
        'cuídate mucho', 'cuidate mucho'
    ];

    // ===== KEYWORDS DE ARREPENTIMIENTO (POST-RUPTURA) =====
    const regretKeywords = [
        'lo siento', 'perdón', 'perdon',
        'perdóname', 'perdoname',
        'me arrepiento', 'la cagué', 'la cague',
        'lo arruiné', 'lo arruine',
        'no debí', 'no debi',
        'quiero regresar', 'volver contigo',
        'otra oportunidad', 'una oportunidad más', 'una oportunidad mas'
    ];

    // Combinar todos los keywords
    const allBreakupKeywords = [
        ...directBreakupKeywords,
        ...closureKeywords,
        ...spaceKeywords,
        ...finalityKeywords,
        ...gratitudeClosureKeywords
    ];

    // ===== BÚSQUEDA MULTI-MENSAJE CON SCORING =====
    interface BreakupCandidate {
        index: number;
        date: string;
        score: number;
        keywords: string[];
    }

    const candidates: BreakupCandidate[] = [];

    // Buscar de atrás hacia adelante (más reciente primero)
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const lower = msg.content.toLowerCase();
        let score = 0;
        const foundKeywords: string[] = [];

        // Chequear keywords directos (peso: 10)
        for (const kw of directBreakupKeywords) {
            if (lower.includes(kw)) {
                score += 10;
                foundKeywords.push(kw);
            }
        }

        // Chequear cierre emocional (peso: 7)
        for (const kw of closureKeywords) {
            if (lower.includes(kw)) {
                score += 7;
                foundKeywords.push(kw);
            }
        }

        // Chequear espacio (peso: 6)
        for (const kw of spaceKeywords) {
            if (lower.includes(kw)) {
                score += 6;
                foundKeywords.push(kw);
            }
        }

        // Chequear finalidad (peso: 8)
        for (const kw of finalityKeywords) {
            if (lower.includes(kw)) {
                score += 8;
                foundKeywords.push(kw);
            }
        }

        // Chequear agradecimiento/cierre (peso: 5)
        for (const kw of gratitudeClosureKeywords) {
            if (lower.includes(kw)) {
                score += 5;
                foundKeywords.push(kw);
            }
        }

        // Si hay score, es candidato
        if (score > 0 && msg.timestamp) {
            const date = new Date(msg.timestamp);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            candidates.push({
                index: i,
                date: `${month}-${day}`,
                score,
                keywords: foundKeywords
            });
        }
    }

    // Si no hay candidatos, retornar null
    if (candidates.length === 0) {
        // Fallback: usar fecha del último mensaje
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.timestamp) {
            const date = new Date(lastMsg.timestamp);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}-${day}`;
        }
        return null;
    }

    // ===== ANÁLISIS DE CONTEXTO MULTI-MENSAJE =====
    // Buscar cluster de mensajes con alto score en ventana de 3 días
    const clusteredCandidates = candidates.map(candidate => {
        const candidateDate = new Date(messages[candidate.index].timestamp!);
        let clusterScore = candidate.score;

        // Revisar mensajes en ventana de ±3 días
        for (const other of candidates) {
            if (other.index === candidate.index) continue;

            const otherDate = new Date(messages[other.index].timestamp!);
            const daysDiff = Math.abs((candidateDate.getTime() - otherDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 3) {
                clusterScore += other.score * 0.5; // Bonus por mensajes cercanos
            }
        }

        return { ...candidate, clusterScore };
    });

    // Ordenar por cluster score
    clusteredCandidates.sort((a, b) => b.clusterScore - a.clusterScore);

    // Retornar el mejor candidato
    const bestCandidate = clusteredCandidates[0];

    console.log(`[DateExtractor] Breakup detected on ${bestCandidate.date} (score: ${bestCandidate.clusterScore.toFixed(1)}, keywords: ${bestCandidate.keywords.join(', ')})`);

    return bestCandidate.date;
}

/**
 * Elimina fechas duplicadas
 */
function deduplicateDates(dates: ImportantDate[]): ImportantDate[] {
    const seen = new Set<string>();
    const unique: ImportantDate[] = [];

    dates.forEach(date => {
        const key = `${date.dateType}-${date.dateValue}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(date);
        }
    });

    return unique;
}

/**
 * Guarda fechas importantes en Supabase
 */
export async function saveImportantDates(
    dates: ImportantDate[],
    profileId: string,
    userId: string
): Promise<void> {
    if (dates.length === 0) return;

    try {
        const rows = dates.map(date => ({
            profile_id: profileId,
            user_id: userId,
            date_type: date.dateType,
            date_value: date.dateValue,
            is_recurring: date.isRecurring,
            person_name: date.personName,
            description: date.description,
            emotional_charge: date.emotionalCharge,
            significance: date.significance,
            detected_from_messages: date.detectedFromMessage ? [date.detectedFromMessage] : []
        }));

        const { error } = await supabase
            .from('important_dates')
            .insert(rows);

        if (error) throw error;

        console.log(`[DateExtractor] Guardadas ${dates.length} fechas en Supabase`);
    } catch (error) {
        console.error('[DateExtractor] Error guardando fechas:', error);
        throw error;
    }
}

/**
 * Carga fechas importantes desde Supabase
 */
export async function loadImportantDates(profileId: string): Promise<ImportantDate[]> {
    try {
        const { data, error } = await supabase
            .from('important_dates')
            .select('*')
            .eq('profile_id', profileId)
            .order('significance', { ascending: false });

        if (error) throw error;

        return (data || []).map(row => ({
            id: row.id,
            dateType: row.date_type,
            dateValue: row.date_value,
            isRecurring: row.is_recurring,
            personName: row.person_name,
            description: row.description,
            emotionalCharge: row.emotional_charge,
            significance: row.significance,
            detectedFromMessage: row.detected_from_messages?.[0]
        }));
    } catch (error) {
        console.error('[DateExtractor] Error cargando fechas:', error);
        return [];
    }
}

/**
 * Obtiene fechas importantes que ocurren HOY
 */
export async function getTodaysImportantDates(profileId: string): Promise<ImportantDate[]> {
    try {
        const { data, error } = await supabase
            .rpc('get_todays_important_dates', {
                filter_profile_id: profileId
            });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            dateType: row.date_type,
            personName: row.person_name,
            description: row.description,
            emotionalCharge: row.emotional_charge,
            significance: row.significance,
            dateValue: '', // No necesario para hoy
            isRecurring: true
        }));
    } catch (error) {
        console.error('[DateExtractor] Error obteniendo fechas de hoy:', error);
        return [];
    }
}
