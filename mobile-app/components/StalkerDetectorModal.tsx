import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Eye, Shield, AlertTriangle, CheckCircle, XCircle, Lock, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeStalkerBehavior } from '../lib/stalkerDetector';
import { useLanguage } from '../lib/i18n';

interface StalkerDetectorModalProps {
    visible: boolean;
    onClose: () => void;
    onAnalyzeInChat: (text: string) => void;
}

interface AnalysisResult {
    riskLevel: 'low' | 'medium' | 'high';
    behaviors: Array<{
        behavior: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
    }>;
    recommendations: string[];
    privacyTips: string[];
    contentStrategy: {
        whatToPost: string[];
        whatToAvoid: string[];
    };
}

const BEHAVIOR_OPTIONS = [
    'Ve todas mis historias inmediatamente',
    'Le da like a fotos antiguas',
    'Revisa mi ubicación en redes',
    'Pregunta a amigos por mí',
    'Crea cuentas falsas para verme',
    'Aparece "casualmente" donde estoy',
    'Comenta o reacciona a todo lo que publico',
    'Me envía mensajes indirectos en redes',
    'Comparte contenido dirigido a mí',
    'Me bloquea y desbloquea repetidamente'
];

export default function StalkerDetectorModal({ visible, onClose, onAnalyzeInChat }: StalkerDetectorModalProps) {
    const { language } = useLanguage();
    const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const toggleBehavior = (behavior: string) => {
        if (selectedBehaviors.includes(behavior)) {
            setSelectedBehaviors(selectedBehaviors.filter(b => b !== behavior));
        } else {
            setSelectedBehaviors([...selectedBehaviors, behavior]);
        }
    };

    const handleAnalyze = async () => {
        if (selectedBehaviors.length === 0) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Selecciona al menos un comportamiento' : 'Select at least one behavior'
            );
            return;
        }

        setLoading(true);
        try {
            const analysis = await analyzeStalkerBehavior(selectedBehaviors);
            setResult(analysis);
        } catch (error) {
            console.error('Error analyzing stalker behavior:', error);
            Alert.alert('Error', 'Failed to analyze behavior');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSelectedBehaviors([]);
        setResult(null);
        onClose();
    };

    const getRiskColor = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'low': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'high': return '#ef4444';
        }
    };

    const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'low': return CheckCircle;
            case 'medium': return AlertTriangle;
            case 'high': return XCircle;
        }
    };

    return (
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
                                    {language === 'es' ? 'Detector de Stalking' : 'Stalker Detector'}
                                </Text>
                                <Text className="text-gray-400 text-sm mt-1">
                                    {language === 'es' ? 'Analiza comportamientos preocupantes' : 'Analyze concerning behaviors'}
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
                                <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 mb-6">
                                    <View className="flex-row items-center mb-2">
                                        <Eye size={20} color="#a855f7" />
                                        <Text className="text-purple-400 font-bold ml-2">
                                            {language === 'es' ? '¿Qué comportamientos has notado?' : 'What behaviors have you noticed?'}
                                        </Text>
                                    </View>
                                    <Text className="text-purple-200 text-sm">
                                        {language === 'es'
                                            ? 'Selecciona todos los que apliquen. Te ayudaré a entender si son normales o preocupantes.'
                                            : 'Select all that apply. I\'ll help you understand if they\'re normal or concerning.'}
                                    </Text>
                                </View>

                                {/* Behavior Checklist */}
                                {BEHAVIOR_OPTIONS.map((behavior, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => toggleBehavior(behavior)}
                                        className={`mb-3 rounded-xl p-4 flex-row items-center ${selectedBehaviors.includes(behavior)
                                            ? 'bg-purple-600/20 border-2 border-purple-500'
                                            : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${selectedBehaviors.includes(behavior)
                                            ? 'bg-purple-600 border-purple-500'
                                            : 'border-gray-500'
                                            }`}>
                                            {selectedBehaviors.includes(behavior) && (
                                                <Text className="text-white text-xs">✓</Text>
                                            )}
                                        </View>
                                        <Text className="text-white flex-1">{behavior}</Text>
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    onPress={handleAnalyze}
                                    disabled={loading || selectedBehaviors.length === 0}
                                    className="mt-6 mb-8"
                                >
                                    <LinearGradient
                                        colors={loading || selectedBehaviors.length === 0 ? ['#4b5563', '#4b5563'] : ['#8b5cf6', '#ec4899']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="rounded-2xl p-4 flex-row justify-center items-center"
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Shield size={20} color="white" />
                                                <Text className="text-white font-bold text-lg ml-2">
                                                    {language === 'es' ? 'Analizar Comportamientos' : 'Analyze Behaviors'}
                                                </Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View className="pb-10">
                                {/* Risk Level */}
                                <View
                                    className="rounded-2xl p-5 mb-4"
                                    style={{ backgroundColor: `${getRiskColor(result.riskLevel)}20`, borderColor: `${getRiskColor(result.riskLevel)}50`, borderWidth: 1 }}
                                >
                                    <View className="flex-row items-center mb-2">
                                        {React.createElement(getRiskIcon(result.riskLevel), { size: 24, color: getRiskColor(result.riskLevel) })}
                                        <Text className="font-bold ml-2 text-lg" style={{ color: getRiskColor(result.riskLevel) }}>
                                            {language === 'es' ? 'Nivel de Riesgo: ' : 'Risk Level: '}
                                            {result.riskLevel === 'low' && (language === 'es' ? 'Bajo' : 'Low')}
                                            {result.riskLevel === 'medium' && (language === 'es' ? 'Medio' : 'Medium')}
                                            {result.riskLevel === 'high' && (language === 'es' ? 'Alto' : 'High')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Behaviors Analysis */}
                                {result.behaviors.length > 0 && (
                                    <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                                        <Text className="text-white font-bold mb-3">
                                            {language === 'es' ? 'Análisis de Comportamientos' : 'Behavior Analysis'}
                                        </Text>
                                        {result.behaviors.map((behavior, i) => (
                                            <View key={i} className="mb-3 pb-3 border-b border-white/10 last:border-b-0">
                                                <Text className="text-white font-semibold mb-1">{behavior.behavior}</Text>
                                                <Text className="text-gray-400 text-sm">{behavior.description}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Recommendations */}
                                <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-3">
                                        <Shield size={20} color="#3b82f6" />
                                        <Text className="text-blue-400 font-bold ml-2">
                                            {language === 'es' ? 'Recomendaciones' : 'Recommendations'}
                                        </Text>
                                    </View>
                                    {result.recommendations.map((rec, i) => (
                                        <Text key={i} className="text-blue-200 mb-2">• {rec}</Text>
                                    ))}
                                </View>

                                {/* Privacy Tips */}
                                <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-3">
                                        <Lock size={20} color="#f59e0b" />
                                        <Text className="text-yellow-400 font-bold ml-2">
                                            {language === 'es' ? 'Tips de Privacidad' : 'Privacy Tips'}
                                        </Text>
                                    </View>
                                    {result.privacyTips.map((tip, i) => (
                                        <Text key={i} className="text-yellow-200 mb-2">🔒 {tip}</Text>
                                    ))}
                                </View>

                                {/* Content Strategy */}
                                <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-4">
                                    <Text className="text-green-400 font-bold mb-3">
                                        {language === 'es' ? 'Estrategia de Contenido' : 'Content Strategy'}
                                    </Text>

                                    <Text className="text-green-300 font-semibold mb-2">
                                        {language === 'es' ? '✓ Qué Publicar:' : '✓ What to Post:'}
                                    </Text>
                                    {result.contentStrategy.whatToPost.map((item, i) => (
                                        <Text key={i} className="text-green-200 mb-1 ml-2">• {item}</Text>
                                    ))}

                                    <Text className="text-red-300 font-semibold mt-3 mb-2">
                                        {language === 'es' ? '✗ Qué Evitar:' : '✗ What to Avoid:'}
                                    </Text>
                                    {result.contentStrategy.whatToAvoid.map((item, i) => (
                                        <Text key={i} className="text-red-200 mb-1 ml-2">• {item}</Text>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        const analysisText = `He analizado estos comportamientos de mi ex: ${selectedBehaviors.join(', ')}. El detector indica un riesgo ${result.riskLevel}. ¿Qué opinas y qué debería hacer específicamente?`;
                                        onAnalyzeInChat(analysisText);
                                    }}
                                    className="bg-purple-600 rounded-2xl p-4 mb-3 flex-row justify-center items-center"
                                >
                                    <MessageSquare size={20} color="white" />
                                    <Text className="text-white font-bold text-lg ml-2">
                                        {language === 'es' ? 'Discutir con Ex Coach' : 'Discuss with Ex Coach'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setResult(null)}
                                    className="py-4"
                                >
                                    <Text className="text-gray-400 text-center">
                                        {language === 'es' ? 'Hacer otro análisis' : 'Do another analysis'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
