import { ParsedMessage } from './exSimulator';

export interface ValidationResult {
    isValid: boolean;
    confidence: number; // 0-1
    detectedType: 'ex' | 'partner' | 'friend' | 'family' | 'deceased' | 'unknown';
    warnings: string[];
    suggestions: string[];
}

/**
 * RELATIONSHIP TYPE VALIDATOR
 * Analiza el contenido del chat para verificar si coincide con el tipo seleccionado
 */
export function validateRelationshipType(
    messages: ParsedMessage[],
    selectedType: string,
    exName: string
): ValidationResult {
    console.log(`[Validator] Validating ${selectedType} for ${exName}`);

    if (messages.length < 20) {
        return {
            isValid: true,
            confidence: 0.5,
            detectedType: 'unknown',
            warnings: ['Chat muy corto para validar'],
            suggestions: []
        };
    }

    // Analizar contenido
    const analysis = analyzeContent(messages);
    const detectedType = determineType(analysis);
    const confidence = calculateConfidence(analysis, selectedType);

    // Generar advertencias si hay mismatch
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const isValid = detectedType === selectedType || confidence > 0.6;

    if (!isValid && detectedType !== 'unknown') {
        warnings.push(
            `⚠️ Este chat parece ser de tipo "${translateType(detectedType)}" pero seleccionaste "${translateType(selectedType)}"`
        );

        suggestions.push(
            `💡 Considera cambiar a: ${translateType(detectedType)}`
        );

        // Explicar por qué
        if (selectedType === 'ex' && detectedType === 'family') {
            suggestions.push(
                `Detectamos lenguaje familiar (${analysis.familyScore.toFixed(1)}% confianza), no romántico`
            );
        } else if (selectedType === 'ex' && detectedType === 'friend') {
            suggestions.push(
                `Detectamos lenguaje de amistad (${analysis.friendScore.toFixed(1)}% confianza), no romántico`
            );
        } else if (selectedType === 'friend' && detectedType === 'ex') {
            suggestions.push(
                `Detectamos lenguaje romántico (${analysis.romanticScore.toFixed(1)}% confianza)`
            );
        }
    }

    return {
        isValid,
        confidence,
        detectedType,
        warnings,
        suggestions
    };
}

interface ContentAnalysis {
    romanticScore: number;
    familyScore: number;
    friendScore: number;
    deceasedScore: number;
    messageCount: number;
}

