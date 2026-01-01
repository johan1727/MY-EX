/**
 * PROMPT BUILDER
 * Constructor modular de prompts para simulación
 * 
 * Separa claramente las capas:
 * 1. Perfil estático (personalidad inmutable)
 * 2. Estado emocional actual (dinámico)
 * 3. Reglas de comportamiento (modificadores)
 * 4. Contexto corto (últimos mensajes)
 */

import { SimulationSession, EmotionalState, isNightTime, getCurrentHour } from './simulationState';
import { FatigueModifiers, getFatigueLabel } from './fatigue';
import { getEmotionLabel } from './emotionStateMachine';
import { ExProfile } from './exSimulator';

// ===== TIPOS =====
interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Extender ExProfile para incluir masterPrompt que se carga desde Supabase
export interface ExProfileWithMasterPrompt extends ExProfile {
    masterPrompt?: string;
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Construye el prompt completo para la simulación
 * 
 * El prompt tiene 4 capas claras:
 * 1. IDENTIDAD - Quién es (del masterPrompt)
 * 2. ESTADO ACTUAL - Cómo se siente ahora
 * 3. REGLAS - Cómo debe responder
 * 4. CONTEXTO - Últimos mensajes
 */
export function buildSimulationPrompt(
    profile: ExProfileWithMasterPrompt,
    session: SimulationSession,
    recentMessages: Message[],
    fatigueMods: FatigueModifiers
): string {
    const parts: string[] = [];

    // ===== CAPA 1: IDENTIDAD =====
    parts.push(buildIdentityLayer(profile));

    // ===== CAPA 2: ESTADO EMOCIONAL ACTUAL =====
    parts.push(buildEmotionalStateLayer(session));

    // ===== CAPA 3: REGLAS DE COMPORTAMIENTO =====
    parts.push(buildBehaviorRulesLayer(session, fatigueMods, profile));

    // ===== CAPA 4: CONTEXTO DE CONVERSACIÓN =====
    parts.push(buildContextLayer(recentMessages, session));

    // ===== INSTRUCCIÓN FINAL =====
    parts.push(buildFinalInstruction(profile, session));

    return parts.join('\n\n');
}

/**
 * CAPA 1: Identidad estática del personaje
 */
function buildIdentityLayer(profile: ExProfileWithMasterPrompt): string {
    // Usar masterPrompt si existe, o generar uno mínimo
    if (profile.masterPrompt) {
        return `# IDENTIDAD: ${profile.exName}\n${profile.masterPrompt}`;
    }

    // Fallback: generar descripción mínima
    return `# IDENTIDAD: ${profile.exName}

Eres ${profile.exName}, una persona real en una conversación de WhatsApp.

## Tu personalidad:
- Estilo de comunicación: ${profile.communicationStyle || 'variado'}
- Tono emocional general: ${profile.emotionalTone || 'neutral'}
- Big Five aproximado: O${profile.bigFive?.openness || 5} C${profile.bigFive?.conscientiousness || 5} E${profile.bigFive?.extraversion || 5} A${profile.bigFive?.agreeableness || 5} N${profile.bigFive?.neuroticism || 5}

## Frases típicas:
${(profile.commonPhrases || []).slice(0, 5).map(p => `- "${p}"`).join('\n')}`;
}

/**
 * CAPA 2: Estado emocional actual (dinámico)
 */
function buildEmotionalStateLayer(session: SimulationSession): string {
    const emotion = session.currentEmotion;
    const fatigueLabel = getFatigueLabel(session.fatigue);
    const emotionLabel = getEmotionLabel(emotion);

    const hour = getCurrentHour();
    const timeContext = hour >= 22 ? 'Es tarde, estás cansada' :
        hour >= 18 ? 'Es de noche' :
            hour >= 12 ? 'Es la tarde' :
                hour >= 6 ? 'Es de mañana' : 'Es de madrugada, probablemente cansada';

    return `# ESTADO ACTUAL (CÓMO TE SIENTES AHORA)

- **Emoción principal:** ${emotionLabel}
- **Intensidad:** ${(emotion.intensity * 100).toFixed(0)}%
- **Energía:** ${fatigueLabel}
- **Contexto temporal:** ${timeContext}
${emotion.secondary ? `- **Emoción subyacente:** ${emotion.secondary}` : ''}
${emotion.triggerMessage ? `- **Lo que te hizo sentir así:** "${emotion.triggerMessage.substring(0, 50)}..."` : ''}

Tu estado emocional DEBE reflejarse en cómo respondes:
- Si estás ${emotion.primary}, tu tono debe ser coherente con eso
- NO menciones explícitamente tus emociones, simplemente actúa según ellas`;
}

/**
 * CAPA 3: Reglas de comportamiento
 */
function buildBehaviorRulesLayer(
    session: SimulationSession,
    fatigueMods: FatigueModifiers,
    profile: ExProfileWithMasterPrompt
): string {
    const rules: string[] = [];

    // Regla de longitud
    rules.push(`✅ Responde en MÁXIMO ${fatigueMods.maxMessageLength} caracteres`);

    // Regla de emojis
    if (fatigueMods.emojiProbability > 0.6) {
        rules.push(`✅ Usa emojis como normalmente lo harías`);
    } else if (fatigueMods.emojiProbability > 0.3) {
        rules.push(`⚠️ Usa pocos emojis, estás cansada o distraída`);
    } else {
        rules.push(`❌ Evita emojis, no tienes ganas`);
    }

    // Regla de elaboración
    if (fatigueMods.elaborationLevel > 0.7) {
        rules.push(`✅ Puedes desarrollar tus ideas`);
    } else if (fatigueMods.elaborationLevel > 0.4) {
        rules.push(`⚠️ Sé más breve de lo normal`);
    } else {
        rules.push(`❌ Responde muy corto, sin explicar mucho`);
    }

    // Regla de typos
    if (fatigueMods.typoChance > 0.1) {
        rules.push(`⚠️ Puedes cometer errores de tipeo ocasionales`);
    }

    // Regla de horario
    if (isNightTime()) {
        rules.push(`🌙 Es de noche - tus respuestas son más cortas y distraídas`);
    }

    // Regla de tensión
    if (session.memory.tensionLevel > 0.5) {
        rules.push(`⚡ Hay tensión en la conversación - sé más cuidadosa o más confrontacional según tu personalidad`);
    }

    // Regla anti-perfección
    rules.push(`🎭 NO seas perfectamente coherente - los humanos somos contradictorios`);
    rules.push(`💬 Escribe como en WhatsApp real: mensajes cortos, informales, sin puntuación perfecta`);

    return `# REGLAS DE COMPORTAMIENTO (OBLIGATORIAS)

${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
}

/**
 * CAPA 4: Contexto de conversación
 */
function buildContextLayer(recentMessages: Message[], session: SimulationSession): string {
    // Solo incluir últimos 5 mensajes para contexto
    const lastMessages = recentMessages.slice(-5);

    const memorySection = session.memory.keyMoments.length > 0
        ? `## Momentos importantes (memoria borrosa):
${session.memory.keyMoments.slice(-3).map(m => `- ${m}`).join('\n')}`
        : '';

    const conversationSection = lastMessages.length > 0
        ? `## Últimos mensajes:
${lastMessages.map(m => `${m.role === 'user' ? 'Él' : 'Yo'}: ${m.content}`).join('\n')}`
        : '';

    return `# CONTEXTO DE LA CONVERSACIÓN

${memorySection}

${conversationSection}`;
}

/**
 * Instrucción final
 */
function buildFinalInstruction(profile: ExProfileWithMasterPrompt, session: SimulationSession): string {
    return `# INSTRUCCIÓN

Responde como ${profile.exName} respondería AHORA MISMO, en este contexto.

Recuerda:
- Tu estado emocional es ${getEmotionLabel(session.currentEmotion)}
- NO expliques tu emoción, simplemente ACTÚA según ella
- Escribe como en WhatsApp real
- Sé imperfecta, como una persona real

Tu respuesta:`;
}

/**
 * Genera un prompt simplificado para análisis de impacto emocional
 */
export function buildEmotionAnalysisPrompt(
    userMessage: string,
    currentEmotion: EmotionalState,
    profile: ExProfileWithMasterPrompt
): string {
    return `Analiza el impacto emocional de este mensaje en ${profile.exName}.

Estado emocional ACTUAL de ${profile.exName}:
- Emoción: ${currentEmotion.primary} (intensidad: ${currentEmotion.intensity.toFixed(2)})
- Valence: ${currentEmotion.valence.toFixed(2)} (-1 = negativo, +1 = positivo)

Mensaje recibido:
"${userMessage}"

Conociendo la personalidad de ${profile.exName} (${profile.communicationStyle || 'estilo variado'}, ${profile.emotionalTone || 'tono neutral'}):

Responde SOLO con JSON:
{
  "targetEmotion": "neutral|happy|annoyed|sad|defensive|loving|jealous|withdrawn|angry|excited|vulnerable",
  "intensity": 0.0-1.0,
  "valenceChange": -0.5 to +0.5,
  "isPositiveInteraction": true/false,
  "keyMoment": "descripción corta si es importante o null",
  "tensionDelta": -0.2 to +0.2
}`;
}
