import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Heart, ArrowRight, Calendar, Target, User } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Extended onboarding data
    const [userName, setUserName] = useState('');
    const [currentMood, setCurrentMood] = useState(5);
    const [exName, setExName] = useState('');
    const [breakupDate, setBreakupDate] = useState('');
    const [whoEnded, setWhoEnded] = useState<'me' | 'them' | 'mutual'>('them');
    const [relationshipDuration, setRelationshipDuration] = useState('');
    const [mainStruggles, setMainStruggles] = useState<string[]>([]);
    const [breakupReason, setBreakupReason] = useState('');
    const [goal, setGoal] = useState<'move_on' | 'get_back' | 'learn'>('move_on');
    const [loading, setLoading] = useState(false);


    const goals = [
        { id: 'move_on', label: 'Move On', icon: '🚀', description: 'Heal and find yourself again' },
        { id: 'get_back', label: 'Get Back Together', icon: '💕', description: 'Win them back the right way' },
        { id: 'learn', label: 'Learn & Grow', icon: '🌱', description: 'Understand what happened' },
    ];

    const struggles = [
        'No contactarle',
        'Dormir bien',
        'Concentrarme en el trabajo/estudio',
        'Dejar de revisar sus redes sociales',
        'Sentirme solo/a',
        'Aceptar que terminó'
    ];

    const durations = [
        'Menos de 6 meses',
        '6 meses - 1 año',
        '1-3 años',
        '3-5 años',
        'Más de 5 años'
    ];

    const whoEndedOptions = [
        { value: 'them', label: 'Mi ex terminó conmigo', emoji: '💔' },
        { value: 'me', label: 'Yo terminé la relación', emoji: '🚪' },
        { value: 'mutual', label: 'Fue mutuo', emoji: '🤝' }
    ];

    const toggleStruggle = (struggle: string) => {
        if (mainStruggles.includes(struggle)) {
            setMainStruggles(mainStruggles.filter(s => s !== struggle));
        } else {
            setMainStruggles([...mainStruggles, struggle]);
        }
    };

    const handleComplete = async () => {
        if (!userName || !exName || !breakupDate) {
            Alert.alert('Missing Info', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await supabase.from('users').upsert({
                id: user.id,
                email: user.email,
                user_name: userName,
                current_mood: currentMood,
                ex_name: exName,
                breakup_date: breakupDate,
                who_ended: whoEnded,
                relationship_duration: relationshipDuration,
                main_struggles: mainStruggles,
                breakup_reason: breakupReason,
                goal: goal,
                no_contact_since: breakupDate,
                onboarding_completed: true,
            });

            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
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
                <ScrollView className="flex-1 px-6 py-8" showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View className="items-center mb-8">
                        <View className="w-20 h-20 rounded-full items-center justify-center mb-4">
                            <LinearGradient
                                colors={['#a855f7', '#3b82f6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="w-full h-full rounded-full items-center justify-center"
                            >
                                <Heart size={40} color="white" fill="white" />
                            </LinearGradient>
                        </View>
                        <Text className="text-white text-3xl font-bold mb-2">Welcome to Ex Coach</Text>
                        <Text className="text-gray-400 text-center">Let's personalize your healing journey</Text>
                    </View>

                    {/* Progress Indicator */}
                    <View className="flex-row justify-center mb-8">
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                            <View
                                key={s}
                                className={`h-2 w-10 rounded-full mx-1 ${s <= step ? 'bg-purple-500' : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </View>

                    {/* Step 1: Your Name + Current Mood */}
                    {step === 1 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">Let's start with you</Text>
                            <Text className="text-gray-400 mb-6">I want to get to know you better</Text>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">What's your name?</Text>
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <User size={20} color="#a855f7" />
                                    <TextInput
                                        className="flex-1 ml-3 text-white text-base"
                                        placeholder="Your name..."
                                        placeholderTextColor="#6b7280"
                                        value={userName}
                                        onChangeText={setUserName}
                                    />
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">How are you feeling today?</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl px-6 py-6">
                                    <View className="flex-row justify-between mb-4">
                                        <Text className="text-2xl">😢</Text>
                                        <Text className="text-2xl">😐</Text>
                                        <Text className="text-2xl">😊</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="text-gray-500 text-sm mr-2">1</Text>
                                        <View className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <View
                                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                                style={{ width: `${(currentMood / 10) * 100}%` }}
                                            />
                                        </View>
                                        <Text className="text-gray-500 text-sm ml-2">10</Text>
                                    </View>
                                    <View className="mt-4 items-center">
                                        <Text className="text-white text-3xl font-bold">{currentMood}</Text>
                                        <Text className="text-gray-400 text-sm">
                                            {currentMood <= 3 ? 'Terrible' : currentMood <= 6 ? 'Regular' : 'Bien'}
                                        </Text>
                                    </View>
                                    <View className="flex-row flex-wrap justify-center mt-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                            <TouchableOpacity
                                                key={num}
                                                onPress={() => setCurrentMood(num)}
                                                className={`w-10 h-10 rounded-full items-center justify-center m-1 ${currentMood === num ? 'bg-purple-500' : 'bg-white/10'
                                                    }`}
                                            >
                                                <Text className="text-white font-semibold">{num}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Step 2: Ex Info */}
                    {step === 2 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-6">Tell me about them</Text>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">What's your ex's name?</Text>
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <User size={20} color="#a855f7" />
                                    <TextInput
                                        className="flex-1 ml-3 text-white text-base"
                                        placeholder="Their name..."
                                        placeholderTextColor="#6b7280"
                                        value={exName}
                                        onChangeText={setExName}
                                    />
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">When did you break up?</Text>
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <Calendar size={20} color="#3b82f6" />
                                    <TextInput
                                        className="flex-1 ml-3 text-white text-base"
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#6b7280"
                                        value={breakupDate}
                                        onChangeText={setBreakupDate}
                                    />
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-2">What happened? (Optional)</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <TextInput
                                        className="text-white text-base min-h-[100px]"
                                        placeholder="Share as much or as little as you want..."
                                        placeholderTextColor="#6b7280"
                                        value={breakupReason}
                                        onChangeText={setBreakupReason}
                                        multiline
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Step 3: Who Ended + Duration */}
                    {step === 3 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">A bit more context</Text>
                            <Text className="text-gray-400 mb-6">This helps me understand your situation better</Text>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-3">Who ended the relationship?</Text>
                                {whoEndedOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setWhoEnded(option.value as any)}
                                        className={`mb-3 p-4 rounded-2xl border-2 ${whoEnded === option.value
                                            ? 'bg-purple-500/20 border-purple-500'
                                            : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <View className="flex-row items-center">
                                            <Text className="text-3xl mr-3">{option.emoji}</Text>
                                            <Text className="text-white text-base font-semibold">{option.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-400 mb-3">How long did the relationship last?</Text>
                                {durations.map((duration) => (
                                    <TouchableOpacity
                                        key={duration}
                                        onPress={() => setRelationshipDuration(duration)}
                                        className={`mb-3 p-4 rounded-2xl border-2 ${relationshipDuration === duration
                                            ? 'bg-blue-500/20 border-blue-500'
                                            : 'bg-white/5 border-white/10'
                                            }`}
                                    >
                                        <Text className="text-white text-base">{duration}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Step 4: Main Struggles */}
                    {step === 4 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">What's hardest for you?</Text>
                            <Text className="text-gray-400 mb-6">Select all that apply</Text>

                            {struggles.map((struggle) => (
                                <TouchableOpacity
                                    key={struggle}
                                    onPress={() => toggleStruggle(struggle)}
                                    className={`mb-3 p-4 rounded-2xl border-2 flex-row items-center ${mainStruggles.includes(struggle)
                                        ? 'bg-purple-500/20 border-purple-500'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <View className={`w-6 h-6 rounded-lg border-2 mr-3 items-center justify-center ${mainStruggles.includes(struggle)
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'border-gray-500'
                                        }`}>
                                        {mainStruggles.includes(struggle) && (
                                            <Text className="text-white font-bold">✓</Text>
                                        )}
                                    </View>
                                    <Text className="text-white text-base flex-1">{struggle}</Text>
                                </TouchableOpacity>
                            ))}

                            {mainStruggles.length === 0 && (
                                <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mt-4">
                                    <Text className="text-yellow-400 text-sm">
                                        💡 Select at least one struggle so I can give you better advice
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 5: Goal Selection */}
                    {step === 5 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">What's your goal?</Text>
                            <Text className="text-gray-400 mb-6">This helps me give you better advice</Text>

                            {goals.map((g) => (
                                <TouchableOpacity
                                    key={g.id}
                                    onPress={() => setGoal(g.id as any)}
                                    className={`mb-4 p-5 rounded-2xl border-2 ${goal === g.id
                                        ? 'bg-purple-500/20 border-purple-500'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <View className="flex-row items-center mb-2">
                                        <Text className="text-4xl mr-3">{g.icon}</Text>
                                        <Text className="text-white text-lg font-bold">{g.label}</Text>
                                    </View>
                                    <Text className="text-gray-400 text-sm">{g.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Step 6: Confirmation */}
                    {step === 6 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">You're all set!</Text>
                            <Text className="text-gray-400 mb-6">Here's what I know about you:</Text>

                            <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Your Name</Text>
                                    <Text className="text-white text-lg font-semibold">{userName}</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Current Mood</Text>
                                    <Text className="text-white text-lg font-semibold">{currentMood}/10</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Ex's Name</Text>
                                    <Text className="text-white text-lg font-semibold">{exName}</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Breakup Date</Text>
                                    <Text className="text-white text-lg font-semibold">{breakupDate}</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Who Ended It</Text>
                                    <Text className="text-white text-lg font-semibold">
                                        {whoEndedOptions.find(o => o.value === whoEnded)?.label}
                                    </Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Relationship Duration</Text>
                                    <Text className="text-white text-lg font-semibold">{relationshipDuration || 'Not specified'}</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Main Struggles</Text>
                                    <Text className="text-white text-lg font-semibold">
                                        {mainStruggles.length > 0 ? mainStruggles.join(', ') : 'None selected'}
                                    </Text>
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-sm">Your Goal</Text>
                                    <Text className="text-white text-lg font-semibold">
                                        {goals.find(g => g.id === goal)?.label}
                                    </Text>
                                </View>
                            </View>

                            <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                                <Text className="text-blue-400 text-sm">
                                    💡 I'll remember these details and use them to give you personalized advice. You can always update them in your profile.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Navigation Buttons */}
                    <View className="mt-8">
                        {step < 6 ? (
                            <TouchableOpacity
                                onPress={() => setStep(step + 1)}
                                disabled={
                                    (step === 1 && !userName) ||
                                    (step === 2 && (!exName || !breakupDate))
                                }
                                className={`flex-row items-center justify-center rounded-2xl p-4 ${(step === 1 && !userName) || (step === 2 && (!exName || !breakupDate))
                                        ? 'bg-gray-700'
                                        : 'bg-gradient-to-r from-purple-600 to-blue-600'
                                    }`}
                            >
                                <LinearGradient
                                    colors={
                                        (step === 1 && !userName) || (step === 2 && (!exName || !breakupDate))
                                            ? ['#374151', '#374151']
                                            : ['#a855f7', '#3b82f6']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="flex-row items-center justify-center rounded-2xl p-4 w-full"
                                >
                                    <Text className="text-white font-bold text-lg mr-2">Continue</Text>
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
                                    colors={['#a855f7', '#3b82f6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="flex-row items-center justify-center p-4"
                                >
                                    <Text className="text-white font-bold text-lg">
                                        {loading ? 'Saving...' : 'Start My Journey'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {step > 1 && (
                            <TouchableOpacity
                                onPress={() => setStep(step - 1)}
                                className="mt-4 p-4"
                            >
                                <Text className="text-gray-400 text-center">Back</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
