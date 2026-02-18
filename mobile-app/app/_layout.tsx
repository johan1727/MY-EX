import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import { AnalysisProvider } from '../lib/AnalysisContext';
import { ThemeProvider } from '../lib/ThemeContext';
import { shouldLockApp, markAppLocked } from '../lib/security';
import AppLockScreen from '../components/AppLockScreen';
import CookieConsent from '../components/CookieConsent';
import AnimatedSplash from '../components/AnimatedSplash';
import ShareIntentModal from '../components/ShareIntentModal';
import { storage } from '../lib/storage';
import { BackgroundAnalysisManager } from '../lib/BackgroundAnalysisManager';
import { AnalysisProgressIndicator } from '../components/AnalysisProgressIndicator';
import WebAnalytics from '../components/WebAnalytics';
import HotjarTracking from '../components/HotjarTracking';
import { NotificationManager } from '../lib/notifications';
import AppErrorBoundary from '../components/AppErrorBoundary';
import * as Sentry from '@sentry/react-native';
import TikTokBusiness, { TiktokEventName } from 'expo-tiktok-business';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

// Initialize Sentry for error monitoring
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        debug: false,
    });
}



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
    const processingRef = useRef(false); // Use ref to avoid blocking re-triggers
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalType, setShareModalType] = useState<'file' | 'text'>('file');
    const authRedirectDone = useRef(false);
    const segments = useSegments();
    const router = useRouter();

    // Handle shared files from WhatsApp (only on native)
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ debug: true });

    // Process share intent - works even when app is already open on any screen
    useEffect(() => {
        if (!hasShareIntent || !shareIntent) return;
        // Prevent double-processing the same intent
        if (processingRef.current) return;
        processingRef.current = true;

        try {
            console.log('[ShareIntent] Detected share intent');

            // Get text content
            const sharedText = shareIntent.text;

            if (sharedText && sharedText.length > 0) {
                console.log('[ShareIntent] Text length:', sharedText.length);

                // Save to storage
                storage.setItem('sharedText', sharedText);
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
        } finally {
            // Always reset so the next share intent can be processed
            processingRef.current = false;
        }
    }, [hasShareIntent, shareIntent]);

    // Initialize TikTok Ads
    // Initialize TikTok Ads with Permission
    useEffect(() => {
        const initTikTok = async () => {
            try {
                // Request IDFA/Tracking Permission (Critical for "Get IDFA" error)
                const { status } = await requestTrackingPermissionsAsync();
                console.log('[TikTok] Tracking permission:', status);

                if (TikTokBusiness) {
                    await (TikTokBusiness as any).init(
                        process.env.EXPO_PUBLIC_TIKTOK_APP_ID || '',
                        process.env.EXPO_PUBLIC_TIKTOK_ACCESS_TOKEN || '',
                        { debugMode: true } // Force Debug Mode for Test Events
                    );
                    console.log('[TikTok] SDK initialized successfully');

                    // Force "Launch" event to appear in dashboard immediately
                    await TikTokBusiness.trackEvent(TiktokEventName.LAUNCH, {});
                    console.log('[TikTok] Launch event tracked manually');
                } else {
                    console.warn('[TikTok] Module not found');
                }
            } catch (e) {
                console.error('[TikTok] Initialization error:', e);
            }
        };
        initTikTok();
    }, []);

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
        router.push('/tools/ex-simulator/import');
    };

    const handleShareCancel = () => {
        setShowShareModal(false);
        // Clear stored data so next export starts fresh
        storage.removeItem('sharedText');
        storage.removeItem('sharedFileUri');
        storage.removeItem('sharedFileName');
    };

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);

            // Fix #5: Clear local profiles on logout to prevent data leak between users
            if (!session) {
                console.log('🔒 Logout detected - clearing local sensitive data...');
                await storage.removeItem('exSimulator_allProfiles');
                await storage.removeItem('exSimulator_currentProfile');
                // Optional: Clear active conversation history too if desired, 
                // but let's start with profiles which is the main privacy concern.
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        checkLockStatus();
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // 🔔 Initialize Notifications
        // Request permissions and schedule daily check-in (8:00 PM)
        const initNotifications = async () => {
            const hasPermission = await NotificationManager.requestPermissions();
            if (hasPermission) {
                await NotificationManager.scheduleDailyCheckIn();
                console.log('[Notifications] Initialized and scheduled daily check-in');
            }
        };
        initNotifications();

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
    // DISABLED PER USER REQUEST (Too slow)
    // if (loading || showSplash) {
    //     return (
    //         <>
    //             <AnimatedSplash onFinish={() => setShowSplash(false)} />
    //             <StatusBar style="light" />
    //         </>
    //     );
    // }

    if (loading) {
        // Minimal loader just while session restores
        return null;
    }

    if (isLocked) {
        return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <AppErrorBoundary>
            <ThemeProvider>
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
                                <Stack.Screen name="subscribe" options={{ presentation: 'modal', headerShown: false }} />
                            </Stack>
                            <ShareIntentModal
                                visible={showShareModal}
                                onAnalyze={handleShareAnalyze}
                                onCancel={handleShareCancel}
                                type={shareModalType}
                            />
                            <CookieConsent />
                            <WebAnalytics />
                            <HotjarTracking />
                            {/* Show progress indicator for any active background analysis - REMOVED PER USER REQUEST */}
                            {/* <AnalysisProgressIndicator /> */}
                            <StatusBar style="light" />
                        </View>
                    </SubscriptionProvider>
                </AnalysisProvider>
            </ThemeProvider>
        </AppErrorBoundary>
    );
}

