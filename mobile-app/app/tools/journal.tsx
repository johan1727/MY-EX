import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';
import {
    saveJournalEntry,
    getJournalEntries,
    getWeeklyMoodData,
    generateWeeklyAnalysis,
    EMOTION_OPTIONS,
    JournalEntry,
    WeeklyAnalysis,
    MoodData
} from '../../lib/journal';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import FeatureGate from '../../components/FeatureGate';

const { width } = Dimensions.get('window');

export default function JournalScreen() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [moodScore, setMoodScore] = useState(5);
    const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
    const [entryText, setEntryText] = useState('');
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [weeklyData, setWeeklyData] = useState<MoodData[]>([]);
    const [weeklyAnalysis, setWeeklyAnalysis] = useState<WeeklyAnalysis | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const journalEntries = await getJournalEntries(user.id, 7);
            setEntries(journalEntries);

            const moodData = await getWeeklyMoodData(user.id);
            setWeeklyData(moodData);
        } catch (error) {
            console.error('Error loading journal data:', error);
        }
    };

    const handleSave = async () => {
        if (!entryText.trim()) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Por favor escribe algo' : 'Please write something'
            );
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const result = await saveJournalEntry(user.id, moodScore, selectedEmotions, entryText);

            if (result.success) {
                Alert.alert(
                    language === 'es' ? 'Guardado' : 'Saved',
                    language === 'es' ? 'Tu entrada ha sido guardada' : 'Your entry has been saved'
                );
                setEntryText('');
                setSelectedEmotions([]);
                setMoodScore(5);
                loadData();
            } else {
                Alert.alert('Error', result.error || 'Failed to save');
            }
        } catch (error) {
            console.error('Error saving entry:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAnalysis = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const analysis = await generateWeeklyAnalysis(user.id);
            if (analysis) {
                setWeeklyAnalysis(analysis);
                setShowAnalysis(true);
            } else {
                Alert.alert(
                    language === 'es' ? 'Sin Datos' : 'No Data',
                    language === 'es'
                        ? 'Necesitas al menos una entrada esta semana para generar análisis'
                        : 'You need at least one entry this week to generate analysis'
                );
            }
        } catch (error) {
            console.error('Error generating analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleEmotion = (emotion: string) => {
        if (selectedEmotions.includes(emotion)) {
            setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
        } else {
            setSelectedEmotions([...selectedEmotions, emotion]);
        }
    };

    return (
        <FeatureGate feature="journal">
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
                        <TouchableOpacity onPress={() => router.back()} className="mr-4">
                            <ArrowLeft size={24} color="white" />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-white text-2xl font-bold">
                                {language === 'es' ? 'Diario de Ánimo' : 'Mood Journal'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleGenerateAnalysis}>
                            <TrendingUp size={24} color="#a855f7" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                        {/* Mood Chart */}
                        {weeklyData.length > 0 && (
                            <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
                                <Text className="text-white text-lg font-bold mb-4">
                                    {language === 'es' ? 'Tu Semana' : 'Your Week'}
                                </Text>
                                <LineChart
                                    data={{
                                        labels: weeklyData.map(d => d.date),
                                        datasets: [{ data: weeklyData.map(d => d.mood) }]
                                    }}
                                    width={width - 80}
                                    height={200}
                                    chartConfig={{
                                        backgroundColor: '#1a1a2e',
                                        backgroundGradientFrom: '#1a1a2e',
                                        backgroundGradientTo: '#16213e',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                        style: { borderRadius: 16 },
                                        propsForDots: {
                                            r: '6',
                                            strokeWidth: '2',
                                            stroke: '#a855f7'
                                        }
                                    }}
                                    bezier
                                    style={{ borderRadius: 16 }}
                                />
                            </View>
                        )}

                        {/* New Entry */}
                        <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
                            <Text className="text-white text-lg font-bold mb-4">
                                {language === 'es' ? 'Nueva Entrada' : 'New Entry'}
                            </Text>

                            {/* Mood Selector */}
                            <Text className="text-gray-400 mb-4 text-center">
                                {language === 'es' ? '¿Cómo te sientes hoy?' : 'How are you feeling today?'}
                            </Text>

                            <View className="items-center mb-8">
                                <View className="w-24 h-24 rounded-full items-center justify-center mb-4 border-4"
                                    style={{
                                        borderColor: moodScore >= 8 ? '#22c55e' : moodScore >= 5 ? '#eab308' : '#ef4444',
                                        backgroundColor: moodScore >= 8 ? '#22c55e20' : moodScore >= 5 ? '#eab30820' : '#ef444420'
                                    }}
                                >
                                    <Text className="text-5xl font-bold text-white">
                                        {moodScore}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between w-full px-2">
                                    <Text className="text-red-400 text-xs font-bold">MAL</Text>
                                    <Text className="text-yellow-400 text-xs font-bold">REGULAR</Text>
                                    <Text className="text-green-400 text-xs font-bold">BIEN</Text>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full mt-3 py-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <TouchableOpacity
                                            key={num}
                                            onPress={() => setMoodScore(num)}
                                            className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${moodScore === num
                                                ? (num >= 8 ? 'bg-green-500' : num >= 5 ? 'bg-yellow-500' : 'bg-red-500')
                                                : 'bg-white/10'
                                                }`}
                                        >
                                            <Text className={`text-lg ${moodScore === num ? 'text-white font-bold' : 'text-gray-400'}`}>
                                                {num}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Emotions */}
                            <Text className="text-gray-400 mb-3">
                                {language === 'es' ? '¿Qué emociones sientes?' : 'What emotions do you feel?'}
                            </Text>
                            <View className="flex-row flex-wrap gap-3 mb-8">
                                {EMOTION_OPTIONS.map((emotion) => {
                                    const isSelected = selectedEmotions.includes(emotion.value);
                                    const label = language === 'es' ? emotion.label_es : emotion.label_en;

                                    return (
                                        <TouchableOpacity
                                            key={emotion.value}
                                            onPress={() => toggleEmotion(emotion.value)}
                                            className={`rounded-xl px-4 py-3 flex-row items-center transition-all ${isSelected ? 'bg-white/20 border-2' : 'bg-white/5 border border-white/5'
                                                }`}
                                            style={{
                                                borderColor: isSelected ? emotion.color : 'rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <Text className="mr-2 text-lg">{emotion.emoji}</Text>
                                            <Text className={`${isSelected ? 'text-white font-bold' : 'text-gray-400'}`}>
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Text Entry */}
                            <TextInput
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white min-h-[120px]"
                                placeholder={language === 'es'
                                    ? 'Escribe cómo te sientes...'
                                    : 'Write how you feel...'
                                }
                                placeholderTextColor="#6b7280"
                                value={entryText}
                                onChangeText={setEntryText}
                                multiline
                                textAlignVertical="top"
                                style={{ outlineStyle: 'none' } as any}
                            />

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                className={`mt-4 rounded-2xl p-4 ${loading ? 'bg-gray-600' : 'bg-purple-600'}`}
                            >
                                <Text className="text-white text-center font-semibold text-lg">
                                    {loading
                                        ? (language === 'es' ? 'Guardando...' : 'Saving...')
                                        : (language === 'es' ? 'Guardar Entrada' : 'Save Entry')
                                    }
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Weekly Analysis */}
                        {showAnalysis && weeklyAnalysis && (
                            <View className="bg-purple-500/10 border border-purple-500/30 rounded-3xl p-6 mb-8">
                                <Text className="text-purple-400 text-xl font-bold mb-4">
                                    {language === 'es' ? 'Análisis Semanal' : 'Weekly Analysis'}
                                </Text>

                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm mb-1">
                                        {language === 'es' ? 'Ánimo Promedio' : 'Average Mood'}
                                    </Text>
                                    <Text className="text-white text-2xl font-bold">
                                        {weeklyAnalysis.averageMood.toFixed(1)}/10
                                    </Text>
                                </View>

                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm mb-1">
                                        {language === 'es' ? 'Tendencia' : 'Trend'}
                                    </Text>
                                    <Text className="text-white font-semibold">
                                        {weeklyAnalysis.moodTrend === 'improving' && '📈 Mejorando'}
                                        {weeklyAnalysis.moodTrend === 'stable' && '➡️ Estable'}
                                        {weeklyAnalysis.moodTrend === 'declining' && '📉 Declinando'}
                                    </Text>
                                </View>

                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm mb-2">
                                        {language === 'es' ? 'Insights' : 'Insights'}
                                    </Text>
                                    <Text className="text-white leading-6">
                                        {weeklyAnalysis.insights}
                                    </Text>
                                </View>

                                <View className="mb-4">
                                    <Text className="text-gray-400 text-sm mb-2">
                                        {language === 'es' ? 'Recomendaciones' : 'Recommendations'}
                                    </Text>
                                    {weeklyAnalysis.recommendations.map((rec, index) => (
                                        <Text key={index} className="text-white mb-2">
                                            • {rec}
                                        </Text>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    onPress={() => setShowAnalysis(false)}
                                    className="bg-purple-600 rounded-xl p-3"
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {language === 'es' ? 'Cerrar' : 'Close'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </FeatureGate>
    );
}
