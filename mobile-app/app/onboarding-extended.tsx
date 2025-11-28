import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Heart, Calendar, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

interface OnboardingData {
    name: string;
    breakupDate: string;
    whoEnded: 'me' | 'them' | 'mutual' | '';
    currentMood: number;
    relationshipDuration: string;
    mainStruggles: string[];
}

const QUESTIONS = [
    {
        id: 1,
        question_en: "What's your name?",
        question_es: "¿Cómo te llamas?",
        subtitle_en: "We'll use this to personalize your experience",
        subtitle_es: "Usaremos esto para personalizar tu experiencia",
        type: 'text',
        icon: Heart,
        field: 'name'
    },
    {
        id: 2,
        question_en: "When did the relationship end?",
        question_es: "¿Cuándo terminó la relación?",
        subtitle_en: "This helps us understand where you are in your journey",
        subtitle_es: "Esto nos ayuda a entender en qué punto estás",
        type: 'choice',
        icon: Calendar,
        field: 'breakupDate',
        options: [
            { value: 'less_week', label_en: 'Less than a week ago', label_es: 'Hace menos de una semana' },
            { value: '1_4_weeks', label_en: '1-4 weeks ago', label_es: 'Hace 1-4 semanas' },
            { value: '1_3_months', label_en: '1-3 months ago', label_es: 'Hace 1-3 meses' },
            { value: '3_6_months', label_en: '3-6 months ago', label_es: 'Hace 3-6 meses' },
            { value: 'more_6_months', label_en: 'More than 6 months ago', label_es: 'Hace más de 6 meses' }
        ]
    },
    {
        id: 3,
        question_en: "Who ended the relationship?",
        question_es: "¿Quién terminó la relación?",
        subtitle_en: "There's no judgment here, just understanding",
        subtitle_es: "No hay juicio aquí, solo comprensión",
        type: 'choice',
        icon: Users,
        field: 'whoEnded',
        options: [
            { value: 'them', label_en: 'They ended it 💔', label_es: 'Mi ex terminó conmigo 💔' },
            { value: 'me', label_en: 'I ended it 🚪', label_es: 'Yo terminé la relación 🚪' },
            { value: 'mutual', label_en: 'It was mutual 🤝', label_es: 'Fue mutuo 🤝' }
        ]
    },
    {
        id: 4,
        question_en: "How are you feeling today?",
        question_es: "¿Cómo te sientes hoy?",
        subtitle_en: "Be honest - this is a safe space",
        subtitle_es: "Sé honesto/a - este es un espacio seguro",
        type: 'slider',
        icon: TrendingUp,
        field: 'currentMood',
        min: 1,
        max: 10,
        labels_en: ['Terrible', 'Okay', 'Good'],
        labels_es: ['Terrible', 'Regular', 'Bien']
    },
    {
        id: 5,
        question_en: "How long were you together?",
        question_es: "¿Cuánto tiempo estuvieron juntos?",
        subtitle_en: "Every relationship matters, regardless of duration",
        subtitle_es: "Cada relación importa, sin importar la duración",
        type: 'choice',
        icon: Clock,
        field: 'relationshipDuration',
        options: [
            { value: 'less_6_months', label_en: 'Less than 6 months', label_es: 'Menos de 6 meses' },
            { value: '6_12_months', label_en: '6 months - 1 year', label_es: '6 meses - 1 año' },
            { value: '1_3_years', label_en: '1-3 years', label_es: '1-3 años' },
            { value: '3_5_years', label_en: '3-5 years', label_es: '3-5 años' },
            { value: 'more_5_years', label_en: 'More than 5 years', label_es: 'Más de 5 años' }
        ]
    },
    {
        id: 6,
        question_en: "What's been hardest for you?",
        question_es: "¿Qué te ha costado más?",
        subtitle_en: "Select all that apply - we're here to help",
        subtitle_es: "Selecciona todas las que apliquen - estamos aquí para ayudar",
        type: 'multi-choice',
        icon: AlertCircle,
        field: 'mainStruggles',
        options: [
            { value: 'no_contact', label_en: 'Not contacting them', label_es: 'No contactarle' },
            { value: 'sleep', label_en: 'Sleeping well', label_es: 'Dormir bien' },
            { value: 'focus', label_en: 'Focusing on work/study', label_es: 'Concentrarme en el trabajo/estudio' },
            { value: 'social_media', label_en: 'Not checking their social media', label_es: 'No revisar sus redes sociales' },
            { value: 'loneliness', label_en: 'Feeling lonely', label_es: 'Sentirme solo/a' },
            { value: 'acceptance', label_en: 'Accepting it\'s over', label_es: 'Aceptar que terminó' }
        ]
    }
];

