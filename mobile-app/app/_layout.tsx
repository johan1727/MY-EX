import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import { AnalysisProvider } from '../lib/AnalysisContext';
import { shouldLockApp, markAppLocked } from '../lib/security';
import AppLockScreen from '../components/AppLockScreen';
import CookieConsent from '../components/CookieConsent';
import AnimatedSplash from '../components/AnimatedSplash';
import ShareIntentModal from '../components/ShareIntentModal';
import { storage } from '../lib/storage';
import { BackgroundAnalysisManager } from '../lib/BackgroundAnalysisManager';
import { AnalysisProgressIndicator } from '../components/AnalysisProgressIndicator';

import { NotificationManager } from '../lib/notifications';

// Conditionally import share intent (not available on web)
let useShareIntent: any = () => ({ hasShareIntent: false, shareIntent: null, resetShareIntent: () => { } });
if (Platform.OS !== 'web') {
    useShareIntent = require('expo-share-intent').useShareIntent;
}

// Import global CSS for web-specific styles
if (Platform.OS === 'web') {
    require('./global.css');
}

export default function RootLayout() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [shareIntentHandled, setShareIntentHandled] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalType, setShareModalType] = useState<'file' | 'text'>('file');
    const authRedirectDone = useRef(false);
    const segments = useSegments();
    const router = useRouter();

    // Handle shared files from WhatsApp (only on native)
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ debug: true });

    // Process share intent - MINIMAL VERSION
    useEffect(() => {
        // Only process after splash and if not already handled
        if (showSplash || shareIntentHandled) return;
        if (!hasShareIntent || !shareIntent) return;

        try {
            console.log('[ShareIntent] Detected share intent');

            // Get text content
            const sharedText = shareIntent.text;

            if (sharedText && sharedText.length > 0) {
                console.log('[ShareIntent] Text length:', sharedText.length);

                // Save to storage
                storage.setItem('sharedText', sharedText);
                setShareIntentHandled(true);
                resetShareIntent();

                // Show custom modal
                setShareModalType('text');
                setShowShareModal(true);
                return;
            }

            // Check for files
            const files = shareIntent.files;
            if (files && files.length > 0) {
                const file = files[0] as any;
                const path = file?.filePath || file?.contentUri || file?.path;

                if (path) {
                    console.log('[ShareIntent] File path:', path);
                    storage.setItem('sharedFileUri', path);
                    storage.setItem('sharedFileName', file?.fileName || 'chat.txt');
                    setShareIntentHandled(true);
                    resetShareIntent();

                    // Show custom modal
                    setShareModalType('file');
                    setShowShareModal(true);
                    return;
                }
            }

            console.log('[ShareIntent] No valid content');
            resetShareIntent();
        } catch (err) {
            console.error('[ShareIntent] Error:', err);
            resetShareIntent();
        }
    }, [showSplash, shareIntentHandled, hasShareIntent, shareIntent]);

    // AUTO-NAVIGATION: Listen for analysis completions
    useEffect(() => {
        const unsubscribe = BackgroundAnalysisManager.onAnalysisCompleted(({ exName, profileId }) => {
            console.log('[RootLayout] Analysis completed for:', exName, 'Profile ID:', profileId);

            // Save profile ID to navigate to
            storage.setItem('exSimulator_navigateToProfile', profileId);

            // Navigate to chat immediately
            router.push(`/(tabs)`);
        });

        return () => unsubscribe();
    }, [router]);

    // Handle modal actions
    const handleShareAnalyze = () => {
        setShowShareModal(false);
        // Reset so user can export another file later
        setTimeout(() => setShareIntentHandled(false), 1000);
        router.push('/tools/ex-simulator/import');
    };

    const handleShareCancel = () => {
        setShowShareModal(false);
        // Clear stored data and reset for next export
        storage.removeItem('sharedText');
        storage.removeItem('sharedFileUri');
        storage.removeItem('sharedFileName');
        setShareIntentHandled(false);
    };

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

        // Prevent multiple redirects
        if (authRedirectDone.current) return;

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
            authRedirectDone.current = true;
            // Small delay to ensure navigation is ready
            setTimeout(() => {
                checkOnboardingStatus();
            }, 300);
        }
        // Sin sesión: el usuario puede usar la app normalmente
        // Las funciones que requieren BD mostrarán su propio prompt de login
    }, [session, segments, loading]);

    const checkOnboardingStatus = async () => {
        if (!session?.user) return;

        // Ensure we don't navigate too fast
        if (!authRedirectDone.current) return;

        if (segments[0] !== '(tabs)') {
            router.replace('/(tabs)');
        }
    };

    // Show animated splash screen on first load
    if (loading || showSplash) {
        return (
            <>
                <AnimatedSplash onFinish={() => setShowSplash(false)} />
                <StatusBar style="light" />
            </>
        );
    }

    if (isLocked) {
        return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <AnalysisProvider>
            <SubscriptionProvider>
                <View style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="welcome" />
                        <Stack.Screen name="auth" />
                        <Stack.Screen name="auth/callback" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="tools/decoder" />
                        <Stack.Screen name="tools/panic" />
                        {/* Main Simulator is now /(tabs)/chat, keeping import as tool */}
                        <Stack.Screen name="tools/ex-simulator/import" />
                        <Stack.Screen name="tools/ex-simulator/analysis" />
                        <Stack.Screen name="tools/journal" />
                        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                    </Stack>
                    <ShareIntentModal
                        visible={showShareModal}
                        onAnalyze={handleShareAnalyze}
                        onCancel={handleShareCancel}
                        type={shareModalType}
                    />
                    <CookieConsent />
                    {/* Show progress indicator for any active background analysis - REMOVED PER USER REQUEST */}
                    {/* <AnalysisProgressIndicator /> */}
                    <StatusBar style="light" />
                </View>
            </SubscriptionProvider>
        </AnalysisProvider>
    );
}

