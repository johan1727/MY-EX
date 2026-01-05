import { ParsedMessage } from './exSimulator';

export interface ConflictAnalysis {
    conflictMoments: Array<{
        date: string;
        triggerWord: string;
        context: string; // 3-5 mensajes antes/después
        resolution: "resolved" | "unresolved" | "escalated";
        whoApologized: "user" | "ex" | "both" | "neither";
        pattern: string; // Patrón de conflicto identificado
        severity: number; // 1-10
    }>;
    conflictPatterns: {
        frequency: number; // Conflictos totales
        averagePerMonth: number;
        commonTriggers: string[];
        resolutionStyle: string;
        conflictEscalationSpeed: "instant" | "gradual" | "slow";
    };
}

/**
 * Palabras clave que indican conflicto
 */
const CONFLICT_KEYWORDS = [
    // Español
    'perdón', 'disculpa', 'lo siento', 'perdóname',
    'terminamos', 'terminar', 'acabar', 'rompimos',
    'bloquear', 'bloqueado', 'bloqueé',
    'otra vez', 'siempre', 'nunca',
    'llorar', 'llorando', 'lloro', 'lágrimas',
    'mentira', 'mentiste', 'engañar', 'engañaste',
    'ya no', 'no más', 'harto', 'cansado',
    'ignorar', 'ignoras', 'visto',
    'enojar', 'enojado', 'molesto', 'furioso',
    'pelea', 'discusión', 'problema',

    // English
    'sorry', 'apologize', 'forgive',
    'break up', 'over', 'done',
    'block', 'blocked',
    'again', 'always', 'never',
    'cry', 'crying', 'tears',
    'lie', 'lied', 'cheat',
    'tired', 'done', 'enough',
    'ignore', 'ignored',
    'angry', 'mad', 'furious',
    'fight', 'argument'
];

/**
 * Palabras que indican disculpa/reconciliación
 */
const APOLOGY_KEYWORDS = [
    'perdón', 'disculpa', 'lo siento', 'perdóname',
    'sorry', 'apologize', 'forgive', 'my bad',
    'no quise', 'fue mi culpa', 'mi error',
    'tienes razón', 'entiendo'
];

/**
 * Detecta y analiza conflictos en la conversación
 */
export function detectConflicts(messages: ParsedMessage[], exName: string): ConflictAnalysis {
    const conflictMoments: ConflictAnalysis['conflictMoments'] = [];
    const triggers = new Map<string, number>();

    // Buscar keywords de conflicto
    messages.forEach((msg, idx) => {
        const lowerContent = msg.content.toLowerCase();

        CONFLICT_KEYWORDS.forEach(keyword => {
            if (lowerContent.includes(keyword)) {
                // Extraer contexto (3 mensajes antes, 5 después)
                const contextStart = Math.max(0, idx - 3);
                const contextEnd = Math.min(messages.length, idx + 6);
                const contextMessages = messages.slice(contextStart, contextEnd);

                const context = contextMessages
                    .map(m => `${m.sender}: ${m.content}`)
                    .join('\n');

                // Analizar resolución
                const afterMessages = messages.slice(idx + 1, idx + 10);
                const resolution = analyzeResolution(afterMessages, exName);
                const whoApologized = detectApology(afterMessages, exName);
                const severity = estimateSeverity(lowerContent, keyword);
                const pattern = identifyPattern(lowerContent);

                conflictMoments.push({
                    date: msg.timestamp,
                    triggerWord: keyword,
                    context: context.substring(0, 500), // Limitar tamaño
                    resolution,
                    whoApologized,
                    pattern,
                    severity
                });

                // Trackear trigger frequency
                triggers.set(keyword, (triggers.get(keyword) || 0) + 1);
            }
        });
    });

    // Analizar patrones
    const conflictPatterns = analyzeConflictPatterns(conflictMoments, messages, triggers);

    return {
        conflictMoments: conflictMoments.slice(0, 50), // Limitar a top 50 conflictos
        conflictPatterns
    };
}

/**
 * Analiza si el conflicto se resolvió
 */
function analyzeResolution(
    afterMessages: ParsedMessage[],
    exName: string
): "resolved" | "unresolved" | "escalated" {
    if (afterMessages.length === 0) return "unresolved";

    const afterText = afterMessages.map(m => m.content.toLowerCase()).join(' ');

    // Buscar señales de resolución
    const resolutionSigns = [
        'está bien', 'ok', 'okay', 'entiendo',
        'te quiero', 'perdón', 'lo siento',
        'hablemos', 'calmemos', 'tranquilo'
    ];

    // Buscar señales de escalada
    const escalationSigns = [
        'vete', 'déjame', 'no quiero',
        'terminamos', 'adiós', 'chau',
        'bloquear', 'nunca más'
    ];

    const hasResolution = resolutionSigns.some(sign => afterText.includes(sign));
    const hasEscalation = escalationSigns.some(sign => afterText.includes(sign));

    if (hasEscalation) return "escalated";
    if (hasResolution) return "resolved";
    return "unresolved";
}

