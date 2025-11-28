import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { MessageSquare, Calendar, TrendingUp, TrendingDown, AlertTriangle, Heart, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeConversation } from '../lib/conversationAnalyzer';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import DateInputModal from './DateInputModal';

interface ConversationAnalyzerModalProps {
    visible: boolean;
    onClose: () => void;
}

interface AnalysisResult {
    whoInitiatedMore: {
        user: number;
        ex: number;
    };
    interestLevel: {
        user: number;
        ex: number;
    };
    redFlags: string[];
    keyMoments: Array<{
        date: string;
        description: string;
        impact: 'positive' | 'negative' | 'neutral';
    }>;
    powerDynamics: string;
    recommendations: string[];
}

export default function ConversationAnalyzerModal({ visible, onClose }: ConversationAnalyzerModalProps) {
    const { language } = useLanguage();
    const [conversationText, setConversationText] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [dateType, setDateType] = useState<'start' | 'end'>('start');

    const handleAnalyze = async () => {
        if (!conversationText.trim()) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Por favor pega la conversación' : 'Please paste the conversation'
            );
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const analysis = await analyzeConversation(
                conversationText,
                startDate || undefined,
                endDate || undefined
            );
            setResult(analysis);

        } catch (error) {
            console.error('Error analyzing conversation:', error);
            Alert.alert('Error', 'Failed to analyze conversation');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setConversationText('');
        setStartDate('');
        setEndDate('');
        setResult(null);
        setDateModalVisible(false);
        onClose();
    };

    const openDateModal = (type: 'start' | 'end') => {
        setDateType(type);
        setDateModalVisible(true);
    };

    const handleDateSubmit = (date: string) => {
        if (dateType === 'start') {
            setStartDate(date);
        } else {
            setEndDate(date);
        }
        setDateModalVisible(false);
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={reset}
                statusBarTranslucent
            >
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-[#1a1a2e] h-[90%] rounded-t-3xl overflow-hidden shadow-2xl">
                        <LinearGradient
                            colors={['#1a1a2e', '#16213e']}
                            className="absolute inset-0"
                        />

                        {/* Header */}
                        <View className="px-6 py-5 border-b border-white/10">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-white text-xl font-bold">
                                        {language === 'es' ? 'Analizador de Conversaciones' : 'Conversation Analyzer'}
                                    </Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        {language === 'es' ? 'Descubre patrones ocultos' : 'Discover hidden patterns'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={reset}
                                    className="bg-white/10 rounded-full p-2 ml-3"
                                >
                                    <Text className="text-white text-lg">✕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                            {!result ? (
                                <>
                                    <Text className="text-gray-300 mb-4 leading-6">
                                        {language === 'es'
                                            ? 'Pega tu conversación de WhatsApp, Instagram o SMS. Analizaré quién mostraba más interés, red flags, y dinámicas de poder.'
                                            : 'Paste your WhatsApp, Instagram or SMS conversation. I\'ll analyze who showed more interest, red flags, and power dynamics.'}
                                    </Text>

                                    {/* Date Range Selector */}
                                    <View className="flex-row gap-3 mb-4">
                                        <TouchableOpacity
                                            onPress={() => openDateModal('start')}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex-row items-center"
                                        >
                                            <Calendar size={18} color="#a855f7" />
                                            <View className="ml-2 flex-1">
                                                <Text className="text-gray-400 text-xs">
                                                    {language === 'es' ? 'Desde' : 'From'}
                                                </Text>
                                                <Text className="text-white text-sm">
                                                    {startDate || (language === 'es' ? 'Seleccionar' : 'Select')}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => openDateModal('end')}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex-row items-center"
                                        >
                                            <Calendar size={18} color="#a855f7" />
                                            <View className="ml-2 flex-1">
                                                <Text className="text-gray-400 text-xs">
                                                    {language === 'es' ? 'Hasta' : 'To'}
                                                </Text>
                                                <Text className="text-white text-sm">
                                                    {endDate || (language === 'es' ? 'Seleccionar' : 'Select')}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Conversation Input */}
                                    <Text className="text-gray-400 text-sm mb-2">
                                        {language === 'es' ? 'Conversación' : 'Conversation'}
                                    </Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-base min-h-[200px]"
                                        placeholder={language === 'es'
                                            ? "Pega aquí tu conversación...\n\nEjemplo:\n[12:30] Tú: Hola, cómo estás?\n[12:45] Ex: Bien, y tú?\n..."
                                            : "Paste your conversation here...\n\nExample:\n[12:30] You: Hi, how are you?\n[12:45] Ex: Good, and you?\n..."}
                                        placeholderTextColor="#6b7280"
                                        value={conversationText}
                                        onChangeText={setConversationText}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    <TouchableOpacity
                                        onPress={handleAnalyze}
                                        disabled={loading || !conversationText.trim()}
                                        className="mt-6 mb-8"
                                    >
                                        <LinearGradient
                                            colors={loading || !conversationText.trim() ? ['#4b5563', '#4b5563'] : ['#3b82f6', '#8b5cf6']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            className="rounded-2xl p-4 flex-row justify-center items-center"
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <>
                                                    <MessageSquare size={20} color="white" />
                                                    <Text className="text-white font-bold text-lg ml-2">
                                                        {language === 'es' ? 'Analizar Conversación' : 'Analyze Conversation'}
                                                    </Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View className="pb-10">
                                    {/* Who Initiated More */}
                                    <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-4">
                                        <View className="flex-row items-center mb-3">
                                            <Users size={20} color="#3b82f6" />
                                            <Text className="text-blue-400 font-bold ml-2">
                                                {language === 'es' ? 'Quién Iniciaba Más' : 'Who Initiated More'}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-white">Tú</Text>
                                            <Text className="text-white font-bold">{result.whoInitiatedMore.user}%</Text>
                                        </View>
                                        <View className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                                            <View
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${result.whoInitiatedMore.user}%` }}
                                            />
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-white">Tu Ex</Text>
                                            <Text className="text-white font-bold">{result.whoInitiatedMore.ex}%</Text>
                                        </View>
                                        <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <View
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: `${result.whoInitiatedMore.ex}%` }}
                                            />
                                        </View>
                                    </View>

                                    {/* Interest Level */}
                                    <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 mb-4">
                                        <View className="flex-row items-center mb-3">
                                            <Heart size={20} color="#a855f7" />
                                            <Text className="text-purple-400 font-bold ml-2">
                                                {language === 'es' ? 'Nivel de Interés' : 'Interest Level'}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <Text className="text-white">Tu interés</Text>
                                            <View className="flex-row items-center">
                                                <Text className="text-white font-bold text-lg mr-1">{result.interestLevel.user}</Text>
                                                <Text className="text-gray-400">/10</Text>
                                            </View>
                                        </View>
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-white">Interés de tu ex</Text>
                                            <View className="flex-row items-center">
                                                <Text className="text-white font-bold text-lg mr-1">{result.interestLevel.ex}</Text>
                                                <Text className="text-gray-400">/10</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Red Flags */}
                                    {result.redFlags?.length > 0 && (
                                        <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-4">
                                            <View className="flex-row items-center mb-3">
                                                <AlertTriangle size={20} color="#ef4444" />
                                                <Text className="text-red-400 font-bold ml-2">
                                                    {language === 'es' ? 'Red Flags Detectadas' : 'Red Flags Detected'}
                                                </Text>
                                            </View>
                                            {result.redFlags.map((flag, i) => (
                                                <Text key={i} className="text-red-200 mb-2">🚩 {flag}</Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Key Moments */}
                                    {result.keyMoments?.length > 0 && (
                                        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                                            <Text className="text-white font-bold mb-3">
                                                {language === 'es' ? 'Momentos Clave' : 'Key Moments'}
                                            </Text>
                                            {result.keyMoments.map((moment, i) => (
                                                <View key={i} className="mb-3 flex-row">
                                                    <View className="mr-3">
                                                        {moment.impact === 'positive' && <TrendingUp size={18} color="#22c55e" />}
                                                        {moment.impact === 'negative' && <TrendingDown size={18} color="#ef4444" />}
                                                        {moment.impact === 'neutral' && <MessageSquare size={18} color="#6b7280" />}
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-gray-400 text-xs mb-1">{moment.date}</Text>
                                                        <Text className="text-white leading-5">{moment.description}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Power Dynamics */}
                                    <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-4">
                                        <Text className="text-yellow-400 font-bold mb-2">
                                            {language === 'es' ? 'Dinámicas de Poder' : 'Power Dynamics'}
                                        </Text>
                                        <Text className="text-yellow-200 leading-6">{result.powerDynamics}</Text>
                                    </View>

                                    {/* Recommendations */}
                                    <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-4">
                                        <Text className="text-green-400 font-bold mb-3">
                                            {language === 'es' ? 'Recomendaciones' : 'Recommendations'}
                                        </Text>
                                        {result.recommendations.map((rec, i) => (
                                            <Text key={i} className="text-green-200 mb-2">✓ {rec}</Text>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => setResult(null)}
                                        className="mt-4 py-4"
                                    >
                                        <Text className="text-gray-400 text-center">
                                            {language === 'es' ? 'Analizar otra conversación' : 'Analyze another conversation'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Date Input Modal */}
            <DateInputModal
                visible={dateModalVisible}
                onClose={() => setDateModalVisible(false)}
                onSubmit={handleDateSubmit}
                title={dateType === 'start'
                    ? (language === 'es' ? 'Fecha de Inicio' : 'Start Date')
                    : (language === 'es' ? 'Fecha de Fin' : 'End Date')}
            />
        </>
    );
}
