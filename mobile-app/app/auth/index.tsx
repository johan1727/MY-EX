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

// Complete auth session for web browsers
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entry animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for logo
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        // Handle OAuth callback for web
        const handleOAuthCallback = async () => {
            // Prevent multiple navigations
            if (hasNavigated) return;

            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hash) {
                try {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const errorCode = hashParams.get('error_code');
                    const errorDescription = hashParams.get('error_description');

                    if (errorCode || errorDescription) {
                        setErrorMsg(`Error: ${errorDescription || errorCode}`);
                        return;
                    }

                    if (accessToken) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (!error && data.session) {
                            window.history.replaceState(null, '', window.location.pathname);
                            setHasNavigated(true);
                            router.replace('/(tabs)');
                            return;
                        }
                    }
                } catch (error: any) {
                    setErrorMsg('Error procesando login: ' + error.message);
                }
            }

            // Check existing session (but don't redirect if already navigating)
            const { data: { session } } = await supabase.auth.getSession();
            if (session && !hasNavigated) {
                setHasNavigated(true);
                router.replace('/(tabs)');
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !hasNavigated) {
                setHasNavigated(true);
                router.replace('/(tabs)');
            }
        });

        return () => subscription.unsubscribe();
    }, [hasNavigated]);

    const handleOAuthLogin = async (provider: 'google' | 'discord') => {
        try {
            setOauthLoading(provider);
            setErrorMsg(null);
            setSuccessMsg(null);

            if (Platform.OS === 'web') {
                // Web: standard OAuth flow
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
                // Mobile: use WebBrowser with deep link for all providers
                const redirectUrl = 'my-ex-coach://auth/callback';

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                    }
                });

                if (error) throw error;

                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(
                        data.url,
                        redirectUrl
                    );

                    if (result.type === 'success' && result.url) {
                        const url = result.url;
                        const hashIndex = url.indexOf('#');
                        if (hashIndex !== -1) {
                            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
                            const accessToken = hashParams.get('access_token');
                            const refreshToken = hashParams.get('refresh_token');

                            if (accessToken && refreshToken) {
                                const { error: sessionError } = await supabase.auth.setSession({
                                    access_token: accessToken,
                                    refresh_token: refreshToken,
                                });

                                if (sessionError) throw sessionError;
                                console.log('[Auth] ✅ OAuth session set successfully');
                                router.replace('/(tabs)');
                            }
                        }
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
                    // Try to create profile (may fail if already exists)
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
                router.replace('/(tabs)');
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
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Animated Background */}
            <LinearGradient
                colors={['#0f0f23', '#1a1a3e', '#0f0f23']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative circles */}
            <Animated.View style={[styles.decorCircle1, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                    colors={['rgba(139, 92, 246, 0.3)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            </Animated.View>
            <Animated.View style={[styles.decorCircle2, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                    colors={['rgba(59, 130, 246, 0.2)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/(tabs)')}
                    >
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>

                    <Animated.View
                        style={[
                            styles.formContent,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        {/* Logo/Brand */}
                        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <LinearGradient
                                colors={['#8b5cf6', '#6366f1', '#3b82f6']}
                                style={styles.logoGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.logoText}>R</Text>
                            </LinearGradient>
                        </Animated.View>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                {isSignUp ? 'Crea tu Cuenta' : 'Bienvenido'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {isSignUp
                                    ? 'Únete a REMI y comienza tu sanación'
                                    : 'Ingresa para continuar tu proceso'}
                            </Text>
                        </View>

                        {/* OAuth Buttons */}
                        <View style={styles.oauthContainer}>
                            <TouchableOpacity
                                style={styles.oauthButton}
                                onPress={() => handleOAuthLogin('google')}
                                disabled={oauthLoading !== null}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                    style={styles.oauthGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {oauthLoading === 'google' ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.oauthIcon}>G</Text>
                                            <Text style={styles.oauthText}>Continuar con Google</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.oauthButton}
                                onPress={() => handleOAuthLogin('discord')}
                                disabled={oauthLoading !== null}
                            >
                                <LinearGradient
                                    colors={['#5865F2', '#4752C4']}
                                    style={styles.oauthGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {oauthLoading === 'discord' ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.discordIcon}>🎮</Text>
                                            <Text style={styles.oauthText}>Continuar con Discord</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <LinearGradient
                                colors={['transparent', 'rgba(139, 92, 246, 0.5)', 'transparent']}
                                style={styles.dividerLine}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text style={styles.dividerText}>
                                {isSignUp ? 'o regístrate con email' : 'o inicia con email'}
                            </Text>
                            <LinearGradient
                                colors={['transparent', 'rgba(139, 92, 246, 0.5)', 'transparent']}
                                style={styles.dividerLine}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
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

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Correo Electrónico</Text>
                                <View style={styles.inputContainer}>
                                    <Mail size={20} color="#8b5cf6" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="tu@email.com"
                                        placeholderTextColor="#6b7280"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Contraseña</Text>
                                <View style={styles.inputContainer}>
                                    <Lock size={20} color="#8b5cf6" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mínimo 6 caracteres"
                                        placeholderTextColor="#6b7280"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoComplete="password"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#6b7280" />
                                        ) : (
                                            <Eye size={20} color="#6b7280" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleAuth}
                                disabled={loading}
                                style={styles.submitButton}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#6366f1', '#4f46e5']}
                                    style={styles.submitGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>
                                            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Toggle */}
                        <View style={styles.footer}>
                            <TouchableOpacity onPress={() => {
                                setIsSignUp(!isSignUp);
                                setErrorMsg(null);
                                setSuccessMsg(null);
                            }}>
                                <Text style={styles.toggleText}>
                                    {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                    <Text style={styles.toggleLink}>
                                        {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Copyright */}
                        <View style={styles.copyright}>
                            <Text style={styles.copyrightText}>
                                © 2025 REMI. Tu compañero de sanación.
                            </Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 60,
    },
    decorCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        overflow: 'hidden',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        overflow: 'hidden',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 12,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    formContent: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
    oauthContainer: {
        gap: 12,
        marginBottom: 24,
    },
    oauthButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    oauthGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    oauthIcon: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginRight: 12,
    },
    discordIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    oauthText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#6b7280',
        fontSize: 14,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
    },
    successBox: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    successText: {
        color: '#4ade80',
        fontSize: 14,
        textAlign: 'center',
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        marginBottom: 8,
    },
    inputLabel: {
        color: '#d1d5db',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        color: '#fff',
        fontSize: 16,
    },
    eyeButton: {
        padding: 8,
    },
    submitButton: {
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    submitGradient: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    toggleText: {
        color: '#9ca3af',
        fontSize: 15,
    },
    toggleLink: {
        color: '#8b5cf6',
        fontWeight: '600',
    },
    copyright: {
        marginTop: 32,
    },
    copyrightText: {
        color: '#4b5563',
        fontSize: 12,
        textAlign: 'center',
    },
});
