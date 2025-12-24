import { useLanguage } from './i18n';

export type ToolSuggestion = {
    tool: 'decoder' | 'conversation' | 'social' | 'stalker' | null;
    message: string;
    icon: string;
};

interface KeywordMap {
    [key: string]: string[];
}

const KEYWORDS: KeywordMap = {
    decoder: [
        'mensaje', 'me dijo', 'respondió', 'texto', 'me escribió',
        'me contestó', 'respuesta', 'me mandó', 'me envió'
    ],
    conversation: [
        'conversación', 'chat', 'whatsapp', 'historial', 'mensajes',
        'hablamos', 'platicamos', 'conversamos', 'chateamos'
    ],
    social: [
        'instagram', 'facebook', 'tiktok', 'redes', 'perfil', 'foto',
        'story', 'historia', 'publicó', 'subió', 'posteó', 'red social'
    ],
    stalker: [
        'me sigue', 'me busca', 'acosa', 'stalker', 've mis historias',
        'me vigila', 'me espía', 'aparece', 'me persigue', 'obsesionado'
    ]
};

const SUGGESTIONS = {
    es: {
        decoder: {
            message: '¿Quieres que decodifique ese mensaje? Puedo ayudarte a entender qué significa realmente. 🔍',
            icon: '🔧'
        },
        conversation: {
            message: '¿Te gustaría que analice esa conversación? Puedo detectar patrones y red flags. 💬',
            icon: '💬'
        },
        social: {
            message: '¿Quieres que revise su perfil de redes sociales? Puedo analizar su comportamiento online. 💗',
            icon: '💗'
        },
        stalker: {
            message: 'Eso suena preocupante. ¿Quieres usar el Detector de Stalking para evaluar la situación? 👁️',
            icon: '👁️'
        }
    },
    en: {
        decoder: {
            message: 'Want me to decode that message? I can help you understand what it really means. 🔍',
            icon: '🔧'
        },
        conversation: {
            message: 'Would you like me to analyze that conversation? I can detect patterns and red flags. 💬',
            icon: '💬'
        },
        social: {
            message: 'Want me to check their social media profile? I can analyze their online behavior. 💗',
            icon: '💗'
        },
        stalker: {
            message: 'That sounds concerning. Want to use the Stalker Detector to assess the situation? 👁️',
            icon: '👁️'
        }
    }
};

/**
 * Analyzes a user message and suggests a relevant tool if applicable
 * @param message - The user's message text
 * @param language - Current app language ('es' or 'en')
 * @param recentToolUsage - Optional: recently used tool to avoid repetitive suggestions
 * @returns ToolSuggestion object with tool type, message, and icon
 */
export function analyzeMessageForSuggestion(
    message: string,
    language: 'es' | 'en' = 'es',
    recentToolUsage?: string[]
): ToolSuggestion {
    const lowerMessage = message.toLowerCase();

    // Check each tool's keywords
    for (const [tool, keywords] of Object.entries(KEYWORDS)) {
        const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));

        if (hasKeyword) {
            // Avoid suggesting the same tool repeatedly
            if (recentToolUsage && recentToolUsage.includes(tool)) {
                continue;
            }

            const suggestion = SUGGESTIONS[language][tool as keyof typeof SUGGESTIONS['es']];
            return {
                tool: tool as ToolSuggestion['tool'],
                message: suggestion.message,
                icon: suggestion.icon
            };
        }
    }

    return {
        tool: null,
        message: '',
        icon: ''
    };
}

/**
 * Checks if a message is long enough to warrant analysis
 * Short messages like "ok", "si", "no" shouldn't trigger suggestions
 */
export function shouldAnalyzeMessage(message: string): boolean {
    const trimmed = message.trim();
    const wordCount = trimmed.split(/\s+/).length;

    // Ignore very short messages
    if (wordCount < 3 || trimmed.length < 10) {
        return false;
    }

    // Ignore common short responses
    const shortResponses = ['ok', 'si', 'no', 'gracias', 'thanks', 'yes', 'yeah', 'nope'];
    if (shortResponses.includes(trimmed.toLowerCase())) {
        return false;
    }

    return true;
}

/**
 * Hook to get contextual suggestions with current language
 */
export function useContextualSuggestions() {
    const { language } = useLanguage();

    return {
        analyze: (message: string, recentToolUsage?: string[]) =>
            analyzeMessageForSuggestion(message, language, recentToolUsage),
        shouldAnalyze: shouldAnalyzeMessage
    };
}
