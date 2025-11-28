import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Animated, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, Phone, MessageCircle, BookOpen, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';

const INTERVENTION_MESSAGES_EN = [
    "Is it worth losing your {days} days of progress?",
    "Remember why it ended",
    "Tomorrow you'll thank yourself for not doing this",
    "This feeling will pass. It always does.",
    "What would you tell a friend in your situation?",
    "You're stronger than this urge",
    "Think about how far you've come",
    "This is just a moment. Don't make a permanent decision.",
    "Your future self is counting on you",
    "You deserve better than going backwards"
];

const INTERVENTION_MESSAGES_ES = [
    "¿Vale la pena perder tus {days} días de progreso?",
    "Recuerda por qué terminaron",
    "Mañana te agradecerás no haberlo hecho",
    "Esta sensación pasará. Siempre pasa.",
    "¿Qué le dirías a un amigo en tu situación?",
    "Eres más fuerte que este impulso",
    "Piensa en todo lo que has avanzado",
    "Esto es solo un momento. No tomes una decisión permanente.",
    "Tu yo del futuro cuenta contigo",
    "Mereces algo mejor que retroceder"
];

export default function PanicButtonAdvanced() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [isActive, setIsActive] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [noContactDays, setNoContactDays] = useState(0);
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const shakeAnim = React.useRef(new Animated.Value(0)).current;

    const messages = language === 'es' ? INTERVENTION_MESSAGES_ES : INTERVENTION_MESSAGES_EN;

    useEffect(() => {
        loadNoContactDays();
    }, []);

    useEffect(() => {
        if (isActive) {
            // Start pulsing animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Vibrate
            Vibration.vibrate([0, 500, 200, 500]);
        }
    }, [isActive]);

    useEffect(() => {
        if (isActive && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);

                // Change message every 6 seconds
                if (countdown % 6 === 0) {
                    setCurrentMessageIndex((prev) => (prev + 1) % messages.length);

                    // Shake animation for new message
                    Animated.sequence([
                        Animated.timing(shakeAnim, {
                            toValue: 10,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(shakeAnim, {
                            toValue: -10,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                        Animated.timing(shakeAnim, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isActive, countdown]);

    const loadNoContactDays = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profiles')
                .select('breakup_date, no_contact_since')
                .eq('id', user.id)
                .single();

            if (data) {
                const startDateStr = data.no_contact_since || data.breakup_date;
                if (startDateStr) {
                    const startDate = new Date(startDateStr);
                    const today = new Date();
                    const diffTime = today.getTime() - startDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    setNoContactDays(Math.max(0, diffDays));
                }
            }
        } catch (error) {
            console.error('Error loading no contact days:', error);
        }
    };

    const handleActivate = () => {
        setIsActive(true);
        setCountdown(60);
        setCurrentMessageIndex(0);
    };

    const handleCancel = () => {
        setIsActive(false);
        setCountdown(60);
        Vibration.cancel();
    };

    const handleWriteInJournal = () => {
        router.push('/tools/journal');
    };

    const handleCallFriend = () => {
        // TODO: Integrate with contacts or predefined emergency contact
        console.log('Call a friend');
    };

    const currentMessage = messages[currentMessageIndex].replace('{days}', noContactDays.toString());

    if (!isActive) {
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
                    {/* Header */}
                    <View className="flex-row items-center px-6 py-4">
                        <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/10 p-2 rounded-full">
                            <ArrowLeft size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-2xl font-bold">
                            {language === 'es' ? 'Botón de Pánico' : 'Panic Button'}
                        </Text>
                    </View>

                    <View className="flex-1 items-center justify-center px-8">
                        {/* Pulse Effect Background */}
                        <View className="absolute">
                            <View className="w-64 h-64 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
                        </View>

                        <View className="bg-white/5 border border-white/10 rounded-full p-8 mb-8">
                            <AlertCircle size={64} color="#ef4444" />
                        </View>

                        <Text className="text-white text-3xl font-bold text-center mb-4">
                            {language === 'es'
                                ? '¿Estás a punto de escribirle?'
                                : 'About to text them?'
                            }
                        </Text>

                        <Text className="text-gray-400 text-center text-lg mb-12 leading-7 px-4">
                            {language === 'es'
                                ? 'Espera. Respira. Dame 60 segundos antes de que tomes una decisión de la que podrías arrepentirte.'
                                : 'Wait. Breathe. Give me 60 seconds before you make a decision you might regret.'
                            }
                        </Text>

                        <TouchableOpacity
                            onPress={handleActivate}
                            className="w-full"
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#ef4444', '#b91c1c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="rounded-3xl p-6 items-center"
                                style={{
                                    shadowColor: '#ef4444',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 20,
                                    elevation: 10
                                }}
                            >
                                <Text className="text-white font-bold text-xl tracking-wider uppercase">
                                    {language === 'es' ? 'ACTIVAR MODO SOS' : 'ACTIVATE SOS MODE'}
                                </Text>
                                <Text className="text-red-100 text-sm mt-1">
                                    {language === 'es' ? 'Intervención de 60 segundos' : '60-second intervention'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#2a0a0a]">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#450a0a', '#1a0505']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                {/* Cancel Button */}
                <View className="flex-row justify-end px-6 py-4">
                    <TouchableOpacity
                        onPress={handleCancel}
                        className="bg-white/10 p-2 rounded-full"
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    {/* Countdown Circle */}
                    <View className="items-center mb-12 relative">
                        {/* Outer Ring */}
                        <Animated.View
                            className="absolute w-64 h-64 rounded-full border-4 border-red-500/30"
                            style={{ transform: [{ scale: pulseAnim }] }}
                        />

                        {/* Countdown Text */}
                        <View className="w-56 h-56 rounded-full bg-black/30 items-center justify-center border border-red-500/20 backdrop-blur-md">
                            <Text className="text-red-500 text-8xl font-black font-variant-numeric tabular-nums">
                                {countdown}
                            </Text>
                            <Text className="text-red-400/60 text-lg uppercase tracking-widest">
                                {language === 'es' ? 'SEGUNDOS' : 'SECONDS'}
                            </Text>
                        </View>
                    </View>

                    {/* Intervention Message */}
                    <Animated.View
                        className="bg-black/40 border border-red-500/20 rounded-3xl p-8 mb-8 backdrop-blur-xl"
                        style={{ transform: [{ translateX: shakeAnim }] }}
                    >
                        <Text className="text-white text-2xl font-bold text-center leading-9">
                            "{currentMessage}"
                        </Text>
                    </Animated.View>

                    {/* Progress Reminder */}
                    {noContactDays > 0 && (
                        <View className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 mb-8 flex-row items-center justify-center">
                            <View className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse" />
                            <Text className="text-green-400 text-center font-semibold">
                                {language === 'es'
                                    ? `${noContactDays} días de racha intactos`
                                    : `${noContactDays} day streak intact`
                                }
                            </Text>
                        </View>
                    )}

                    {/* Actions (appear after countdown) */}
                    {countdown === 0 && (
                        <View className="space-y-3 w-full">
                            <Text className="text-white text-xl font-bold text-center mb-4">
                                {language === 'es'
                                    ? 'Has superado el impulso. ¿Ahora qué?'
                                    : 'You beat the urge. Now what?'
                                }
                            </Text>

                            <TouchableOpacity
                                onPress={handleWriteInJournal}
                                className="bg-purple-600 rounded-2xl p-4 flex-row items-center justify-center shadow-lg shadow-purple-900/50"
                            >
                                <BookOpen size={24} color="white" />
                                <Text className="text-white font-bold text-lg ml-3">
                                    {language === 'es' ? 'Escribir mis sentimientos' : 'Write down feelings'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCallFriend}
                                className="bg-blue-600 rounded-2xl p-4 flex-row items-center justify-center shadow-lg shadow-blue-900/50"
                            >
                                <Phone size={24} color="white" />
                                <Text className="text-white font-bold text-lg ml-3">
                                    {language === 'es' ? 'Llamar a alguien de confianza' : 'Call someone trusted'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCancel}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2"
                            >
                                <Text className="text-gray-400 text-center font-medium">
                                    {language === 'es' ? 'Volver al inicio' : 'Back to home'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
