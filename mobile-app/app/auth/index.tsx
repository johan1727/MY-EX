import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    ScrollView,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Brain } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../../lib/ThemeContext';

// Try to import native Google Sign-In
let GoogleSignin: any = null;
let statusCodes: any = null;
let isNativeGoogleSignInAvailable = false;

try {
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
    isNativeGoogleSignInAvailable = Platform.OS !== 'web';

    if (isNativeGoogleSignInAvailable && GoogleSignin) {
        GoogleSignin.configure({
            webClientId: '217853738800-ncr5qhb1aatrhqskthmr2llulj6vgkkp.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }
} catch (e) {
    isNativeGoogleSignInAvailable = false;
}

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function AuthScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            if (hasNavigated) return;

            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession && !hasNavigated) {
                setHasNavigated(true);
                router.replace('/welcome-confirmation');
                return;
            }

            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const searchParams = new URLSearchParams(window.location.search);
                const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (!error && data.session) {
                        window.history.replaceState(null, '', window.location.pathname);
                        setHasNavigated(true);
                        setTimeout(() => router.replace('/welcome-confirmation'), 100);
                        return;
                    }
                }
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !hasNavigated) {
                setHasNavigated(true);
                setTimeout(() => router.replace('/welcome-confirmation'), 100);
            }
        });

        return () => subscription.unsubscribe();
    }, [hasNavigated]);

    const handleOAuthLogin = async (provider: 'google') => {
        console.log('Google login pressed');
        try {
            setOauthLoading(provider);
            setErrorMsg(null);

            if (Platform.OS === 'web' || !isNativeGoogleSignInAvailable) {

                // Use default Expo scheme for dev/preview
                const redirectUrl = Linking.createURL('auth');
                console.log('Using redirect URL:', redirectUrl);

                if (Platform.OS === 'web') {
                    // Web-specific: Explicitly use window.location.origin to ensure localhost is used
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
                    const targetUrl = `${origin}/auth`; // URL matching the file structure
                    console.log('[Auth] Web Redirect URL:', targetUrl);

                    const { error } = await supabase.auth.signInWithOAuth({
                        provider,
                        options: {
                            redirectTo: targetUrl,
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        }
                    });
                    if (error) throw error;
                    // No further code needed, browser will redirect
                    return;
                }

                // Native / Mobile (Popup flow)
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });

                if (error) throw error;

                if (data?.url) {
                    console.log('Opening auth session with URL:', data.url);
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                    console.log('Auth session result:', result);

                    if (result.type === 'success' && result.url) {
                        const url = result.url;
                        const fragment = url.includes('#') ? url.split('#')[1] : null;
                        const query = url.includes('?') ? url.split('?')[1] : null;
                        const params = new URLSearchParams(fragment || query || '');

                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');

                        if (accessToken && refreshToken) {
                            console.log('Got tokens from URL, setting session...');
                            const { error: sessionError } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (!sessionError) {
                                console.log('Session set successfully!');
                                router.replace('/welcome-confirmation');
                            }
                        }
                    }
                }
            } else {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                const tokens = await GoogleSignin.getTokens();
                if (!tokens.idToken) throw new Error('No se pudo obtener el token de Google');
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: tokens.idToken,
                });
                if (error) throw error;
                router.replace('/welcome-confirmation');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.code !== statusCodes?.SIGN_IN_CANCELLED && error.code !== statusCodes?.IN_PROGRESS) {
                setErrorMsg(error.message || 'Error al iniciar sesión');
            }
        } finally {
            setOauthLoading(null);
        }
    };

    // Theme Aware UI
    const { isDark } = useTheme(); // Note: ensure ThemeContext is imported if not already. 
    // If not, we'll add the import in a separate step or assume it's available in snippet context.

    // Theme Colors
    const bgColors = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#FFF' : '#111827';
    const subTextColor = isDark ? '#E9D5FF' : '#7c3aed'; // Purple shade for light mode
    const brainBg = isDark ? '#1A1A1A' : '#f3f4f6';
    const brainBorder = isDark ? '#333' : '#e5e7eb';
    const tagBg = isDark ? 'rgba(20, 20, 20, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tagBorder = isDark ? '#333' : '#e5e7eb';
    const tagText = isDark ? '#E9D5FF' : '#6d28d9';
    const googleBtnBg = isDark ? '#FFF' : '#111827';
    const googleBtnText = isDark ? '#000' : '#FFF';
    const googleIconColor = isDark ? '#000' : '#FFF';

    return (
        <View style={[styles.container, { backgroundColor: bgColors }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={styles.heroSection}>
                <View style={styles.imageWrapper}>
                    <View style={[styles.brainIconContainer, { backgroundColor: brainBg, borderColor: brainBorder }]}>
                        <Brain size={80} color="#a855f7" strokeWidth={1.5} />
                    </View>
                    <View style={[styles.floatingTag, styles.tagLeft, { backgroundColor: tagBg, borderColor: tagBorder }]}>
                        <Text style={styles.tagEmoji}>💜</Text>
                        <Text style={[styles.tagText, { color: tagText }]}>Sanación</Text>
                    </View>
                    <View style={[styles.floatingTag, styles.tagRight, { backgroundColor: tagBg, borderColor: tagBorder }]}>
                        <Text style={styles.tagEmoji}>🤖</Text>
                        <Text style={[styles.tagText, { color: tagText }]}>IA Coach</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bottomSection}>
                <Text style={[styles.title, { color: textColor }]}>Tu coach de IA para{'\n'}superar el pasado</Text>

                {errorMsg && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[styles.googleButton, { backgroundColor: googleBtnBg, borderWidth: isDark ? 0 : 1, borderColor: '#111' }]}
                        onPress={() => handleOAuthLogin('google')}
                        disabled={oauthLoading !== null}
                    >
                        {oauthLoading === 'google' ? <ActivityIndicator color={googleBtnText} size="small" /> : (
                            <>
                                <Text style={[styles.googleIcon, { color: googleIconColor }]}>G</Text>
                                <Text style={[styles.googleButtonText, { color: googleBtnText }]}>Continuar con Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
    imageWrapper: {
        width: width * 0.85,
        height: width * 0.85,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    brainIconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    floatingTag: {
        position: 'absolute',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        zIndex: 10,
    },
    tagLeft: { top: '15%', left: 0, transform: [{ rotate: '-5deg' }] },
    tagRight: { bottom: '15%', right: 0, transform: [{ rotate: '5deg' }] },
    tagText: { fontWeight: '600' },
    tagEmoji: { fontSize: 16 },

    bottomSection: { paddingHorizontal: 24, paddingBottom: 48 },
    title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 16 },

    buttonsContainer: { gap: 16 },
    googleButton: {
        borderRadius: 18, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12
    },
    googleIcon: { fontSize: 22, fontWeight: '700' },
    googleButtonText: { fontSize: 16, fontWeight: '600' },

    errorBox: { backgroundColor: 'rgba(220,38,38,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
    errorText: { color: '#FCA5A5', textAlign: 'center' },
});
