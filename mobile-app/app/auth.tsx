import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowRight, User, CheckCircle2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function AuthScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleAuth = async () => {
        setErrorMsg(null);
        if (!email || !password) {
            setErrorMsg('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
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
                    email,
                    password,
                });

                if (error) throw error;
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            setErrorMsg(error.message || "Ocurrió un error");
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
            console.error("Anon auth error:", error);
            setErrorMsg("Inicio anónimo fallido. Habilítalo en Supabase o regístrate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 flex-row bg-black">
            <StatusBar style="light" />

            {/* Left Panel - Form */}
            <View className="flex-1 justify-center px-8 md:px-16 lg:px-24 bg-[#0a0a0a]">
                <View className="max-w-md w-full mx-auto">
                    {/* Header */}
                    <View className="mb-10">
                        <Text className="text-white text-3xl font-bold mb-2">
                            {isSignUp ? 'Crea tu Cuenta' : 'Bienvenido de Nuevo'}
                        </Text>
                        <Text className="text-gray-400 text-base">
                            {isSignUp
                                ? 'Únete a My Ex Coach y comienza tu sanación.'
                                : 'Ingresa para continuar tu proceso.'}
                        </Text>
                    </View>

                    {/* Google Login */}
                    <TouchableOpacity
                        className="flex-row items-center justify-center bg-[#1a1a1a] border border-white/10 h-14 rounded-xl mb-8 hover:bg-[#252525]"
                        onPress={async () => {
                            try {
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: Platform.OS === 'web'
                                            ? window.location.origin
                                            : 'myexcoach://auth/callback'
                                    }
                                });
                                if (error) throw error;
                            } catch (error: any) {
                                setErrorMsg(error.message || "Google login failed");
                            }
                        }}
                    >
                        <Image
                            source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }}
                            className="w-6 h-6 mr-3"
                        />
                        <Text className="text-white font-medium text-base">
                            {isSignUp ? 'Registrarse con Google' : 'Iniciar con Google'}
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center mb-8">
                        <View className="flex-1 h-[1px] bg-white/10" />
                        <Text className="mx-4 text-gray-500 text-sm">
                            {isSignUp ? 'o regístrate con tu correo' : 'o inicia con tu correo'}
                        </Text>
                        <View className="flex-1 h-[1px] bg-white/10" />
                    </View>

                    {/* Form */}
                    <View className="space-y-4">
                        {errorMsg && (
                            <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-2">
                                <Text className="text-red-400 text-sm text-center">{errorMsg}</Text>
                            </View>
                        )}

                        <View>
                            <Text className="text-gray-400 text-sm mb-2 ml-1">Correo Electrónico</Text>
                            <View className="flex-row items-center bg-[#1a1a1a] border border-white/10 rounded-xl px-4 h-14 focus:border-blue-500">
                                <Mail size={20} color="#6b7280" />
                                <TextInput
                                    className="flex-1 ml-3 text-white text-base"
                                    placeholder="tu@ejemplo.com"
                                    placeholderTextColor="#4b5563"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    style={{ outlineStyle: 'none' } as any}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-gray-400 text-sm mb-2 ml-1">Contraseña</Text>
                            <View className="flex-row items-center bg-[#1a1a1a] border border-white/10 rounded-xl px-4 h-14 focus:border-blue-500">
                                <Lock size={20} color="#6b7280" />
                                <TextInput
                                    className="flex-1 ml-3 text-white text-base"
                                    placeholder="••••••••"
                                    placeholderTextColor="#4b5563"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    style={{ outlineStyle: 'none' } as any}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleAuth}
                            disabled={loading}
                            className="bg-blue-600 h-14 rounded-xl items-center justify-center mt-6 shadow-lg shadow-blue-900/20 active:bg-blue-700"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">
                                    {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Toggle & Guest */}
                    <View className="mt-8 items-center space-y-4">
                        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                            <Text className="text-gray-400">
                                {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                <Text className="text-blue-500 font-semibold">
                                    {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAnonymousLogin}>
                            <Text className="text-gray-600 text-sm">
                                Continuar como invitado
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-auto pt-10">
                        <Text className="text-gray-700 text-xs text-center">
                            © 2025 My Ex Coach. Todos los derechos reservados.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Right Panel - Branding (Hidden on Mobile) */}
            <View className="hidden md:flex flex-1 relative overflow-hidden bg-blue-900">
                <LinearGradient
                    colors={['#1e3a8a', '#3b82f6', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                />

                {/* Decorative Elements */}
                <View className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" />
                <View className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl" />

                <View className="flex-1 items-center justify-center p-12 z-10">
                    <View className="w-24 h-24 bg-white/10 rounded-3xl items-center justify-center mb-8 backdrop-blur-lg border border-white/20">
                        <CheckCircle2 size={48} color="white" />
                    </View>

                    <Text className="text-white text-5xl font-bold text-center mb-6 leading-tight">
                        Tu Coach Personal de Recuperación
                    </Text>

                    <Text className="text-blue-100 text-xl text-center max-w-lg leading-relaxed">
                        Optimiza tu proceso de duelo, gestiona tus emociones y encuentra claridad con el poder de la IA.
                    </Text>

                    {/* Feature Pills */}
                    <View className="flex-row flex-wrap justify-center gap-3 mt-12">
                        {['Chat IA 24/7', 'Análisis de Mensajes', 'Diario Inteligente', 'Privado y Seguro'].map((feature) => (
                            <View key={feature} className="bg-white/10 px-4 py-2 rounded-full border border-white/10">
                                <Text className="text-white text-sm font-medium">{feature}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}
