import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExProfile, ParsedMessage } from './exSimulator';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export interface ProactiveMessageConfig {
    profileId: string;
    exName: string;
    profile: ExProfile;
    lastMessages: ParsedMessage[];
    frequency: 'low' | 'normal' | 'high';
}

/**
 * Generate a contextual proactive message from the Ex
 * Based on personality profile and recent conversation
 */
export async function generateProactiveMessage(config: ProactiveMessageConfig): Promise<string> {
    const { exName, profile, lastMessages, frequency } = config;

    // Build context from last messages
    const conversationContext = lastMessages
        .slice(-5)
        .map(m => `${m.sender === 'user' ? 'Usuario' : exName}: ${m.content}`)
        .join('\n');

    const prompt = `Eres ${exName}, y estás enviando un mensaje proactivo a tu ex pareja.

PERFIL DE PERSONALIDAD:
- Estilo de comunicación: ${profile.communicationStyle}
- Tono emocional: ${profile.emotionalTone}
- Frases características: ${profile.commonPhrases?.join(', ')}
- Patrones de respuesta: ${profile.responsePatterns?.join(', ')}

ÚLTIMOS MENSAJES DE LA CONVERSACIÓN:
${conversationContext || 'No hay mensajes previos'}

FRECUENCIA DE MENSAJES: ${frequency}
${frequency === 'high' ? '(Eres muy activo/a, envías mensajes frecuentemente)' : ''}
${frequency === 'low' ? '(Eres más reservado/a, envías mensajes ocasionalmente)' : ''}

INSTRUCCIONES:
1. Genera UN mensaje corto y natural que ${exName} enviaría
2. Debe ser coherente con la conversación previa (si existe)
3. Usa el estilo de comunicación y frases características del perfil
4. El mensaje debe sentirse REAL, como si ${exName} realmente lo escribiera
5. NO uses emojis excesivos, mantén el estilo del perfil
6. El mensaje debe invitar a continuar la conversación

IMPORTANTE: Responde SOLO con el mensaje, sin explicaciones adicionales.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(prompt);
        const message = result.response.text().trim();

        return message;
    } catch (error) {
        console.error('Error generating proactive message:', error);
        // Fallback to common phrase
        if (profile.commonPhrases && profile.commonPhrases.length > 0) {
            return profile.commonPhrases[Math.floor(Math.random() * profile.commonPhrases.length)];
        }
        return 'Hola, cómo estás?';
    }
}

/**
 * Calculate next proactive message time based on frequency
 */
export function calculateNextMessageTime(frequency: 'low' | 'normal' | 'high'): number {
    const baseHours = {
        low: 24,      // Once a day
        normal: 12,   // Twice a day
        high: 6       // 4 times a day
    };

    const hours = baseHours[frequency];
    // Add some randomness (±2 hours)
    const randomOffset = (Math.random() - 0.5) * 4;
    const totalHours = hours + randomOffset;

    return totalHours * 60 * 60; // Convert to seconds
}

/**
 * Schedule a proactive message for an ex profile
 */
export async function scheduleProactiveMessageForProfile(profileId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get profile data
        const { data: exProfile, error: profileError } = await supabase
            .from('ex_profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (profileError || !exProfile) {
            console.error('Error loading ex profile:', profileError);
            return;
        }

        // Check if profile is active
        if (!exProfile.is_active) {
            console.log('Profile is paused, skipping proactive message');
            return;
        }

        // Get last messages from simulation sessions
        const { data: sessions } = await supabase
            .from('simulation_sessions')
            .select('messages')
            .eq('ex_profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1);

        const lastMessages: ParsedMessage[] = sessions && sessions[0]?.messages
            ? sessions[0].messages.slice(-5)
            : [];

        // Generate message
        const config: ProactiveMessageConfig = {
            profileId,
            exName: exProfile.ex_name,
            profile: exProfile.profile_data,
            lastMessages,
            frequency: exProfile.message_frequency || 'normal'
        };

        const messageContent = await generateProactiveMessage(config);

        // Calculate when to send
        const delaySeconds = calculateNextMessageTime(config.frequency);

        // Save to queue
        const { error: queueError } = await supabase
            .from('proactive_messages_queue')
            .insert({
                ex_profile_id: profileId,
                user_id: user.id,
                message_content: messageContent,
                scheduled_for: new Date(Date.now() + delaySeconds * 1000).toISOString(),
                status: 'pending'
            });

        if (queueError) {
            console.error('Error queuing proactive message:', queueError);
        } else {
            console.log(`Proactive message scheduled for ${exProfile.ex_name} in ${Math.round(delaySeconds / 3600)} hours`);
        }

        // Update last proactive message time
        await supabase
            .from('ex_profiles')
            .update({ last_proactive_message: new Date().toISOString() })
            .eq('id', profileId);

    } catch (error) {
        console.error('Error scheduling proactive message:', error);
    }
}

/**
 * Process pending proactive messages (call this periodically)
 */
export async function processPendingProactiveMessages() {
    try {
        const { data: pendingMessages } = await supabase
            .from('proactive_messages_queue')
            .select('*, ex_profiles(ex_name)')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .limit(10);

        if (!pendingMessages || pendingMessages.length === 0) {
            return;
        }

        for (const msg of pendingMessages) {
            // Send notification
            const { NotificationManager } = await import('./notifications');
            await NotificationManager.sendProactiveMessageNotification(
                msg.ex_profiles.ex_name,
                msg.message_content,
                msg.ex_profile_id
            );

            // Mark as sent
            await supabase
                .from('proactive_messages_queue')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                .eq('id', msg.id);

            // Schedule next message
            await scheduleProactiveMessageForProfile(msg.ex_profile_id);
        }
    } catch (error) {
        console.error('Error processing proactive messages:', error);
    }
}
