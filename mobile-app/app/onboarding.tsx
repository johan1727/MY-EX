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
    const [exName, setExName] = useState('');
    const [breakupDate, setBreakupDate] = useState('');
    const [breakupReason, setBreakupReason] = useState('');
    const [goal, setGoal] = useState<'move_on' | 'get_back' | 'learn'>('move_on');
    const [loading, setLoading] = useState(false);

    const goals = [
        { id: 'move_on', label: 'Move On', icon: '🚀', description: 'Heal and find yourself again' },
        { id: 'get_back', label: 'Get Back Together', icon: '💕', description: 'Win them back the right way' },
        { id: 'learn', label: 'Learn & Grow', icon: '🌱', description: 'Understand what happened' },
    ];

    const handleComplete = async () => {
        if (!exName || !breakupDate) {
            Alert.alert('Missing Info', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            await supabase.from('profiles').upsert({
                user_id: user.id,
                ex_name: exName,
                breakup_date: breakupDate,
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
                        {[1, 2, 3].map((s) => (
                            <View
                                key={s}
                                className={`h-2 w-16 rounded-full mx-1 ${s <= step ? 'bg-purple-500' : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </View>

                    {/* Step 1: Ex Info */}
                    {step === 1 && (
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

                    {/* Step 2: Goal Selection */}
                    {step === 2 && (
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

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <View>
                            <Text className="text-white text-2xl font-bold mb-2">You're all set!</Text>
                            <Text className="text-gray-400 mb-6">Here's what I know about you:</Text>

                            <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Ex's Name</Text>
                                    <Text className="text-white text-lg font-semibold">{exName}</Text>
                                </View>
                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm">Breakup Date</Text>
                                    <Text className="text-white text-lg font-semibold">{breakupDate}</Text>
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
                        {step < 3 ? (
                            <TouchableOpacity
                                onPress={() => setStep(step + 1)}
                                disabled={step === 1 && (!exName || !breakupDate)}
                                className={`flex-row items-center justify-center rounded-2xl p-4 ${step === 1 && (!exName || !breakupDate)
                                    ? 'bg-gray-700'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600'
                                    }`}
                            >
                                <LinearGradient
                                    colors={step === 1 && (!exName || !breakupDate) ? ['#374151', '#374151'] : ['#a855f7', '#3b82f6']}
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
