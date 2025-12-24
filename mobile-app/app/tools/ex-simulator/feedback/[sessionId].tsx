import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, AlertTriangle, Lightbulb, TrendingUp, RefreshCw, Home } from 'lucide-react-native';
import { supabase } from '../../../../lib/supabase';
import { analyzeConversation, ConversationAnalysis } from '../../../../lib/exSimulator';

export default function SimulationFeedback() {
    const { sessionId } = useLocalSearchParams();
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const { data, error } = await supabase
                .from('simulation_sessions')
                .select('*, ex_profiles(ex_name, profile_data)')
                .eq('id', sessionId)
                .single();

            if (error) throw error;

            setSession(data);

            // Check if analysis already exists
            if (data.analysis) {
                setAnalysis(data.analysis);
                setLoading(false);
            } else {
                // Generate analysis
                await generateAnalysis(data);
            }
        } catch (error) {
            console.error('Error loading session:', error);
            Alert.alert('Error', 'No se pudo cargar la sesión');
            router.back();
        }
    };

    const generateAnalysis = async (sessionData: any) => {
        setAnalyzing(true);
        try {
            const messages = sessionData.messages.map((m: any) => ({
                role: m.role,
                content: m.content
            }));

            const profile = sessionData.ex_profiles.profile_data;
            const analysisResult = await analyzeConversation(messages, profile);

            // Save analysis to database
            const { error } = await supabase
                .from('simulation_sessions')
                .update({ analysis: analysisResult })
                .eq('id', sessionId);

            if (error) throw error;

            setAnalysis(analysisResult);
        } catch (error) {
            console.error('Error generating analysis:', error);
            Alert.alert('Error', 'No se pudo generar el análisis');
        } finally {
            setAnalyzing(false);
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    };

    if (loading || analyzing) {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
                <ActivityIndicator size="large" color="#a855f7" />
                <Text className="text-white text-xl font-bold mt-6 text-center">
                    {analyzing ? 'Analizando tu conversación...' : 'Cargando...'}
                </Text>
                <Text className="text-gray-400 text-center mt-2">
                    Esto puede tardar unos segundos
                </Text>
            </View>
        );
    }

    if (!analysis) {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
                <Text className="text-white text-xl font-bold">Error al cargar análisis</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#0a0a0a]">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-6 pt-6">
                    {/* Header */}
                    <View className="mb-6">
                        <Text className="text-white text-3xl font-bold mb-2">
                            📊 Análisis de Simulación
                        </Text>
                        <Text className="text-gray-400">
                            Conversación con {session?.ex_profiles?.ex_name}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                            Duración: {formatDuration(session?.duration_seconds || 0)} • {session?.messages?.length || 0} mensajes
                        </Text>
                    </View>

                    {/* Strengths */}
                    <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                            <CheckCircle2 size={24} color="#22c55e" />
                            <Text className="text-white text-xl font-bold ml-2">
                                Fortalezas
                            </Text>
                        </View>
                        <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                            {analysis.strengths.map((strength, idx) => (
                                <View key={idx} className="flex-row mb-2">
                                    <Text className="text-green-400 mr-2">✓</Text>
                                    <Text className="text-gray-200 flex-1 leading-6">{strength}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Improvements */}
                    <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                            <AlertTriangle size={24} color="#f59e0b" />
                            <Text className="text-white text-xl font-bold ml-2">
                                Áreas de Mejora
                            </Text>
                        </View>
                        <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                            {analysis.improvements.map((improvement, idx) => (
                                <View key={idx} className="flex-row mb-2">
                                    <Text className="text-yellow-400 mr-2">⚠</Text>
                                    <Text className="text-gray-200 flex-1 leading-6">{improvement}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Suggestions */}
                    <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                            <Lightbulb size={24} color="#3b82f6" />
                            <Text className="text-white text-xl font-bold ml-2">
                                Sugerencias
                            </Text>
                        </View>
                        <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                            {analysis.suggestions.map((suggestion, idx) => (
                                <View key={idx} className="flex-row mb-2">
                                    <Text className="text-blue-400 mr-2">💡</Text>
                                    <Text className="text-gray-200 flex-1 leading-6">{suggestion}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Patterns Detected */}
                    <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                            <TrendingUp size={24} color="#a855f7" />
                            <Text className="text-white text-xl font-bold ml-2">
                                Patrones Detectados
                            </Text>
                        </View>
                        <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
                            {analysis.patternsDetected.map((pattern, idx) => (
                                <View key={idx} className="flex-row mb-2">
                                    <Text className="text-purple-400 mr-2">📈</Text>
                                    <Text className="text-gray-200 flex-1 leading-6">{pattern}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="mb-8">
                        <TouchableOpacity
                            onPress={() => router.push(`/(tabs)/chat` as any)}
                            className="mb-3"
                        >
                            <LinearGradient
                                colors={['#a855f7', '#3b82f6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="rounded-2xl py-4 flex-row items-center justify-center"
                            >
                                <RefreshCw size={20} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">
                                    Nueva Simulación
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)' as any)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-4 flex-row items-center justify-center"
                        >
                            <Home size={20} color="#9ca3af" />
                            <Text className="text-gray-300 font-bold text-lg ml-2">
                                Volver al Inicio
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}
