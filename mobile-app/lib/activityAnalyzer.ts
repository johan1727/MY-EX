import { ParsedMessage } from './exSimulator';

export interface ActivityPeaks {
    hottestDays: Array<{
        date: string;
        messageCount: number;
        averageLength: number;
        emotionalTone: number; // 1-10
        keyTopics: string[];
        significance: string; // Por qué fue peak
    }>;
    coldestDays: Array<{
        date: string;
        daysSinceLast: number;
        possibleReason: string;
        contextBefore: string;
        contextAfter: string;
    }>;
    relationshipPhases: Array<{
        period: string;
        activity: "high" | "medium" | "low";
        quality: number; // 1-10
        summary: string;
    }>;
    overallTrend: "improving" | "stable" | "declining";
}

interface DayActivity {
    date: string;
    messages: ParsedMessage[];
    count: number;
    totalLength: number;
    avgLength: number;
}

/**
 * Analiza picos de actividad en la conversación
 * NO lee linealmente - solo extrae los momentos MÁS IMPORTANTES
 */
export function analyzeActivityPeaks(messages: ParsedMessage[]): ActivityPeaks {
    // 1. Agrupar mensajes por día
    const dayMap = new Map<string, ParsedMessage[]>();

    messages.forEach(msg => {
        try {
            const date = new Date(msg.timestamp);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, []);
            }
            dayMap.get(dateKey)!.push(msg);
        } catch (e) {
            // Skip malformed dates
        }
    });

    // 2. Calcular métricas por día
    const dayActivities: DayActivity[] = Array.from(dayMap.entries()).map(([date, msgs]) => ({
        date,
        messages: msgs,
        count: msgs.length,
        totalLength: msgs.reduce((sum, m) => sum + m.content.length, 0),
        avgLength: msgs.reduce((sum, m) => sum + m.content.length, 0) / msgs.length
    }));

    // Sort by date
    dayActivities.sort((a, b) => a.date.localeCompare(b.date));

    // 3. Encontrar 10 DÍAS MÁS ACTIVOS (hot days)
    const hottestDays = dayActivities
        .slice() // Clone to not mutate
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(day => {
            const topics = extractKeyTopics(day.messages);
            const emotionalTone = estimateEmotionalTone(day.messages);
            const significance = inferSignificance(day, dayActivities);

            return {
                date: day.date,
                messageCount: day.count,
                averageLength: Math.round(day.avgLength),
                emotionalTone,
                keyTopics: topics,
                significance
            };
        });

    // 4. Encontrar 10 DÍAS MÁS FRÍOS (gaps/silencios prolongados)
    const coldestDays = findColdestDays(dayActivities);

    // 5. Dividir relación en fases
    const phases = divideIntoPhases(dayActivities);

    // 6. Determinar tendencia general
    const overallTrend = calculateOverallTrend(phases);

    return {
        hottestDays,
        coldestDays,
        relationshipPhases: phases,
        overallTrend
    };
}

/**
 * Extrae tópicos clave de los mensajes de un día
 */
function extractKeyTopics(messages: ParsedMessage[]): string[] {
    const wordFrequency = new Map<string, number>();
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'es', 'en',
        'y', 'a', 'o', 'por', 'para', 'con', 'no', 'se', 'lo', 'te', 'me'
    ]);

    messages.forEach(msg => {
        const words = msg.content.toLowerCase().split(/\s+/);
        words.forEach(word => {
            const clean = word.replace(/[^a-záéíóúñ]/g, '');
            if (clean.length > 3 && !stopWords.has(clean)) {
                wordFrequency.set(clean, (wordFrequency.get(clean) || 0) + 1);
            }
        });
    });

    // Top 3 palabras más frecuentes
    return Array.from(wordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);
}

/**
 * Estima el tono emocional del día (1-10)
 */
