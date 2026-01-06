import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    StyleSheet,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { BlurView } from 'expo-blur';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Complete auth session for web browsers
WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-In for native authentication (Android/iOS)
if (Platform.OS !== 'web') {
    GoogleSignin.configure({
        webClientId: '217853738800-ncr5qhb1aatrhqskthmr2llulj6vgkkp.apps.googleusercontent.com',
        offlineAccess: true,
    });
}

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        // Handle OAuth callback for web
        const handleOAuthCallback = async () => {
            if (hasNavigated) {
                console.log('[Auth] Already navigated, skipping');
                return;
            }

            // First check for existing session
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession && !hasNavigated) {
                console.log('[Auth] ✅ Found existing session, navigating');
                setHasNavigated(true);
                router.replace('/welcome-confirmation');
                return;
            }

            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                // Check if we're coming back from OAuth
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const searchParams = new URLSearchParams(window.location.search);

                const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
                const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
                const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

                console.log('[Auth] Checking OAuth callback:', {
                    hasToken: !!accessToken,
                    hasError: !!errorCode,
                    hash: window.location.hash.substring(0, 50),
                    search: window.location.search.substring(0, 50)
                });

                if (errorCode || errorDescription) {
                    console.error('[Auth] OAuth error:', errorDescription || errorCode);
                    setErrorMsg(`Error: ${errorDescription || errorCode}`);
                    window.history.replaceState(null, '', window.location.pathname);
                    return;
                }

                if (accessToken && refreshToken) {
                    try {
                        console.log('[Auth] Setting session from OAuth tokens');
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (error) {
                            console.error('[Auth] Session error:', error);
                            setErrorMsg('Error al iniciar sesión: ' + error.message);
                            window.history.replaceState(null, '', window.location.pathname);
                            return;
                        }

                        if (data.session) {
                            console.log('[Auth] ✅ Session set successfully');
                            // Clean URL
                            window.history.replaceState(null, '', window.location.pathname);
                            setHasNavigated(true);

                            // Small delay to ensure session is fully set
                            setTimeout(() => {
                                router.replace('/welcome-confirmation');
                            }, 100);
                            return;
                        }
                    } catch (error: any) {
                        console.error('[Auth] Catch error:', error);
                        setErrorMsg('Error procesando login: ' + error.message);
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] Auth state changed:', event, !!session);
            if (event === 'SIGNED_IN' && session && !hasNavigated) {
                console.log('[Auth] ✅ Sign in event, navigating');
                setHasNavigated(true);
                setTimeout(() => {
                    router.replace('/welcome-confirmation');
                }, 100);
            }
        });

        return () => subscription.unsubscribe();
    }, [hasNavigated]);

    const handleOAuthLogin = async (provider: 'google') => {
        try {
            setOauthLoading(provider);
            setErrorMsg(null);
            setSuccessMsg(null);

            if (Platform.OS === 'web') {
                const isLocal = window?.location?.hostname === 'localhost';
                const redirectUrl = isLocal
                    ? 'http://localhost:8081/auth'
                    : `${window.location.origin}/auth`;

                const { error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: {
                        redirectTo: redirectUrl,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        }
                    }
                });

                if (error) throw error;
            } else {
                console.log('[Auth] Starting native Google Sign-In...');
                try {
                    await GoogleSignin.hasPlayServices();
                    const userInfo = await GoogleSignin.signIn();
                    console.log('[Auth] Google Sign-In successful:', userInfo.data?.user?.email);

                    const tokens = await GoogleSignin.getTokens();
                    const idToken = tokens.idToken;

                    if (!idToken) {
                        throw new Error('No se pudo obtener el token de Google');
                    }

                    const { data, error } = await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: idToken,
                    });

                    if (error) throw error;
                    console.log('[Auth] ✅ Supabase sign-in successful!');
                    router.replace('/welcome-confirmation');

                } catch (nativeError: any) {
                    if (nativeError.code === statusCodes.SIGN_IN_CANCELLED) {
                        console.log('[Auth] User cancelled Google Sign-In');
                        return;
                    } else if (nativeError.code === statusCodes.IN_PROGRESS) {
                        return;
                    } else if (nativeError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                        throw new Error('Google Play Services no está disponible');
                    } else {
                        throw nativeError;
                    }
                }
            }
        } catch (error: any) {
            console.error('OAuth error:', error);
            setErrorMsg(error.message || `Error al iniciar con ${provider}`);
        } finally {
            setOauthLoading(null);
        }
    };

    const handleAuth = async () => {
        setErrorMsg(null);
        setSuccessMsg(null);
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setErrorMsg('Por favor completa todos los campos');
            return;
        }

        if (trimmedPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password: trimmedPassword,
                });

                if (error) throw error;

                if (data.user) {
                    try {
                        await supabase.from('profiles').insert({
                            id: data.user.id,
                            email: data.user.email,
                        });
                    } catch (e) {
                        // Profile might already exist, ignore
                    }

                    setSuccessMsg('¡Cuenta creada! Revisa tu correo para verificar.');
                    setEmail('');
                    setPassword('');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password: trimmedPassword,
                });

                if (error) throw error;
                router.replace('/welcome-confirmation');
            }
        } catch (error: any) {
            if (error.message?.toLowerCase().includes('invalid login credentials')) {
                setErrorMsg('Credenciales inválidas. Si acabas de registrarte, verifica tu correo primero.');
            } else if (error.message?.toLowerCase().includes('email not confirmed')) {
                setErrorMsg('Por favor verifica tu correo electrónico para activar tu cuenta.');
            } else if (error.message?.includes('User already registered')) {
                setErrorMsg('Este correo ya está registrado. Intenta iniciar sesión.');
                setIsSignUp(false);
            } else {
                setErrorMsg(error.message || 'Ocurrió un error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#0f0f23', '#1a0a2e', '#2d1b4e']}
            style={styles.container}
        >
            <StatusBar style="light" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Main Content */}
                    <View style={styles.content}>
                        {!showEmailForm ? (
                            <>
                                {/* Header with gradient text */}
                                <View style={styles.header}>
                                    <LinearGradient
                                        colors={['#a855f7', '#ec4899', '#f97316']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.titleGradient}
                                    >
                                        <Text style={styles.title}>Comienza tu sanación ●</Text>
                                    </LinearGradient>
                                    <Text style={styles.subtitle}>Tu coach de IA para superar el pasado</Text>
                                </View>

                                {/* OAuth Buttons */}
                                <View style={styles.buttonsContainer}>
                                    {/* Apple Button */}
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.appleButton]}
                                            disabled={oauthLoading !== null}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.appleButtonText}>🍎  Continue with Apple</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Google Button */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.googleButton]}
                                        onPress={() => handleOAuthLogin('google')}
                                        disabled={oauthLoading !== null}
                                        activeOpacity={0.8}
                                    >
                                        {oauthLoading === 'google' ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.googleIcon}>G</Text>
                                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {/* Sign Up Button with gradient */}
                                    <LinearGradient
                                        colors={['#a855f7', '#8b5cf6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.button, styles.gradientButton]}
                                    >
                                        <TouchableOpacity
                                            style={styles.gradientButtonInner}
                                            onPress={() => {
                                                setIsSignUp(true);
                                                setShowEmailForm(true);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.signupButtonText}>Sign up</Text>
                                        </TouchableOpacity>
                                    </LinearGradient>

                                    {/* Log In Button */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.loginButton]}
                                        onPress={() => {
                                            setIsSignUp(false);
                                            setShowEmailForm(true);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.loginButtonText}>Log in</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Back Button */}
                                <TouchableOpacity
                                    style={styles.backBtn}
                                    onPress={() => {
                                        setShowEmailForm(false);
                                        setErrorMsg(null);
                                        setSuccessMsg(null);
                                    }}
                                >
                                    <ArrowLeft size={24} color="#000" />
                                </TouchableOpacity>

                                {/* Form Header */}
                                <View style={styles.formHeader}>
                                    <Text style={styles.formTitle}>
                                        {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                    </Text>
                                    <Text style={styles.formSubtitle}>
                                        {isSignUp
                                            ? 'Ingresa tu correo para registrarte'
                                            : 'Ingresa tu correo para continuar'}
                                    </Text>
                                </View>

                                {/* Messages */}
                                {errorMsg && (
                                    <View style={styles.errorBox}>
                                        <Text style={styles.errorText}>{errorMsg}</Text>
                                    </View>
                                )}
                                {successMsg && (
                                    <View style={styles.successBox}>
                                        <Text style={styles.successText}>{successMsg}</Text>
                                    </View>
                                )}

                                {/* Email Form */}
                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Correo Electrónico</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="tu@email.com"
                                            placeholderTextColor="#999"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            autoComplete="email"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Contraseña</Text>
                                        <View style={styles.passwordContainer}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                placeholder="Mínimo 6 caracteres"
                                                placeholderTextColor="#999"
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!showPassword}
                                                autoComplete="password"
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeBtn}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={20} color="#666" />
                                                ) : (
                                                    <Eye size={20} color="#666" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleAuth}
                                        disabled={loading}
                                        style={[styles.button, styles.submitButton]}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>
                                                {isSignUp ? 'Crear Cuenta' : 'Continuar'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Toggle */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsSignUp(!isSignUp);
                                        setErrorMsg(null);
                                        setSuccessMsg(null);
                                    }}
                                    style={styles.toggleContainer}
                                >
                                    <Text style={styles.toggleText}>
                                        {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                        <Text style={styles.toggleLink}>
                                            {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        minHeight: height,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 56,
    },
    titleGradient: {
        borderRadius: 16,
        padding: 4,
        marginBottom: 12,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        marginTop: 8,
    },
    buttonsContainer: {
        gap: 14,
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    appleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    appleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    googleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4285F4',
    },
    googleButtonText: {
        color: '#1f1f1f',
        fontSize: 16,
        fontWeight: '600',
    },
    gradientButton: {
        overflow: 'hidden',
    },
    gradientButtonInner: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    loginButton: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(168, 85, 247, 0.4)',
    },
    loginButtonText: {
        color: '#a855f7',
        fontSize: 16,
        fontWeight: '600',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 0,
        padding: 12,
        zIndex: 10,
    },
    formHeader: {
        marginBottom: 32,
        marginTop: 80,
    },
    formTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: 16,
        color: '#999',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFF',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#FFF',
        backgroundColor: '#1A1A1A',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: '#1A1A1A',
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
    },
    eyeBtn: {
        padding: 4,
    },
    submitButton: {
        backgroundColor: '#A855F7',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
        color: '#999',
    },
    toggleLink: {
        color: '#A855F7',
        fontWeight: '600',
    },
    errorBox: {
        backgroundColor: '#2A1111',
        borderWidth: 1,
        borderColor: '#441111',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#F88',
        fontSize: 14,
        textAlign: 'center',
    },
    successBox: {
        backgroundColor: '#EFE',
        borderWidth: 1,
        borderColor: '#CFC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    successText: {
        color: '#8F8',
        fontSize: 14,
        textAlign: 'center',
    },
});
