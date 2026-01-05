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
                            router.replace('/welcome-confirmation');
                            return;
                        }
                    }
                } catch (error: any) {
                    setErrorMsg('Error procesando login: ' + error.message);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session && !hasNavigated) {
                setHasNavigated(true);
                router.replace('/welcome-confirmation');
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !hasNavigated) {
                setHasNavigated(true);
                router.replace('/welcome-confirmation');
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
        <View style={styles.container}>
            <StatusBar style="dark" />

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
                                {/* Header */}
                                <View style={styles.header}>
                                    <Text style={styles.title}>Comienza tu sanación●</Text>
                                </View>

                                {/* OAuth Buttons */}
                                <View style={styles.buttonsContainer}>
                                    {/* Apple Button */}
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity
                                            style={[styles.button, styles.appleButton]}
                                            disabled={oauthLoading !== null}
                                        >
                                            <Text style={styles.appleButtonText}>🍎 Continue with Apple</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Google Button */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.googleButton]}
                                        onPress={() => handleOAuthLogin('google')}
                                        disabled={oauthLoading !== null}
                                    >
                                        {oauthLoading === 'google' ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Sign Up Button */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.signupButton]}
                                        onPress={() => {
                                            setIsSignUp(true);
                                            setShowEmailForm(true);
                                        }}
                                    >
                                        <Text style={styles.signupButtonText}>Sign up</Text>
                                    </TouchableOpacity>

                                    {/* Log In Button */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.loginButton]}
                                        onPress={() => {
                                            setIsSignUp(false);
                                            setShowEmailForm(true);
                                        }}
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
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
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
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    buttonsContainer: {
        gap: 12,
    },
    button: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appleButton: {
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
    },
    appleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    googleButton: {
        backgroundColor: '#2A2A2A',
    },
    googleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    signupButton: {
        backgroundColor: '#A855F7',
    },
    signupButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#444',
    },
    loginButtonText: {
        color: '#999',
        fontSize: 16,
        fontWeight: '500',
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