function estimateEmotionalTone(messages: ParsedMessage[]): number {
    const positiveWords = ['amor', 'quiero', 'feliz', 'hermoso', 'increíble', 'genial', 'jaja', '😊', '❤️', '😍'];
    const negativeWords = ['triste', 'enojado', 'mal', 'terrible', 'odio', 'llorar', '😢', '😞', '💔'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach(msg => {
        const lower = msg.content.toLowerCase();
        positiveCount += positiveWords.filter(w => lower.includes(w)).length;
        negativeCount += negativeWords.filter(w => lower.includes(w)).length;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return 5; // Neutral

    // Escala 1-10
    const ratio = positiveCount / total;
    return Math.round(1 + (ratio * 9));
}

/**
 * Infiere la significancia de un día
 */
function inferSignificance(day: DayActivity, allDays: DayActivity[]): string {
    const avgCount = allDays.reduce((sum, d) => sum + d.count, 0) / allDays.length;

    if (day.count > avgCount * 3) {
        return "Pico extremo de actividad - posible evento importante";
    } else if (day.count > avgCount * 2) {
        return "Día muy activo - conversación intensa";
    } else {
        return "Día de alta actividad";
    }
}

/**
 * Encuentra los días más fríos (gaps de silencio)
 */
function findColdestDays(dayActivities: DayActivity[]): Array<{
    date: string;
    daysSinceLast: number;
    possibleReason: string;
    contextBefore: string;
    contextAfter: string;
}> {
    const gaps: Array<{
        date: string;
        daysSinceLast: number;
        possibleReason: string;
        contextBefore: string;
        contextAfter: string;
    }> = [];

    for (let i = 1; i < dayActivities.length; i++) {
        const current = new Date(dayActivities[i].date);
        const previous = new Date(dayActivities[i - 1].date);
        const daysDiff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > 2) { // Gap de más de 2 días
            const contextBefore = dayActivities[i - 1].messages.slice(-3)
                .map(m => m.content.substring(0, 50))
                .join(' | ');

            const contextAfter = dayActivities[i].messages.slice(0, 3)
                .map(m => m.content.substring(0, 50))
                .join(' | ');

            gaps.push({
                date: dayActivities[i].date,
                daysSinceLast: daysDiff,
                possibleReason: daysDiff > 7 ? "Posible distanciamiento o conflicto" : "Período de baja comunicación",
                contextBefore,
                contextAfter
            });
        }
    }

    // Retornar los 10 gaps más largos
    return gaps.sort((a, b) => b.daysSinceLast - a.daysSinceLast).slice(0, 10);
}

/**
 * Divide la relación en fases basadas en actividad
 */
function divideIntoPhases(dayActivities: DayActivity[]): Array<{
    period: string;
    activity: "high" | "medium" | "low";
    quality: number;
    summary: string;
}> {
    if (dayActivities.length === 0) return [];

    const phases: Array<{
        period: string;
        activity: "high" | "medium" | "low";
        quality: number;
        summary: string;
    }> = [];

    // Dividir en 3 fases: Inicio (30%), Medio (40%), Final (30%)
    const phase1End = Math.floor(dayActivities.length * 0.3);
    const phase2End = Math.floor(dayActivities.length * 0.7);

    const phase1 = dayActivities.slice(0, phase1End);
    const phase2 = dayActivities.slice(phase1End, phase2End);
    const phase3 = dayActivities.slice(phase2End);

    [
        { name: "Inicio", days: phase1 },
        { name: "Medio", days: phase2 },
        { name: "Final", days: phase3 }
    ].forEach(({ name, days }) => {
        if (days.length === 0) return;

        const avgMessages = days.reduce((sum, d) => sum + d.count, 0) / days.length;
        const avgEmotion = days.reduce((sum, d) => {
            const msgs = d.messages;
            return sum + estimateEmotionalTone(msgs);
        }, 0) / days.length;

        const activity: "high" | "medium" | "low" =
            avgMessages > 50 ? "high" :
                avgMessages > 20 ? "medium" : "low";

        const startDate = days[0].date;
        const endDate = days[days.length - 1].date;

        phases.push({
            period: `${name} (${startDate} - ${endDate})`,
            activity,
            quality: Math.round(avgEmotion),
            summary: generatePhaseSummary(name, activity, Math.round(avgEmotion))
        });
    });

    return phases;
}

function generatePhaseSummary(phase: string, activity: "high" | "medium" | "low", quality: number): string {
    const activityDesc = {
        high: "Comunicación muy frecuente",
        medium: "Comunicación moderada",
        low: "Comunicación esporádica"
    };

    const qualityDesc = quality > 7 ? "tono muy positivo" :
        quality > 4 ? "tono neutral/mixto" :
            "tono negativo/conflictivo";

    return `${activityDesc[activity]} con ${qualityDesc}`;
}

/**
 * Calcula la tendencia general de la relación
 */
function calculateOverallTrend(phases: Array<{ quality: number }>): "improving" | "stable" | "declining" {
    if (phases.length < 2) return "stable";

    const firstQuality = phases[0].quality;
    const lastQuality = phases[phases.length - 1].quality;
    const diff = lastQuality - firstQuality;

    if (diff > 1.5) return "improving";
    if (diff < -1.5) return "declining";
    return "stable";
}
