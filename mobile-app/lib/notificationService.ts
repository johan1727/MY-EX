import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getRandomPhrase, getStreakCelebration } from './motivationalPhrases';
import { getPersonalizedMessage, getNotificationTitle } from './personalizedNotifications';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#a855f7',
                sound: 'default',
                showBadge: true,
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

        // Save to Supabase if userId is provided
        if (userId && token) {
            const { error } = await supabase
                .from('profiles')
                .update({ push_token: token })
                .eq('id', userId);

            if (error) console.error('Error saving push token to DB:', error);
            else console.log('Push token saved to DB for user:', userId);
        }

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

        // Get user settings
        const { data: settings } = await supabase
            .from('user_settings')
            .select('personalized_notifications')
            .eq('user_id', userId)
            .single();

        const usePersonalized = settings?.personalized_notifications !== false; // Default true

        let title = '💜 Tu Ex Coach';
        let body = '';
        let data: any = { type: 'daily_motivation' };

        if (usePersonalized) {
            // Get most recent or primary profile
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, relationship_type, language, breakup_date')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (profiles && profiles.length > 0) {
                const profile = profiles[0];
                const language = profile.language || 'es';
                const relationshipType = profile.relationship_type || 'ex';
                const name = profile.name || 'Ex';

                // Use personalized template
                title = getNotificationTitle(relationshipType, name, language as 'es' | 'en');
                body = getPersonalizedMessage(relationshipType, name, language as 'es' | 'en');
                data = {
                    type: 'personalized_ex',
                    profileId: profile.id,
                    deepLink: `soy-remi://simulator/${profile.id}`
                };
            } else {
                // Fallback to classic if no profile
                // usePersonalized will remain true but body will be empty, triggering classic fallback
            }
        }

        // Classic mode fallback
        if (!usePersonalized || !body) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('breakup_date, language')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const language = profile?.language || 'es';
            let daysSinceBreakup = 30;

            if (profile?.breakup_date) {
                const breakupDate = new Date(profile.breakup_date);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - breakupDate.getTime());
                daysSinceBreakup = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            const phrase = getRandomPhrase(language as 'es' | 'en', daysSinceBreakup);
            const celebration = getStreakCelebration(daysSinceBreakup, language as 'es' | 'en');

            title = celebration ? '🎉 ¡Logro Desbloqueado!' : '💜 Tu Ex Coach';
            body = celebration || phrase;
            data = { type: 'daily_motivation' };
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data,
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