export default function OnboardingExtended() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        name: '',
        breakupDate: '',
        whoEnded: '',
        currentMood: 5,
        relationshipDuration: '',
        mainStruggles: []
    });
    const [loading, setLoading] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [currentStep]);

    const currentQuestion = QUESTIONS[currentStep];
    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setCurrentStep(currentStep + 1);
            });
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setCurrentStep(currentStep - 1);
            });
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Save onboarding data to profile
            await supabase.from('profiles').upsert({
                id: user.id,
                name: data.name,
                onboarding_data: data,
                breakup_date: calculateBreakupDate(data.breakupDate),
                who_ended: data.whoEnded,
                current_mood: data.currentMood,
                relationship_duration: data.relationshipDuration,
                main_struggles: data.mainStruggles,
                onboarding_completed: true
            });

            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error saving onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateBreakupDate = (period: string): string => {
        const now = new Date();
        switch (period) {
            case 'less_week':
                return new Date(now.setDate(now.getDate() - 3)).toISOString();
            case '1_4_weeks':
                return new Date(now.setDate(now.getDate() - 14)).toISOString();
            case '1_3_months':
                return new Date(now.setMonth(now.getMonth() - 2)).toISOString();
            case '3_6_months':
                return new Date(now.setMonth(now.getMonth() - 4)).toISOString();
            case 'more_6_months':
                return new Date(now.setMonth(now.getMonth() - 9)).toISOString();
            default:
                return new Date().toISOString();
        }
    };

    const isStepValid = () => {
        const field = currentQuestion.field as keyof OnboardingData;
        const value = data[field];

        if (currentQuestion.type === 'text') {
            return typeof value === 'string' && value.trim().length > 0;
        }
        if (currentQuestion.type === 'multi-choice') {
            return Array.isArray(value) && value.length > 0;
        }
        return value !== '' && value !== undefined;
    };

    const renderQuestion = () => {
        const Icon = currentQuestion.icon;
        const question = language === 'es' ? currentQuestion.question_es : currentQuestion.question_en;
        const subtitle = language === 'es' ? currentQuestion.subtitle_es : currentQuestion.subtitle_en;

        return (
            <Animated.View style={{ opacity: fadeAnim }} className="flex-1 px-6">
                <View className="items-center mb-8">
                    <View className="w-20 h-20 rounded-full bg-purple-500/20 items-center justify-center mb-4">
                        <Icon size={40} color="#a855f7" />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center mb-2">
                        {question}
                    </Text>
                    <Text className="text-gray-400 text-center">
                        {subtitle}
                    </Text>
                </View>

                {currentQuestion.type === 'text' && (
                    <TextInput
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg"
                        placeholder={language === 'es' ? 'Tu nombre...' : 'Your name...'}
                        placeholderTextColor="#6b7280"
                        value={data.name}
                        onChangeText={(text) => setData({ ...data, name: text })}
                        autoFocus
                        style={{ outlineStyle: 'none' } as any}
                    />
                )}

                {currentQuestion.type === 'choice' && (
                    <View className="space-y-3">
                        {currentQuestion.options?.map((option) => {
                            const field = currentQuestion.field as keyof OnboardingData;
                            const isSelected = data[field] === option.value;
                            const label = language === 'es' ? option.label_es : option.label_en;

                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => setData({ ...data, [field]: option.value })}
                                    className={`p-4 rounded-2xl border-2 ${isSelected
                                            ? 'bg-purple-500/20 border-purple-500'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <Text className={`text-center text-lg ${isSelected ? 'text-purple-400 font-semibold' : 'text-white'
                                        }`}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {currentQuestion.type === 'slider' && (
                    <View>
                        <View className="items-center mb-6">
                            <Text className="text-6xl font-bold text-purple-400 mb-2">
                                {data.currentMood}
                            </Text>
                            <Text className="text-gray-400">
                                {data.currentMood <= 3
                                    ? (language === 'es' ? 'Terrible' : 'Terrible')
                                    : data.currentMood <= 7
                                        ? (language === 'es' ? 'Regular' : 'Okay')
                                        : (language === 'es' ? 'Bien' : 'Good')
                                }
                            </Text>
                        </View>
                        <View className="flex-row justify-between mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <TouchableOpacity
                                    key={num}
                                    onPress={() => setData({ ...data, currentMood: num })}
                                    className={`w-8 h-8 rounded-full items-center justify-center ${data.currentMood === num
                                            ? 'bg-purple-500'
                                            : 'bg-white/10'
                                        }`}
                                >
                                    <Text className={`text-sm ${data.currentMood === num ? 'text-white font-bold' : 'text-gray-400'
                                        }`}>
                                        {num}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {currentQuestion.type === 'multi-choice' && (
                    <View className="space-y-3">
                        {currentQuestion.options?.map((option) => {
                            const isSelected = data.mainStruggles.includes(option.value);
                            const label = language === 'es' ? option.label_es : option.label_en;

                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => {
                                        const struggles = isSelected
                                            ? data.mainStruggles.filter(s => s !== option.value)
                                            : [...data.mainStruggles, option.value];
                                        setData({ ...data, mainStruggles: struggles });
                                    }}
                                    className={`p-4 rounded-2xl border-2 ${isSelected
                                            ? 'bg-purple-500/20 border-purple-500'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <Text className={`text-center ${isSelected ? 'text-purple-400 font-semibold' : 'text-white'
                                        }`}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                {/* Progress Bar */}
                <View className="px-6 pt-4 pb-6">
                    <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </View>
                    <Text className="text-gray-400 text-sm mt-2 text-center">
                        {currentStep + 1} {language === 'es' ? 'de' : 'of'} {QUESTIONS.length}
                    </Text>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    {renderQuestion()}
                </ScrollView>

                {/* Navigation Buttons */}
                <View className="px-6 pb-6 space-y-3">
                    <TouchableOpacity
                        onPress={handleNext}
                        disabled={!isStepValid() || loading}
                        className={`rounded-2xl p-4 ${isStepValid() && !loading
                                ? 'bg-purple-600'
                                : 'bg-gray-600'
                            }`}
                    >
                        <Text className="text-white text-center font-semibold text-lg">
                            {loading
                                ? (language === 'es' ? 'Guardando...' : 'Saving...')
                                : currentStep === QUESTIONS.length - 1
                                    ? (language === 'es' ? 'Comenzar' : 'Get Started')
                                    : (language === 'es' ? 'Continuar' : 'Continue')
                            }
                        </Text>
                    </TouchableOpacity>

                    {currentStep > 0 && (
                        <TouchableOpacity
                            onPress={handleBack}
                            className="p-4"
                        >
                            <Text className="text-gray-400 text-center">
                                {language === 'es' ? 'Atrás' : 'Back'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}
