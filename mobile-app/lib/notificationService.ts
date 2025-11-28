import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getRandomPhrase, getStreakCelebration } from './motivationalPhrases';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotifications(): Promise<string | null> {
    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#a855f7',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
        return null;
    }
}

export async function scheduleDailyNotification(
    userId: string,
    hour: number = 9,
    minute: number = 0
): Promise<string | null> {
    try {
        // Cancel existing daily notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Get user profile for personalization
        const { data: profile } = await supabase
            .from('profiles')
            .select('breakup_date, language')
            .eq('id', userId)
            .single();

        const language = profile?.language || 'es';
        let daysSinceBreakup = 30; // Default

        if (profile?.breakup_date) {
            const breakupDate = new Date(profile.breakup_date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - breakupDate.getTime());
            daysSinceBreakup = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // Get motivational phrase
        const phrase = getRandomPhrase(language as 'es' | 'en', daysSinceBreakup);

        // Check for streak celebration
        const celebration = getStreakCelebration(daysSinceBreakup, language as 'es' | 'en');

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: celebration ? '🎉 ¡Logro Desbloqueado!' : '💜 Tu Ex Coach',
                body: celebration || phrase,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { type: 'daily_motivation' },
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling daily notification:', error);
        return null;
    }
}

export async function sendImmediateNotification(
    title: string,
    body: string,
    data?: any
): Promise<void> {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: data || {},
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.error('Error sending immediate notification:', error);
    }
}

export async function scheduleStreakReminder(
    userId: string,
    hour: number = 20,
    minute: number = 0
): Promise<string | null> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('breakup_date, language')
            .eq('id', userId)
            .single();

        const language = profile?.language || 'es';

        const reminders = {
            es: [
                '🔥 Mantén tu racha de no contacto. ¡Vas muy bien!',
                '💪 Recuerda: cada día sin contacto es una victoria.',
                '✨ Tu racha de sanación continúa. Sigue así.',
                '🌟 No rompas tu racha. Tu yo del futuro te lo agradecerá.',
            ],
            en: [
                '🔥 Keep your no-contact streak going. You\'re doing great!',
                '💪 Remember: every day of no contact is a victory.',
                '✨ Your healing streak continues. Keep it up.',
                '🌟 Don\'t break your streak. Your future self will thank you.',
            ]
        };

        const randomReminder = reminders[language as 'es' | 'en'][
            Math.floor(Math.random() * reminders[language as 'es' | 'en'].length)
        ];

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: language === 'es' ? '🔥 Racha Activa' : '🔥 Active Streak',
                body: randomReminder,
                sound: true,
                data: { type: 'streak_reminder' },
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling streak reminder:', error);
        return null;
    }
}

export async function cancelAllNotifications(): Promise<void> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error canceling notifications:', error);
    }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error getting scheduled notifications:', error);
        return [];
    }
}
