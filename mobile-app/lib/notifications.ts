import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export class NotificationManager {
    static async requestPermissions() {
        if (Platform.OS === 'web') return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return false;
        }
        return true;
    }

    static async scheduleDailyCheckIn() {
        if (Platform.OS === 'web') return;

        // Cancel existing scheduled notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Get user context for personalized message
        const { data: { user } } = await supabase.auth.getUser();
        let messageBody = "¿Cómo te sientes hoy? Estoy aquí para escucharte.";

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('breakup_date, name')
                .eq('id', user.id)
                .single();

            if (profile?.breakup_date) {
                const daysSince = Math.floor((Date.now() - new Date(profile.breakup_date).getTime()) / (1000 * 60 * 60 * 24));
                const name = profile.name ? `, ${profile.name}` : '';

                if (daysSince < 7) {
                    messageBody = `Día ${daysSince}${name}: Es normal que duela. ¿Quieres hablar un poco?`;
                } else if (daysSince < 30) {
                    messageBody = `Día ${daysSince}: Un día a la vez. ¿Cómo va tu proceso hoy?`;
                } else {
                    messageBody = `¡${daysSince} días de progreso! ¿Qué tal te sientes hoy?`;
                }
            }
        }

        // Schedule for 8:00 PM
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Ex Coach - Check-in Diario 🌙",
                body: messageBody,
                sound: true,
            },
            trigger: {
                hour: 20,
                minute: 0,
                repeats: true,
            },
        });
    }

    // For testing purposes
    static async sendTestNotification() {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Prueba de Notificación",
                body: "Si ves esto, las notificaciones están funcionando correctamente.",
            },
            trigger: null, // Send immediately
        });
    }
}
