import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, LogIn, UserPlus, Heart, Sparkles, Shield } from 'lucide-react-native';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(30))[0];

    useEffect(() => {
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
    }, []);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa email y contraseña');
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
                        subscription_tier: 'warrior',
                        subscription_status: 'active',
                        subscription_start_date: new Date().toISOString(),
                        subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    });

                    Alert.alert(
                        '✅ ¡Bienvenido!',
                        'Tu cuenta ha sido creada. Comienza tu camino de sanación.',
                        [{ text: 'Continuar', onPress: () => router.replace('/onboarding') }]
                    );
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
            Alert.alert('Error', error.message || 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    const handleTestLogin = async () => {
        setLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: 'test@myexcoach.com',
                password: 'test123456',
            });

            if (signInError) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: 'test@myexcoach.com',
                    password: 'test123456',
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    await supabase.from('profiles').insert({
                        id: data.user.id,
                        email: data.user.email,
                        subscription_tier: 'warrior',
                        subscription_status: 'active',
                        subscription_start_date: new Date().toISOString(),
                        subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    });
                }
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Error al crear cuenta de prueba');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#0f0a1a', '#1a1030', '#0a0a15']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <View className="flex-1 justify-center px-8">
                {/* Logo & Branding */}
                <Animated.View
                    className="items-center mb-12"
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}
                >
                    {/* Logo Icon */}
                    <View className="w-24 h-24 rounded-3xl bg-gradient-to-br items-center justify-center mb-6 overflow-hidden">
                        <LinearGradient
                            colors={['#a855f7', '#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="absolute inset-0"
                        />
                        <Heart size={48} color="white" fill="white" />
                    </View>

                    {/* App Name */}
                    <Text className="text-white text-4xl font-bold tracking-tight">
                        My Ex <Text className="text-purple-400">Coach</Text>
                    </Text>

                    {/* Tagline */}
                    <Text className="text-gray-400 text-base mt-2 text-center">
                        Tu guía hacia la sanación emocional
                    </Text>

                    {/* Trust Badges */}
                    <View className="flex-row items-center mt-4 gap-4">
                        <View className="flex-row items-center">
                            <Shield size={14} color="#22c55e" />
                            <Text className="text-gray-500 text-xs ml-1">Privado</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Sparkles size={14} color="#a855f7" />
                            <Text className="text-gray-500 text-xs ml-1">Con IA</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Auth Form */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Section Title */}
                    <View className="mb-6">
                        <Text className="text-white text-2xl font-bold">
                            {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
                        </Text>
                        <Text className="text-gray-400 text-sm mt-1">
                            {isSignUp ? 'Comienza tu camino hoy' : 'Continúa tu progreso'}
                        </Text>
                    </View>

                    {/* Email Input */}
                    <View className="mb-4">
                        <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                            <Mail size={20} color="#a855f7" />
                            <TextInput
                                className="flex-1 ml-3 text-white text-base"
                                placeholder="tu@email.com"
                                placeholderTextColor="#6b7280"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={{ outlineStyle: 'none' } as any}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View className="mb-6">
                        <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                            <Lock size={20} color="#a855f7" />
                            <TextInput
                                className="flex-1 ml-3 text-white text-base"
                                placeholder="••••••••"
                                placeholderTextColor="#6b7280"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                style={{ outlineStyle: 'none' } as any}
                            />
                        </View>
                    </View>

                    {/* Auth Button */}
                    <TouchableOpacity
                        onPress={handleAuth}
                        disabled={loading}
                        className="mb-4 rounded-2xl overflow-hidden shadow-lg"
                    >
                        <LinearGradient
                            colors={['#a855f7', '#ec4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-4 items-center"
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View className="flex-row items-center">
                                    {isSignUp ? (
                                        <UserPlus size={20} color="white" />
                                    ) : (
                                        <LogIn size={20} color="white" />
                                    )}
                                    <Text className="text-white font-bold text-lg ml-2">
                                        {isSignUp ? 'Comenzar' : 'Continuar'}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Toggle Sign Up / Sign In */}
                    <TouchableOpacity
                        onPress={() => setIsSignUp(!isSignUp)}
                        className="mb-6"
                    >
                        <Text className="text-center text-gray-400">
                            {isSignUp ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
                            <Text className="text-purple-400 font-semibold">
                                {isSignUp ? 'Inicia Sesión' : 'Crear cuenta'}
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center mb-6">
                        <View className="flex-1 h-px bg-white/10" />
                        <Text className="text-gray-500 text-sm mx-4">o</Text>
                        <View className="flex-1 h-px bg-white/10" />
                    </View>

                    {/* Test Account Button */}
                    <TouchableOpacity
                        onPress={handleTestLogin}
                        disabled={loading}
                        className="bg-white/5 border border-white/10 rounded-2xl py-4"
                    >
                        <Text className="text-center text-gray-300 font-medium">
                            🧪 Probar sin registrarme
                        </Text>
                    </TouchableOpacity>
                    <Text className="text-center text-gray-500 text-xs mt-2">
                        Cuenta de prueba con todas las funciones
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}
