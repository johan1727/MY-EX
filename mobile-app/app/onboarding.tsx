import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Heart, ArrowRight, Calendar, User, Sparkles, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

// Simplified 3-step onboarding for better user experience
export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    // Essential data only
    const [userName, setUserName] = useState('');
    const [exName, setExName] = useState('');
    const [breakupDate, setBreakupDate] = useState('');
    const [goal, setGoal] = useState<'move_on' | 'get_back' | 'learn'>('move_on');
    const [loading, setLoading] = useState(false);

    // Animations
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [step]);

    const goals = [
        { id: 'move_on', label: 'Superar y seguir adelante', icon: '🚀', color: '#22c55e' },
        { id: 'get_back', label: 'Recuperar la relación', icon: '💕', color: '#ec4899' },
        { id: 'learn', label: 'Entender qué pasó', icon: '🌱', color: '#3b82f6' },
    ];

    const handleSkip = () => {
        Alert.alert(
            'Saltar configuración',
            'Puedes completar tu perfil más tarde en Configuración.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Saltar', onPress: () => router.replace('/(tabs)') }
            ]
        );
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await supabase.from('users').upsert({
                id: user.id,
                email: user.email,
                user_name: userName || 'Usuario',
                ex_name: exName || 'Mi ex',
                breakup_date: breakupDate || new Date().toISOString().split('T')[0],
                goal: goal,
                no_contact_since: breakupDate || new Date().toISOString().split('T')[0],
                onboarding_completed: true,
            });

            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return userName.trim().length > 0;
        if (step === 2) return true; // Ex info is optional
        return true;
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0f0a1a', '#1a1030', '#0a0a15']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                {/* Header with Skip */}
                <View className="flex-row items-center justify-between px-6 pt-4">
                    <TouchableOpacity onPress={() => step > 1 && setStep(step - 1)}>
                        <Text className={`text-gray-400 ${step === 1 ? 'opacity-0' : ''}`}>
                            ← Atrás
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSkip}>
                        <Text className="text-purple-400 font-medium">Saltar →</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                    {/* Logo */}
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 rounded-2xl items-center justify-center overflow-hidden">
                            <LinearGradient
                                colors={['#a855f7', '#ec4899']}
                                className="w-full h-full items-center justify-center"
                            >
                                <Heart size={32} color="white" fill="white" />
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Progress Dots */}
                    <View className="flex-row justify-center mb-8">
                        {[1, 2, 3].map((s) => (
                            <View
                                key={s}
                                className={`h-2 rounded-full mx-1 ${s <= step ? 'bg-purple-500 w-8' : 'bg-gray-700 w-4'
                                    }`}
                            />
                        ))}
                    </View>

                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Step 1: Your Name */}
                        {step === 1 && (
                            <View>
                                <Text className="text-white text-3xl font-bold mb-2">
                                    ¡Hola! 👋
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8">
                                    ¿Cómo te llamas?
                                </Text>

                                <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-6">
                                    <View className="flex-row items-center">
                                        <User size={24} color="#a855f7" />
                                        <TextInput
                                            className="flex-1 ml-3 text-white text-xl"
                                            placeholder="Tu nombre..."
                                            placeholderTextColor="#6b7280"
                                            value={userName}
                                            onChangeText={setUserName}
                                            autoFocus
                                            style={{ outlineStyle: 'none' } as any}
                                        />
                                    </View>
                                </View>

                                <View className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                                    <Text className="text-purple-300 text-sm">
                                        💜 Tu nombre me ayuda a personalizar tu experiencia
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Step 2: About Your Ex (Optional) */}
                        {step === 2 && (
                            <View>
                                <Text className="text-white text-3xl font-bold mb-2">
                                    Cuéntame un poco 💭
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8">
                                    Esto es opcional pero ayuda a personalizar tu experiencia
                                </Text>

                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm mb-2">Nombre de tu ex (opcional)</Text>
                                    <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                        <View className="flex-row items-center">
                                            <Heart size={20} color="#ec4899" />
                                            <TextInput
                                                className="flex-1 ml-3 text-white text-base"
                                                placeholder="Su nombre..."
                                                placeholderTextColor="#6b7280"
                                                value={exName}
                                                onChangeText={setExName}
                                                style={{ outlineStyle: 'none' } as any}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View className="mb-6">
                                    <Text className="text-gray-400 text-sm mb-2">¿Cuándo terminaron? (opcional)</Text>
                                    <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                        <View className="flex-row items-center">
                                            <Calendar size={20} color="#3b82f6" />
                                            <TextInput
                                                className="flex-1 ml-3 text-white text-base"
                                                placeholder="Ej: hace 2 semanas"
                                                placeholderTextColor="#6b7280"
                                                value={breakupDate}
                                                onChangeText={setBreakupDate}
                                                style={{ outlineStyle: 'none' } as any}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                                    <Text className="text-blue-300 text-sm">
                                        ℹ️ Puedes agregar esta información después en tu perfil
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Step 3: Your Goal */}
                        {step === 3 && (
                            <View>
                                <Text className="text-white text-3xl font-bold mb-2">
                                    ¿Cuál es tu objetivo? 🎯
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8">
                                    Esto me ayuda a darte mejor consejo
                                </Text>

                                {goals.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        onPress={() => setGoal(g.id as any)}
                                        className={`mb-4 p-5 rounded-2xl border-2 ${goal === g.id
                                                ? 'bg-purple-500/20 border-purple-500'
                                                : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <View className="flex-row items-center">
                                            <Text className="text-4xl mr-4">{g.icon}</Text>
                                            <Text className="text-white text-lg font-semibold flex-1">
                                                {g.label}
                                            </Text>
                                            {goal === g.id && (
                                                <View className="w-6 h-6 rounded-full bg-purple-500 items-center justify-center">
                                                    <Text className="text-white text-sm">✓</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                <View className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mt-4">
                                    <Text className="text-green-300 text-sm">
                                        ✨ No te preocupes, puedes cambiar tu objetivo en cualquier momento
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Bottom Button */}
                <View className="px-6 pb-8">
                    {step < totalSteps ? (
                        <TouchableOpacity
                            onPress={() => {
                                fadeAnim.setValue(0);
                                setStep(step + 1);
                            }}
                            disabled={!canProceed()}
                            className="rounded-2xl overflow-hidden"
                        >
                            <LinearGradient
                                colors={canProceed() ? ['#a855f7', '#ec4899'] : ['#374151', '#374151']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="py-4 flex-row items-center justify-center"
                            >
                                <Text className="text-white font-bold text-lg mr-2">
                                    Continuar
                                </Text>
                                <ArrowRight size={20} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleComplete}
                            disabled={loading}
                            className="rounded-2xl overflow-hidden"
                        >
                            <LinearGradient
                                colors={['#a855f7', '#ec4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="py-4 flex-row items-center justify-center"
                            >
                                <Sparkles size={20} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">
                                    {loading ? 'Guardando...' : '¡Comenzar!'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}