/**
 * Detecta quién se disculpó
 */
function detectApology(
    afterMessages: ParsedMessage[],
    exName: string
): "user" | "ex" | "both" | "neither" {
    let userApologized = false;
    let exApologized = false;

    afterMessages.forEach(msg => {
        const lower = msg.content.toLowerCase();
        const hasApology = APOLOGY_KEYWORDS.some(kw => lower.includes(kw));

        if (hasApology) {
            if (msg.sender === exName) {
                exApologized = true;
            } else {
                userApologized = true;
            }
        }
    });

    if (userApologized && exApologized) return "both";
    if (exApologized) return "ex";
    if (userApologized) return "user";
    return "neither";
}

/**
 * Estima la severidad del conflicto (1-10)
 */
function estimateSeverity(content: string, keyword: string): number {
    const highSeverityWords = ['terminar', 'acabar', 'bloquear', 'mentira', 'engañar', 'nunca más'];
    const mediumSeverityWords = ['siempre', 'nunca', 'harto', 'cansado'];

    let severity = 5; // Base

    if (highSeverityWords.some(w => content.includes(w))) {
        severity += 3;
    } else if (mediumSeverityWords.some(w => content.includes(w))) {
        severity += 1;
    }

    // Mayúsculas incrementan severidad
    if (content === content.toUpperCase() && content.length > 5) {
        severity += 1;
    }

    // Signos de exclamación
    const exclamationCount = (content.match(/!/g) || []).length;
    severity += Math.min(exclamationCount, 2);

    return Math.min(severity, 10);
}

/**
 * Identifica el patrón de conflicto
 */
function identifyPattern(content: string): string {
    if (content.includes('siempre') || content.includes('nunca')) {
        return "Generalización/Absolutismo";
    }
    if (content.includes('otra vez')) {
        return "Conflicto recurrente";
    }
    if (content.includes('ignorar') || content.includes('visto')) {
        return "Comunicación evitativa";
    }
    if (content.includes('llorar') || content.includes('triste')) {
        return "Expresión emocional";
    }
    if (content.includes('mentira') || content.includes('engañar')) {
        return "Problema de confianza";
    }
    if (content.includes('terminar') || content.includes('acabar')) {
        return "Amenaza de ruptura";
    }

    return "Conflicto general";
}

/**
 * Analiza patrones generales de conflicto
 */
function analyzeConflictPatterns(
    conflicts: ConflictAnalysis['conflictMoments'],
    allMessages: ParsedMessage[],
    triggers: Map<string, number>
): ConflictAnalysis['conflictPatterns'] {
    // Calcular frecuencia mensual
    const firstDate = allMessages.length > 0 ? new Date(allMessages[0].timestamp) : new Date();
    const lastDate = allMessages.length > 0 ? new Date(allMessages[allMessages.length - 1].timestamp) : new Date();
    const monthsDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const averagePerMonth = conflicts.length / monthsDiff;

    // Top 5 triggers
    const commonTriggers = Array.from(triggers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([trigger]) => trigger);

    // Estilo de resolución
    const resolvedCount = conflicts.filter(c => c.resolution === "resolved").length;
    const escalatedCount = conflicts.filter(c => c.resolution === "escalated").length;
    const unresolvedCount = conflicts.filter(c => c.resolution === "unresolved").length;

    let resolutionStyle = "Variable";
    if (resolvedCount > conflicts.length * 0.6) {
        resolutionStyle = "Constructiva - mayoría de conflictos se resuelven";
    } else if (escalatedCount > conflicts.length * 0.4) {
        resolutionStyle = "Escalatoria - conflictos tienden a empeorar";
    } else if (unresolvedCount > conflicts.length * 0.5) {
        resolutionStyle = "Evitativa - conflictos quedan sin resolver";
    }

    // Velocidad de escalada
    const avgSeverity = conflicts.reduce((sum, c) => sum + c.severity, 0) / Math.max(conflicts.length, 1);
    const conflictEscalationSpeed: "instant" | "gradual" | "slow" =
        avgSeverity > 7 ? "instant" :
            avgSeverity > 4 ? "gradual" : "slow";

    return {
        frequency: conflicts.length,
        averagePerMonth: Math.round(averagePerMonth * 10) / 10,
        commonTriggers,
        resolutionStyle,
        conflictEscalationSpeed
    };
}
