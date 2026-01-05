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
    const romanticKeywords = [
        'te amo', 'te quiero', 'mi amor', 'amor mío', 'bebé', 'baby',
        'cariño', 'mi vida', 'corazón', 'te extraño', 'te necesito',
        'beso', 'besos', 'te deseo', 'novia', 'novio', 'salimos',
        'pareja', 'relación', 'aniversario', 'primera cita', 'te ves hermosa',
        'te ves guapo', 'sexy', 'atractivo', 'linda', 'guapo',
        '❤️', '😍', '💕', '💖', '😘'
    ];

    // Keywords familiares
    const familyKeywords = [
        'primo', 'prima', 'tío', 'tía', 'hermano', 'hermana',
        'mamá', 'papá', 'abuela', 'abuelo', 'sobrino', 'sobrina',
        'familia', 'familiar', 'pariente', 'mi familia', 'nuestra familia',
        'reunión familiar', 'casa de', 'mis papás', 'tus papás'
    ];

    // Keywords de amistad
    const friendKeywords = [
        'amigo', 'amiga', 'compa', 'compadre', 'bro', 'brother',
        'wey', 'wei', 'güey', 'carnal', 'mano', 'compare',
        'nmms', 'no mames', 'qué pedo', 'salimos de fiesta',
        'jajaja', 'jaja', 'haha', 'lol', 'xd',
        'cheve', 'chelas', 'pistear', 'peda'
    ];

    // Keywords de persona fallecida
    const deceasedKeywords = [
        'te extraño mucho', 'ojalá estuvieras', 'ya no estás',
        'te fuiste', 'descansa en paz', 'rip', 'siempre te recordaré',
        'me haces falta', 'desde que te fuiste', 'allá arriba',
        'en el cielo', 'nunca te olvidaré'
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
