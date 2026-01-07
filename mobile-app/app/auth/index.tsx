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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

    const handleAuth = async () => {
        setErrorMsg(null);
        setSuccessMsg(null);
        if (!email.trim() || !password.trim()) {
            setErrorMsg('Por favor completa todos los campos');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                setSuccessMsg('¡Cuenta creada! Revisa tu correo.');
                setEmail('');
                setPassword('');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                router.replace('/welcome-confirmation');
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    if (showEmailForm) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <TouchableOpacity style={styles.backButton} onPress={() => setShowEmailForm(false)}>
                            <Text style={styles.backText}>← Atrás</Text>
                        </TouchableOpacity>

                        <View style={styles.formContainer}>
                            <Text style={styles.formTitle}>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</Text>

                            {errorMsg && <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>}
                            {successMsg && <View style={styles.successBox}><Text style={styles.successText}>{successMsg}</Text></View>}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="tu@email.com"
                                    placeholderTextColor="#888"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Contraseña</Text>
                                <View style={styles.passwordWrapper}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Mínimo 6 caracteres"
                                        placeholderTextColor="#888"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#888" /> : <Eye size={20} color="#888" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{isSignUp ? 'Crear Cuenta' : 'Continuar'}</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.toggleButton} onPress={() => setIsSignUp(!isSignUp)}>
                                <Text style={styles.toggleText}>
                                    {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                    <Text style={styles.toggleLink}>{isSignUp ? 'Inicia Sesión' : 'Regístrate'} </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.heroSection}>
                <View style={styles.imageWrapper}>
                    <View style={styles.brainIconContainer}>
                        <Brain size={80} color="#a855f7" strokeWidth={1.5} />
                    </View>
                    <View style={[styles.floatingTag, styles.tagLeft]}>
                        <Text style={styles.tagEmoji}>💜</Text>
                        <Text style={styles.tagText}>Sanación</Text>
                    </View>
                    <View style={[styles.floatingTag, styles.tagRight]}>
                        <Text style={styles.tagEmoji}>🤖</Text>
                        <Text style={styles.tagText}>IA Coach</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bottomSection}>
                <Text style={styles.title}>Tu coach de IA para{'\n'}superar el pasado</Text>
                <View style={{ height: 20 }} />
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.googleButton} onPress={() => handleOAuthLogin('google')} disabled={oauthLoading !== null}>
                        {oauthLoading === 'google' ? <ActivityIndicator color="#000" size="small" /> : (
                            <>
                                <Text style={styles.googleIcon}>G</Text>
                                <Text style={styles.googleButtonText}>Continuar con Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emailButton} onPress={() => setShowEmailForm(true)}>
                        <Text style={styles.emailButtonText}>Continuar con Email</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Pure Black
    },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 },

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
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },

    floatingTag: {
        position: 'absolute',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#333',
        zIndex: 10,
    },
    tagLeft: { top: '15%', left: 0, transform: [{ rotate: '-5deg' }] },
    tagRight: { bottom: '15%', right: 0, transform: [{ rotate: '5deg' }] },
    tagText: { color: '#E9D5FF', fontWeight: '600' },
    tagEmoji: { fontSize: 16 },

    bottomSection: { paddingHorizontal: 24, paddingBottom: 48 },
    title: { fontSize: 30, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 16 },

    buttonsContainer: { gap: 16 },
    googleButton: {
        backgroundColor: '#FFF', borderRadius: 18, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12
    },
    googleIcon: { fontSize: 22, fontWeight: '700', color: '#000' },
    googleButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },

    emailButton: {
        borderRadius: 18, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#333'
    },
    emailButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Form Styles
    backButton: { marginBottom: 24 },
    backText: { color: '#FFF', fontSize: 16 },
    formContainer: { flex: 1 },
    formTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', marginBottom: 32 },
    inputContainer: { marginBottom: 20 },
    label: { color: '#888', marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#1A1A1A', borderRadius: 14, height: 56, paddingHorizontal: 16, fontSize: 16, color: '#FFF', borderWidth: 1, borderColor: '#333'
    },
    passwordWrapper: {
        backgroundColor: '#1A1A1A', borderRadius: 14, height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333'
    },
    passwordInput: { flex: 1, fontSize: 16, color: '#FFF' },
    primaryButton: {
        backgroundColor: '#8B5CF6', borderRadius: 18, height: 58, alignItems: 'center', justifyContent: 'center', marginTop: 12
    },
    primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    toggleButton: { marginTop: 24, alignItems: 'center' },
    toggleText: { color: '#888' },
    toggleLink: { color: '#8B5CF6', fontWeight: '700' },

    errorBox: { backgroundColor: 'rgba(220,38,38,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
    errorText: { color: '#FCA5A5', textAlign: 'center' },
    successBox: { backgroundColor: 'rgba(5,150,105,0.2)', padding: 12, borderRadius: 12, marginBottom: 16 },
    successText: { color: '#6EE7B7', textAlign: 'center' }
});
