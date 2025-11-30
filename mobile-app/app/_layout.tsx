import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import { shouldLockApp, markAppLocked } from '../lib/security';
import AppLockScreen from '../components/AppLockScreen';

import { NotificationManager } from '../lib/notifications';

export default function RootLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Initialize notifications
        NotificationManager.requestPermissions().then((granted) => {
            if (granted) {
                NotificationManager.scheduleDailyCheckIn();
            }
        });

        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                NotificationManager.scheduleDailyCheckIn();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        checkLockStatus();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    const checkLockStatus = async () => {
        const shouldLock = await shouldLockApp();
        setIsLocked(shouldLock);
    };

    const handleAppStateChange = async (nextAppState: string) => {
        if (nextAppState === 'background') {
            await markAppLocked();
        } else if (nextAppState === 'active') {
            await checkLockStatus();
        }
    };

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'auth';
        const inOnboarding = segments[0] === 'onboarding';

        if (!session && !inAuthGroup) {
            // Redirect to auth if not logged in and not in auth group
            router.replace('/auth');
        } else if (session && inAuthGroup) {
            // If logged in and in auth group, check onboarding
            checkOnboardingStatus();
        }
    }, [session, segments, loading]);

    const checkOnboardingStatus = async () => {
        if (!session?.user) return;

        const { data } = await supabase
            .from('profiles')
            .select('goal')
            .eq('id', session.user.id)
            .single();

        if (!data?.goal) {
            router.replace('/onboarding-extended');
        } else {
            router.replace('/(tabs)');
        }
    };

    if (isLocked) {
        return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <SubscriptionProvider>
            <View className="flex-1">
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="auth" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="onboarding-extended" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="tools/decoder" />
                    <Stack.Screen name="tools/panic" />
                    <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="security-setup" />
                </Stack>
                <StatusBar style="light" />
            </View>
        </SubscriptionProvider>
    );
}
