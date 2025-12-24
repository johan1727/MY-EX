import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import { shouldLockApp, markAppLocked } from '../lib/security';
import AppLockScreen from '../components/AppLockScreen';

import { NotificationManager } from '../lib/notifications';

// Import global CSS for web-specific styles
if (Platform.OS === 'web') {
    require('./global.css');
}

export default function RootLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
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
        const inLogin = segments[0] === 'login';
        const inOnboarding = segments[0] === 'onboarding';

        // ============================================
        // GUEST MODE: Permitir acceso sin sesión (como ChatGPT/Gemini)
        // El usuario puede usar chat y simulador sin cuenta
        // Solo funciones que requieren BD pedirán login
        // ============================================

        // Si está logueado y en pantalla de auth, redirigir a la app
        if (session && (inAuthGroup || inLogin)) {
            checkOnboardingStatus();
        }
        // Sin sesión: el usuario puede usar la app normalmente
        // Las funciones que requieren BD mostrarán su propio prompt de login
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

    // Show dark loading screen while session is being checked
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
                <StatusBar style="light" />
            </View>
        );
    }

    if (isLocked) {
        return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <SubscriptionProvider>
            <View style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="welcome" />
                    <Stack.Screen name="auth" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="onboarding-extended" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="tools/decoder" />
                    <Stack.Screen name="tools/panic" />
                    {/* Main Simulator is now /(tabs)/chat, keeping import as tool */}
                    <Stack.Screen name="tools/ex-simulator/import" />
                    <Stack.Screen name="tools/journal" />
                    <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="security-setup" />
                </Stack>
                <StatusBar style="light" />
            </View>
        </SubscriptionProvider>
    );
}
