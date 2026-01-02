import { ParsedMessage } from './exSimulator';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ===============================================
// 🤖 DETECCIÓN DE PARTICIPANTES CON IA
// ===============================================

export interface ParticipantAnalysis {
    name: string;
    role: 'romantic_interest' | 'friend' | 'family' | 'user' | 'unknown';
    emotionalIntensity: number; // 0-1
    initiatesConversations: number; // 0-1
    messageCount: number;
    confidence: number; // 0-1
}

/**
 * Detecta participantes usando IA para determinar roles y dinámicas
 * Más inteligente que solo contar mensajes
 */
export async function detectParticipantsWithAI(
    messages: ParsedMessage[]
): Promise<ParticipantAnalysis[]> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || messages.length < 50) {
        console.warn('[ParticipantAI] Usando fallback algoritm ico');
        return detectParticipantsFallback(messages);
    }

    try {
        // Tomar muestra de 100 mensajes distribuidos
        const sample = sampleMessages(messages, 100);

        // Construir texto para IA
        const sampleText = sample
            .map(m => `[${m.sender}]: ${m.content.substring(0, 100)}`)
            .join('\n');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza esta conversación de WhatsApp y determina quiénes son los participantes y sus roles.

MUESTRA DE CONVERSACIÓN:
${sampleText.substring(0, 12000)}

Tu tarea:
1. Identifica cuántas personas participan (probablemente 2)
2. Para cada persona:
   - ¿Es vínculo romántico/emocional o casual?
   - ¿Quién usa más lenguaje emocional/cariñoso?
   - ¿Quién inicia más conversaciones?
   - ¿Hay terceras personas mencionadas que participen?

Responde SOLO con JSON arrayя de participantes:
[
  {
    "name": "María",
    "role": "romantic_interest",
    "emotionalIntensity": 0.9,
    "initiatesConversations": 0.4,
    "messageCount": 543,
    "confidence": 0.95,
    "reasoning": "Usa lenguaje cariñoso constante, emojis románticos"
  },
  {
    "name": "Juan",
    "role": "user",
    "emotionalIntensity": 0.7,
    "initiatesConversations": 0.6,
    "messageCount": 612,
    "confidence": 0.95,
    "reasoning": "Inicia más conversaciones, hace más preguntas"
  }
]`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();

        // Parsear JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found');
        }

        const participants: ParticipantAnalysis[] = JSON.parse(jsonMatch[0]);

        // Actualizar messageCount real
        const senderCounts = countMessages(messages);
        participants.forEach(p => {
            p.messageCount = senderCounts.get(p.name) || 0;
        });

        console.log('[ParticipantAI] ✅ Detected:', participants.map(p =>
            `${p.name} (${p.role}, confidence: ${Math.round(p.confidence * 100)}%)`
        ));

        return participants;

    } catch (e: any) {
        console.error('[ParticipantAI] Error:', e?.message || e);
        return detectParticipantsFallback(messages);
    }
}

// ===============================================
// 🧠 EXTRACCIÓN DE MEMORIA DE EVENTOS
// ===============================================

export interface KeyMoment {
    date: string | null;
    event: string;
    emotionalWeight: number; // 1-10
    topic?: string;
    context?: string;
}

export interface MemoryExtraction {
    keyMoments: KeyMoment[];
    importantDates: {
        anniversary?: string;
        firstMeeting?: string;
        breakup?: string;
        [key: string]: string | undefined;
    };
    importantPeople: {
        family: string[];
        friends: string[];
        exes: string[];
    };
    recurringTopics: Array<{
        topic: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        frequency: number;
    }>;
}

/**
 * Extrae eventos clave y memoria de la conversación usando IA
 */
export async function extractKeyEventsWithAI(
    messages: ParsedMessage[],
    exName: string
): Promise<MemoryExtraction> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('[MemoryAI] No API key');
        return getEmptyMemory();
    }

    try {
        // Muestrear mensajes emocionales
        const emotionalMessages = messages.filter(m =>
            /amor|te amo|te quiero|extraño|feliz|triste|enojado|perdón|aniversario|primera vez|conocimos/i.test(m.content)
        );

        const sample = sampleMessages(emotionalMessages.length > 0 ? emotionalMessages : messages, 200);

        const chatText = sample
            .map(m => `[${m.timestamp}] ${m.sender}: ${m.content}`)
            .join('\n');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analiza esta conversación y extrae la MEMORIA de eventos importantes.

CONVERSACIÓN:
${chatText.substring(0, 15000)}

Tu tarea:
1. Identifica momentos clave (primera cita, peleas, reconciliaciones, declaraciones de amor)
2. Extrae fechas importantes mencionadas (aniversarios, cumpleaños)
3. Identifica personas importantes mencionadas (familia, amigos, exes)
4. Detecta temas recurrentes y su tono emocional

Responde SOLO con JSON:
{
  "keyMoments": [
    {
      "date": "2024-03-15" | null,
      "event": "Primera vez que dijeron 'te amo'",
      "emotionalWeight": 10,
      "topic": "amor",
      "context": "Fue después de una cena romántica"
    }
  ],
  "importantDates": {
    "anniversary": "2023-08-10",
    "firstMeeting": "2023-07-15"
  },
  "importantPeople": {
    "family": ["mamá", "hermano"],
    "friends": ["Andrea", "Carlos"],
    "exes": ["Rodrigo"]
  },
  "recurringTopics": [
    {
      "topic": "trabajo",
      "sentiment": "negative",
      "frequency": 25
    }
  ]
}`;

        const response = await model.generateContent(prompt);
        const responseText = response.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found');
        }

        const memory: MemoryExtraction = JSON.parse(jsonMatch[0]);

        console.log('[MemoryAI] ✅ Extracted:', {
            moments: memory.keyMoments?.length || 0,
            dates: Object.keys(memory.importantDates || {}).length,
            people: (memory.importantPeople?.family?.length || 0) +
                (memory.importantPeople?.friends?.length || 0)
        });

        return memory;

    } catch (e: any) {
        console.error('[MemoryAI] Error:', e?.message || e);
        return getEmptyMemory();
    }
}

// ===============================================
// HELPERS
// ===============================================

function sampleMessages(messages: ParsedMessage[], targetCount: number): ParsedMessage[] {
    if (messages.length <= targetCount) return messages;

    const step = Math.max(1, Math.floor(messages.length / targetCount));
    const sampled: ParsedMessage[] = [];

    for (let i = 0; i < messages.length && sampled.length < targetCount; i += step) {
        sampled.push(messages[i]);
    }

    return sampled;
}

function countMessages(messages: ParsedMessage[]): Map<string, number> {
    const counts = new Map<string, number>();
    messages.forEach(m => {
        counts.set(m.sender, (counts.get(m.sender) || 0) + 1);
    });
    return counts;
}

function detectParticipantsFallback(messages: ParsedMessage[]): ParticipantAnalysis[] {
    const counts = countMessages(messages);
    const participants: ParticipantAnalysis[] = [];

    counts.forEach((count, name) => {
        participants.push({
            name,
            role: 'unknown',
            emotionalIntensity: 0.5,
            initiatesConversations: 0.5,
            messageCount: count,
            confidence: 0.3
        });
    });

    return participants.sort((a, b) => b.messageCount - a.messageCount);
}

function getEmptyMemory(): MemoryExtraction {
    return {
        keyMoments: [],
        importantDates: {},
        importantPeople: {
            family: [],
            friends: [],
            exes: []
        },
        recurringTopics: []
    };
}
