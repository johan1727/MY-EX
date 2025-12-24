import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Heart, ArrowRight, Calendar, User, Sparkles, X, Brain } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const [userName, setUserName] = useState('');
    const [exName, setExName] = useState('');
    const [breakupDate, setBreakupDate] = useState('');
    const [goal, setGoal] = useState<'move_on' | 'get_back' | 'learn'>('move_on');
    const [loading, setLoading] = useState(false);

    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [step]);

    const goals = [
        { id: 'move_on', label: 'Superar y avanzar', icon: '🚀', color: '#10b981' },
        { id: 'get_back', label: 'Recuperar la relación', icon: '💕', color: '#f43f5e' },
        { id: 'learn', label: 'Entender qué pasó', icon: '🌱', color: '#3b82f6' },
    ];

    const handleSkip = () => {
        Alert.alert(
            'Saltar configuración',
            'Puedes completar tu perfil más tarde.',
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
        return true;
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 pt-4">
                    <TouchableOpacity onPress={() => step > 1 && setStep(step - 1)}>
                        <Text className={`text-gray-500 font-bold uppercase tracking-widest text-xs ${step === 1 ? 'opacity-0' : ''}`}>
                            ATRÁS
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSkip}>
                        <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs">SALTAR</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress */}
                <View className="flex-row justify-center mt-8 mb-12">
                    {[1, 2, 3].map((s) => (
                        <View
                            key={s}
                            className={`h-1.5 rounded-full mx-1 ${s <= step ? 'bg-white w-8' : 'bg-[#1c1c1e] w-4'}`}
                        />
                    ))}
                </View>

                <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {step === 1 && (
                            <View>
                                <View className="w-16 h-16 rounded-full bg-[#1c1c1e] items-center justify-center mb-6">
                                    <Brain size={32} color="white" />
                                </View>
                                <Text className="text-white text-4xl font-black tracking-tighter mb-4">
                                    Hola.
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8 font-medium">
                                    Soy REMI, tu asistente de recuperación. ¿Cómo te llamas?
                                </Text>

                                <TextInput
                                    className="text-white text-3xl font-bold border-b-2 border-[#333] pb-2 placeholder:text-[#333]"
                                    placeholder="Tu Nombre"
                                    placeholderTextColor="#333"
                                    value={userName}
                                    onChangeText={setUserName}
                                    autoFocus
                                    style={{ outlineStyle: 'none' } as any}
                                />
                            </View>
                        )}

                        {step === 2 && (
                            <View>
                                <Text className="text-white text-4xl font-black tracking-tighter mb-4">
                                    Contexto.
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8 font-medium">
                                    Para calibrar la simulación, necesito algunos detalles.
                                </Text>

                                <View className="mb-6">
                                    <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">NOMBRE DE TU EX</Text>
                                    <TextInput
                                        className="bg-[#1c1c1e] rounded-xl px-4 py-4 text-white text-lg font-bold"
                                        placeholder="Opcional"
                                        placeholderTextColor="#666"
                                        value={exName}
                                        onChangeText={setExName}
                                        style={{ outlineStyle: 'none' } as any}
                                    />
                                </View>

                                <View className="mb-6">
                                    <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">TIEMPO DE RUPTURA</Text>
                                    <TextInput
                                        className="bg-[#1c1c1e] rounded-xl px-4 py-4 text-white text-lg font-bold"
                                        placeholder="Ej: 2 semanas"
                                        placeholderTextColor="#666"
                                        value={breakupDate}
                                        onChangeText={setBreakupDate}
                                        style={{ outlineStyle: 'none' } as any}
                                    />
                                </View>
                            </View>
                        )}

                        {step === 3 && (
                            <View>
                                <Text className="text-white text-4xl font-black tracking-tighter mb-4">
                                    Objetivo.
                                </Text>
                                <Text className="text-gray-400 text-lg mb-8 font-medium">
                                    ¿Qué buscas lograr con REMI?
                                </Text>

                                {goals.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        onPress={() => setGoal(g.id as any)}
                                        className={`mb-3 p-6 rounded-[24px] border border-white/5 flex-row items-center ${goal === g.id ? 'bg-white' : 'bg-[#1c1c1e]'}`}
                                    >
                                        <Text className="text-2xl mr-4">{g.icon}</Text>
                                        <Text className={`text-lg font-bold flex-1 ${goal === g.id ? 'text-black' : 'text-white'}`}>
                                            {g.label}
                                        </Text>
                                        {goal === g.id && (
                                            <View className="w-6 h-6 rounded-full bg-black items-center justify-center">
                                                <View className="w-2 h-2 rounded-full bg-white" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Footer Button */}
                <View className="px-6 pb-8">
                    <TouchableOpacity
                        onPress={() => {
                            if (step < totalSteps) {
                                fadeAnim.setValue(0);
                                setStep(step + 1);
                            } else {
                                handleComplete();
                            }
                        }}
                        disabled={!canProceed()}
                        className={`py-5 rounded-full items-center ${canProceed() ? 'bg-white' : 'bg-[#1c1c1e]'}`}
                    >
                        <Text className={`font-black text-base uppercase tracking-widest ${canProceed() ? 'text-black' : 'text-[#666]'}`}>
                            {step < totalSteps ? 'Continuar' : (loading ? 'Iniciando...' : 'Comenzar')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
