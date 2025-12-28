import { supabase } from './supabase';

/**
 * Sistema de Mensajes Proactivos usando proactive_messages_queue
 */

export interface ProactiveMessage {
    id: string;
    exProfileId: string;
    userId: string;
    messageContent: string;
    scheduledFor: Date;
    sentAt?: Date;
    status: 'pending' | 'sent' | 'failed';
}

/**
 * Verificar si debe enviar un mensaje proactivo
 */
export async function checkProactiveMessage(
    userId: string,
    exProfileId: string
): Promise<{ shouldSend: boolean; message?: string }> {
    try {
        console.log(`[ProactiveMessages] Checking for profile ${exProfileId}`);

        // 1. Obtener última actividad de la conversación
        const { data: conv } = await supabase
            .from('simulation_conversations')
            .select('last_message_at')
            .eq('user_id', userId)
            .eq('ex_profile_id', exProfileId)
            .maybeSingle();

        if (!conv || !conv.last_message_at) {
            return { shouldSend: false };
        }

        // 2. Calcular horas desde último mensaje
        const lastMessageDate = new Date(conv.last_message_at);
        const hoursSinceLastMessage =
            (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60);

        console.log(`[ProactiveMessages] Hours since last message: ${hoursSinceLastMessage.toFixed(1)}`);

        // 3. Si > 12 horas, verificar si ya hay mensaje pendiente
        if (hoursSinceLastMessage > 12) {
            // Verificar si ya se envió uno recientemente
            const { data: existing } = await supabase
                .from('proactive_messages_queue')
                .select('*')
                .eq('ex_profile_id', exProfileId)
                .eq('status', 'sent')
                .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
                .maybeSingle();

            if (existing) {
                console.log('[ProactiveMessages] Already sent proactive message in last 24h');
                return { shouldSend: false };
            }

            // 4. Generar mensaje proactivo
            const messages = [
                "Ey, todo bien? 👋",
                "Qué onda? Hace rato no hablamos",
                "Hey! Cómo has estado?",
                "Hace días no sé de ti, todo ok?",
                "Qué tal todo?"
            ];

            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            return {
                shouldSend: true,
                message: randomMessage
            };
        }

        return { shouldSend: false };
    } catch (error: any) {
        console.error('[ProactiveMessages] ❌ Error checking:', error);
        return { shouldSend: false };
    }
}

/**
 * Programar un mensaje proactivo
 */
export async function scheduleProactiveMessage(
    userId: string,
    exProfileId: string,
    message: string,
    scheduledFor?: Date
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('proactive_messages_queue')
            .insert({
                user_id: userId,
                ex_profile_id: exProfileId,
                message_content: message,
                scheduled_for: (scheduledFor || new Date()).toISOString(),
                status: 'pending'
            });

        if (error) throw error;

        console.log('[ProactiveMessages] ✅ Scheduled message');
        return { success: true };
    } catch (error: any) {
        console.error('[ProactiveMessages] ❌ Error scheduling:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Marcar mensaje como enviado
 */
export async function markProactiveMessageSent(
    messageId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('proactive_messages_queue')
            .update({
                sent_at: new Date().toISOString(),
                status: 'sent'
            })
            .eq('id', messageId);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('[ProactiveMessages] ❌ Error marking sent:', error);
        return false;
    }
}

/**
 * Obtener mensajes proactivos pendientes
 */
export async function getPendingProactiveMessages(
    userId: string
): Promise<ProactiveMessage[]> {
    try {
        const { data, error } = await supabase
            .from('proactive_messages_queue')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .order('scheduled_for', { ascending: true });

        if (error) throw error;

        return (data || []).map(d => ({
            id: d.id,
            exProfileId: d.ex_profile_id,
            userId: d.user_id,
            messageContent: d.message_content,
            scheduledFor: new Date(d.scheduled_for),
            sentAt: d.sent_at ? new Date(d.sent_at) : undefined,
            status: d.status
        }));
    } catch (error: any) {
        console.error('[ProactiveMessages] ❌ Error getting pending:', error);
        return [];
    }
}

/**
 * Actualizar timestamp de último mensaje proactivo en perfil
 */
export async function updateLastProactiveTimestamp(
    exProfileId: string
): Promise<void> {
    try {
        await supabase
            .from('ex_profiles')
            .update({ last_proactive_message: new Date().toISOString() })
            .eq('id', exProfileId);
    } catch (error) {
        console.error('[ProactiveMessages] ❌ Error updating timestamp:', error);
    }
}
