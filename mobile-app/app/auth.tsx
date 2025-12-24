import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowRight, User, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function AuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            if (typeof window !== 'undefined' && window.location.hash) {
                try {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const refreshToken = hashParams.get('refresh_token');
                    const errorCode = hashParams.get('error_code');
                    const errorDescription = hashParams.get('error_description');

                    if (errorCode || errorDescription) {
                        setErrorMsg(`Error de login: ${errorDescription || errorCode}`);
                        return;
                    }

                    if (accessToken) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (!error && data.session) {
                            window.history.replaceState(null, '', window.location.pathname);
                            setTimeout(() => router.push('/(tabs)'), 500);
                            return;
                        }
                    }
                } catch (error: any) {
                    setErrorMsg('Error procesando login: ' + error.message);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setTimeout(() => router.push('/(tabs)'), 500);
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setTimeout(() => router.push('/(tabs)'), 500);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleOAuthLogin = async (provider: 'google' | 'discord') => {
        try {
            const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            const redirectUrl = Platform.OS === 'web'
                ? (isLocal ? 'http://localhost:8081/auth' : `${window.location.origin}/auth`)
                : 'myexcoach://auth/callback';

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) throw error;
        } catch (error: any) {
            setErrorMsg(error.message || `${provider} login failed`);
        }
    };

    const handleAuth = async () => {
        setErrorMsg(null);
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setErrorMsg('Por favor completa todos los campos');
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
                    await supabase.from('profiles').insert({
                        id: data.user.id,
                        email: data.user.email,
                    });
                    setErrorMsg('¡Éxito! Revisa tu correo para verificar.');
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
            if (error.message.includes("invalid login credentials")) {
                setErrorMsg("Credenciales inválidas. Verifica tu correo y contraseña.");
            } else if (error.message.includes("User already registered")) {
                setErrorMsg("Este correo ya está registrado. Intenta iniciar sesión.");
            } else {
                setErrorMsg(error.message || "Ocurrió un error");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnonymousLogin = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            router.replace('/(tabs)');
        } catch (error: any) {
            if (error.message.includes("Anonymous sign-ins are disabled")) {
                setErrorMsg("El inicio de sesión anónimo está desactivado.");
            } else {
                setErrorMsg("Inicio anónimo fallido. Intenta registrarte.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.formPanel}>
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.formContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {isSignUp ? 'Crea tu Cuenta' : 'Bienvenido'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isSignUp
                                ? 'Únete a SOYREMI y comienza tu sanación.'
                                : 'Ingresa para continuar tu proceso.'}
                        </Text>
                    </View>

                    {/* OAuth Buttons */}
                    <View style={styles.oauthContainer}>
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={() => handleOAuthLogin('google')}
                        >
                            <Text style={styles.oauthText}>Continuar con Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.discordButton}
                            onPress={() => handleOAuthLogin('discord')}
                        >
                            <Text style={styles.oauthText}>Continuar con Discord</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>
                            {isSignUp ? 'o regístrate con tu correo' : 'o inicia con tu correo'}
                        </Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {errorMsg && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Correo Electrónico</Text>
                            <View style={styles.inputContainer}>
                                <Mail size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="tu@ejemplo.com"
                                    placeholderTextColor="#4b5563"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Contraseña</Text>
                            <View style={styles.inputContainer}>
                                <Lock size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#4b5563"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleAuth}
                            disabled={loading}
                            style={styles.submitButton}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Toggle & Guest */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                            <Text style={styles.toggleText}>
                                {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                <Text style={styles.toggleLink}>
                                    {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAnonymousLogin} style={styles.guestButton}>
                            <Text style={styles.guestText}>Continuar como invitado</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.copyright}>
                        <Text style={styles.copyrightText}>
                            © 2025 SOYREMI. Todos los derechos reservados.
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#000',
    },
    formPanel: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#0a0a0a',
    },
    formContent: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        marginBottom: 40,
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 16,
    },
    oauthContainer: {
        gap: 12,
        marginBottom: 32,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        height: 48,
        borderRadius: 12,
    },
    discordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5865F2',
        height: 48,
        borderRadius: 12,
    },
    oauthText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 14,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#6b7280',
        fontSize: 14,
    },
    form: {
        gap: 16,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 8,
    },
    inputLabel: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        color: '#fff',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#2563eb',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
        gap: 16,
    },
    toggleText: {
        color: '#9ca3af',
    },
    toggleLink: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    guestButton: {
        marginTop: 8,
    },
    guestText: {
        color: '#4b5563',
        fontSize: 14,
    },
    copyright: {
        marginTop: 40,
        paddingTop: 40,
    },
    copyrightText: {
        color: '#374151',
        fontSize: 12,
        textAlign: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        padding: 10,
        zIndex: 10,
    },
});
