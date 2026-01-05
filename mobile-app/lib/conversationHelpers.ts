import { ParsedMessage } from './exSimulator';
import { storage } from './storage';


/**
 * Extrae información contextual de los mensajes para mejorar realismo
 */

// Quick Win #1: Identificar participantes
export function extractParticipants(messages: ParsedMessage[]) {
    const senderCounts = new Map<string, number>();

    messages.forEach(msg => {
        const name = msg.sender.trim();
        senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
    });

    const participants = Array.from(senderCounts.keys());
    return {
        all: participants,
        primary: participants[0] || 'Usuario',
        secondary: participants[1] || 'Persona'
    };
}

// Quick Win #2: Top 3 emojis más usados
export function extractTopEmojis(messages: ParsedMessage[], targetSender: string): string[] {
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu;
    const emojiCounts = new Map<string, number>();

    messages
        .filter(m => m.sender === targetSender)
        .forEach(msg => {
            const emojis = msg.content.match(emojiRegex) || [];
            emojis.forEach(emoji => {
                emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
            });
        });

    return Array.from(emojiCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);
}

// Quick Win #3: Palabras signature (únicas y frecuentes)
export function extractSignatureWords(messages: ParsedMessage[], targetSender: string): string[] {
    const messagesByTarget = messages.filter(m => m.sender === targetSender);
    const wordCounts = new Map<string, number>();

    // Palabras comunes a ignorar
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'y',
        'en', 'que', 'es', 'por', 'para', 'con', 'no', 'se', 'lo',
        'me', 'te', 'tu', 'si', 'pero', 'o', 'como', 'ya', 'muy', 'todo'
    ]);

    messagesByTarget.forEach(msg => {
        const words = msg.content.toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        words.forEach(word => {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        });
    });

    // Filtrar palabras que aparecen al menos 3 veces
    return Array.from(wordCounts.entries())
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}

// Quick Win #4: Detectar typos comunes
export function extractCommonTypos(messages: ParsedMessage[], targetSender: string): Map<string, string> {
    const typoPatterns = new Map<string, string>();
    const targetMessages = messages.filter(m => m.sender === targetSender);

    // Patrones comunes de typos en español
    const commonTypos = [
        { correct: 'que', typo: 'qe' },
        { correct: 'bien', typo: 'bn' },
        { correct: 'para', typo: 'pa' },
        { correct: 'porque', typo: 'pq' },
        { correct: 'también', typo: 'tb' },
        { correct: 'estar', typo: 'sta' },
    ];

    commonTypos.forEach(({ correct, typo }) => {
        const hasTypo = targetMessages.some(m =>
            m.content.toLowerCase().includes(typo)
        );
        if (hasTypo) {
            typoPatterns.set(correct, typo);
        }
    });

    return typoPatterns;
}

// Quick Win #5: Estilo de risa
export function extractLaughStyle(messages: ParsedMessage[], targetSender: string): string[] {
    const laughPatterns = new Set<string>();
    const targetMessages = messages.filter(m => m.sender === targetSender);

    const laughRegex = /(ja+|je+|ji+|JAJA+|jsjsjs|xd+|lol+|jeje+)/gi;

    targetMessages.forEach(msg => {
        const laughs = msg.content.match(laughRegex);
        if (laughs) {
            laughs.forEach(laugh => laughPatterns.add(laugh.toLowerCase()));
        }
    });

    return Array.from(laughPatterns).slice(0, 3);
}

// MEMORIA EPISÓDICA: Extraer hechos clave
export function extractKeyFacts(messages: ParsedMessage[]): string[] {
    const facts: string[] = [];
    const factPatterns = [
        // Nombres propios (mayúscula)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
        // Lugares
        /(?:en|de|a)\s+([A-Z][a-z]+)/g,
        // Fechas y tiempos
        /(?:ayer|hoy|mañana|el\s+\w+|hace\s+\w+)/gi,
        // Posesiones
        /(?:mi|tu|su)\s+(\w+)/gi,
    ];

    const recentMessages = messages.slice(-50); // Últimos 50 mensajes

    recentMessages.forEach(msg => {
        // Extraer nombres propios mencionados
        const properNouns = msg.content.match(/\b([A-Z][a-z]+)\b/g);
        if (properNouns && properNouns.length > 0) {
            properNouns.forEach(noun => {
                if (noun.length > 2 && !facts.includes(noun)) {
                    facts.push(`Mencionó a: ${noun}`);
                }
            });
        }

        // Detectar info personal explícita
        if (msg.content.match(/mi\s+(\w+)\s+se\s+llama/i)) {
            const match = msg.content.match(/mi\s+(\w+)\s+se\s+llama\s+(\w+)/i);
            if (match) {
                facts.push(`Su ${match[1]} se llama ${match[2]}`);
            }
        }

        // Trabajos / profesiones
        if (msg.content.match(/trabajo\s+(en|como|de)/i)) {
            facts.push(`Info de trabajo mencionada`);
        }
    });

    return facts.slice(0, 10); // Top 10 hechos
}

// Función principal que combina todo
export function extractConversationContext(
    messages: ParsedMessage[],
    targetName: string
) {
    const targetSender = messages.find(m =>
        m.sender.toLowerCase().includes(targetName.toLowerCase())
    )?.sender || targetName;

    const otherSender = messages.find(m => m.sender !== targetSender)?.sender || 'Usuario';

    return {
        participants: {
            target: targetSender,
            user: otherSender,
            all: extractParticipants(messages).all
        },
        fingerprint: {
            topEmojis: extractTopEmojis(messages, targetSender),
            signatureWords: extractSignatureWords(messages, targetSender),
            laughStyle: extractLaughStyle(messages, targetSender),
            commonTypos: extractCommonTypos(messages, targetSender)
        },
        memory: {
            keyFacts: extractKeyFacts(messages)
        }
    };
}

// FUNCIONES FALTANTES PARA GESTIÓN DE CONVERSACIONES

export async function loadConversations() {
    try {
        const keys = await storage.getAllKeys();
        const profileKeys = keys.filter(k => k.startsWith('exSimulator_profile_') && k !== 'exSimulator_currentProfile');

        if (profileKeys.length === 0) return [];

        const profiles = await storage.multiGet(profileKeys);

        return profiles
            .map(([_, value]) => value ? JSON.parse(value) : null)
            .filter(p => p !== null)
            .map(p => ({
                id: p.id,
                name: p.exName || 'Ex',
                exName: p.exName,
                descriptor: p.profile?.attachmentStyle || 'Desconocido',
                timestamp: p.createdAt || new Date().toISOString()
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
        console.error('Error loading conversations:', e);
        return [];
    }
}

export async function setCurrentSimulation(id: string) {
    try {
        const profileKey = `exSimulator_profile_${id}`;
        const profileJson = await storage.getItem(profileKey);

        if (profileJson) {
            await storage.setItem('exSimulator_currentProfile', profileJson);
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error setting current simulation:', e);
        return false;
    }
}