function analyzeContent(messages: ParsedMessage[]): ContentAnalysis {
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');

    // Keywords románticos
    // 1. ROMÁNTICO / EX-PAREJA (Amor, Conflicto, Ruptura, Nostalgia)
    const romanticKeywords = [
        // Amor y Cariño Básico
        'te amo', 'te quiero', 'mi amor', 'amor mío', 'bebé', 'baby',
        'cariño', 'mi vida', 'corazón', 'mami', 'papi', 'gordita', 'gordito',
        'te extraño', 'te necesito', 'beso', 'besos', 'te deseo',
        'novia', 'novio', 'esposa', 'esposo', 'pareja', 'relación',
        'aniversario', 'mesiversario', 'primera cita', 'nuestro día',
        'te ves hermosa', 'te ves guapo', 'sexy', 'atractivo', 'linda', 'guapo',
        'preciosa', 'princesa', 'reina', 'rey',
        // Emojis románticos
        '❤️', '😍', '💕', '💖', '😘', '🥰', '💘', '💍',

        // CONFLICTO Y RUPTURA (Crucial para Ex)
        'terminamos', 'se acabó', 'esto no funciona', 'dame un tiempo',
        'necesito espacio', 'ya no puedo más', 'me cansé', 'tóxico', 'tóxica',
        'siempre lo mismo', 'ya no te creo', 'me mentiste', 'infiel', 'engaño',
        'otra oportunidad', 'dame otra oportunidad', 'cambiar', 'te prometo',
        'perdón', 'lo siento', 'me equivoqué', 'te fallé', 'fui un idiota',
        'fui una estúpida', 'arrepentido', 'arrepentida', 'culpa',
        'no eres tú soy yo', 'dejarlo así', 'cada quien por su lado',
        'vete', 'lárgate', 'no me busques', 'bloquear', 'desbloquear',

        // NOSTALGIA E INTENTOS DE VOLVER
        'te extraño mucho', 'pienso en ti', 'lo nuestro', 'nuestra historia',
        'recuerdas cuando', 'soñé contigo', 'te vi', 'me acordé de ti',
        'aún te quiero', 'no te olvido', 'te sigo amando', 'imposible olvidarte',
        'volver a intentar', 'empezar de cero', 'reconciliación', 'arreglar las cosas',
        'podemos hablar', 'tenemos que hablar', 'te ruego', 'por favor',
        'me haces falta', 'eres el amor de mi vida', 'nunca amé a nadie así',
        'nadie como tú', 'mi ex', 'mi exnovio', 'mi exnovia'
    ];

    // 2. FAMILIA (Roles, Bendiciones, Formalidad)
    const familyKeywords = [
        // Roles
        'mamá', 'mami', 'madre', 'papá', 'papi', 'padre', 'mis papás', 'tus papás',
        'hijo', 'hija', 'hijito', 'hijita', 'mi niño', 'mi niña',
        'hermano', 'hermana', 'hermanito', 'hermanita', 'bro', 'sis', 'cuñado', 'cuñada',
        'tío', 'tía', 'primo', 'prima', 'sobrino', 'sobrina',
        'abuelo', 'abuela', 'nono', 'nona', 'yaya', 'tata', 'abue',
        'suegra', 'suegro', 'nuera', 'yerno', 'padrino', 'madrina', 'ahijado',
        'familia', 'familiar', 'pariente', 'mi familia', 'nuestra familia',
        'grupo familiar', 'la familia',

        // Frases Típicas / Bendiciones
        'bendición', 'diós te bendiga', 'que diós te acompañe', 'con el favor de diós',
        'bendiciones', 'amén', 'rezando por ti', 'orando', 'misa',
        'mande', 'dígame', 'te calmas', 'cuídate mucho', 'avísame cuando llegues',
        'ponte suéter', 'ya comiste', 'te guardé comida', 'voy al mercado',
        'casa de mi mamá', 'casa de la abuela', 'reunión familiar', 'comida familiar',
        'domingo familiar', 'cumpleaños de la tía', 'un abrazo', 'saludos a todos',
        'los quiero', 'los extraño', 'orgullosa de ti', 'orgulloso de ti'
    ];

    // 3. AMISTAD (Jerga, Planes, Fiesta, Apoyo)
    const friendKeywords = [
        // Términos de trato (Jerga Variada)
        'amigo', 'amiga', 'bestie', 'bff', 'compa', 'compadre', 'compadrito',
        'bro', 'brother', 'mano', 'manito', 'carnal', 'cuante',
        'wey', 'wei', 'güey', 'vato', 'morra', 'morro', // México
        'parce', 'parcero', 'marica', 'huevón', 'mi llave', 'ñero', // Colombia
        'boludo', 'boluda', 'che', 'pibe', 'piba', 'loco', 'loca', // Argentina
        'tío', 'tía', 'colega', 'tronco', 'chaval', 'chavala', 'majo', // España
        'pana', 'causa', 'yunta', 'pata', // Otros Latam

        // Frases y Expresiones
        'nmms', 'no mames', 'no manches', 'qué pedo', 'qué onda', 'quiubo',
        'jaja', 'haha', 'jajaja', 'lol', 'xd', 'jajaj', // Risa (reintroducida controlada)
        'chisme', 'cuéntame', 'no te creo', 'en serio?', 'neta?', 'posta?',
        'qué fuerte', 'está cañón', 'qué heavy', 'salseo',

        // Planes y Fiesta
        'salimos', 'salir', 'fiesta', 'peda', 'rumba', 'joda', 'party', 'antro', 'boliche',
        'cheve', 'chelas', 'birra', 'pola', 'tragos', 'copas', 'pistear', 'beber',
        'plan', 'qué haces', 'jalas', 'te apuntas', 'saca el plan', 'vamos por unas',
        'nos vemos', 'te paso a buscar', 'te caigo', 'caile', 'juntada', 'previa',
        'cruda', 'resaca', 'guayabo',

        // Apoyo Amistoso
        'cuenta conmigo', 'estoy para ti', 'ánimo', 'tú puedes', 'eres la mejor',
        'te quiero amiga', 'te quiero amigo', 'abrazo', 'crack', 'fiera', 'máquina'
    ];

    // 4. FALLECIDO (Duelo, Pésame, Recuerdo, Espiritual)
    const deceasedKeywords = [
        // Duelo y Pésame
        'descansa en paz', 'qepd', 'rip', 'dep', 'vuela alto',
        'mi más sentido pésame', 'mis condolencias', 'te acompaño en el sentimiento',
        'siento mucho tu pérdida', 'fuerza', 'resiliencia', 'luto', 'duelo',
        'velorio', 'funeral', 'entierro', 'sepelio', 'misa', 'novenario',
        'cenizas', 'tumba', 'cementerio', 'panteón',

        // Nostalgia y Recuerdo
        'te extraño mucho', 'te extraño tanto', 'me haces falta', 'vacío',
        'ojalá estuvieras', 'ya no estás', 'te fuiste', 'tu partida', 'tu ausencia',
        'desde que te fuiste', 'nunca te olvidaré', 'siempre te recordaré',
        'te llevamos en el corazón', 'siempre presente', 'memoria', 'recuerdo',
        'aniversario luctuoso', 'un año sin ti', 'meses sin ti',

        // Espiritual / Cielo
        'cielo', 'allá arriba', 'estás con diós', 'ángel', 'nuestro ángel',
        'nos cuidas', 'nos proteges', 'un abrazo hasta el cielo',
        'besos al cielo', 'estrella', 'brilla', 'luz', 'paz eterna',
        'reencuentro', 'hasta pronto', 'nos volveremos a ver'
    ];

    // Contar ocurrencias
    const countKeywords = (keywords: string[]) => {
        return keywords.reduce((count, keyword) => {
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = allText.match(regex);
            return count + (matches ? matches.length : 0);
        }, 0);
    };

    const romanticCount = countKeywords(romanticKeywords);
    const familyCount = countKeywords(familyKeywords);
    const friendCount = countKeywords(friendKeywords);
    const deceasedCount = countKeywords(deceasedKeywords);

    const total = messages.length;

    // Normalizar scores (0-100)
    const romanticScore = Math.min((romanticCount / total) * 500, 100);
    const familyScore = Math.min((familyCount / total) * 500, 100);
    const friendScore = Math.min((friendCount / total) * 500, 100);
    const deceasedScore = Math.min((deceasedCount / total) * 500, 100);

    return {
        romanticScore,
        familyScore,
        friendScore,
        deceasedScore,
        messageCount: total
    };
}

function determineType(analysis: ContentAnalysis): 'ex' | 'partner' | 'friend' | 'family' | 'deceased' | 'unknown' {
    const scores = {
        romantic: analysis.romanticScore,
        family: analysis.familyScore,
        friend: analysis.friendScore,
        deceased: analysis.deceasedScore
    };

    // Encontrar el score más alto
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore < 15) {
        return 'unknown'; // Muy bajo, no podemos determinar
    }

    if (scores.deceased === maxScore && scores.deceased > 20) {
        return 'deceased';
    }

    if (scores.romantic === maxScore) {
        return 'ex'; // Asumimos ex por defecto si es romántico
    }

    if (scores.family === maxScore) {
        return 'family';
    }

    if (scores.friend === maxScore) {
        return 'friend';
    }

    return 'unknown';
}

function calculateConfidence(analysis: ContentAnalysis, selectedType: string): number {
    const typeMap: Record<string, keyof Pick<ContentAnalysis, 'romanticScore' | 'familyScore' | 'friendScore' | 'deceasedScore'>> = {
        'ex': 'romanticScore',
        'partner': 'romanticScore',
        'crush': 'romanticScore',
        'friend': 'friendScore',
        'family': 'familyScore',
        'family_parent': 'familyScore',
        'family_sibling': 'familyScore',
        'family_other': 'familyScore',
        'deceased': 'deceasedScore',
        'fallecido': 'deceasedScore'
    };

    const scoreKey = typeMap[selectedType];
    if (!scoreKey) return 0.5;

    const score = analysis[scoreKey];

    // Convertir score (0-100) a confidence (0-1)
    return Math.min(score / 100, 1);
}

function translateType(type: string): string {
    const translations: Record<string, string> = {
        'ex': 'Ex-Pareja',
        'partner': 'Pareja Actual',
        'friend': 'Amigo/Amiga',
        'family': 'Familiar',
        'deceased': 'Persona Fallecida',
        'unknown': 'Desconocido'
    };
    return translations[type] || type;
}

/**
 * UI Helper: Genera mensaje para mostrar al usuario
 */
export function formatValidationMessage(result: ValidationResult): string {
    if (result.isValid) {
        return `✅ Validación exitosa (${(result.confidence * 100).toFixed(0)}% confianza)`;
    }

    let message = result.warnings.join('\n');
    if (result.suggestions.length > 0) {
        message += '\n\n' + result.suggestions.join('\n');
    }

    return message;
}
