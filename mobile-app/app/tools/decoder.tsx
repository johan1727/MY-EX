import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, AlertTriangle, Copy, Check } from 'lucide-react-native';
import { analyzeMessage } from '../../lib/decoder';
import { canUseFeature, incrementFeatureUsage } from '../../lib/subscriptions';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';
import * as Clipboard from 'expo-clipboard';

interface DecoderResult {
    analysis: string;
    emotionalTone: string;
    hiddenMeaning: string;
    redFlags: string[];
    suggestedResponses: {
        noContact: string;
        friendly: string;
        closure: string;
    };
}

export default function DecoderAdvanced() {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DecoderResult | null>(null);
    const [copiedResponse, setCopiedResponse] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!message.trim()) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Por favor ingresa un mensaje' : 'Please enter a message'
            );
            return;
        }

        setLoading(true);
        try {
            // Check if user can use this feature
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert(
                    language === 'es' ? 'Error' : 'Error',
                    language === 'es' ? 'Debes iniciar sesión' : 'You must be logged in'
                );
                return;
            }

            // Check and increment usage limit atomically
            const { data: allowed, error } = await supabase.rpc('increment_usage', {
                user_id: user.id,
                feature_type: 'decoder'
            });

            if (error) {
                console.error('Error checking limits:', error);
            } else if (allowed === false) {
                Alert.alert(
                    language === 'es' ? 'Límite Semanal Alcanzado' : 'Weekly Limit Reached',
                    language === 'es'
                        ? 'Has alcanzado tu límite de 1 análisis semanal gratuito. Actualiza a Warrior para análisis ilimitados.'
                        : 'You\'ve reached your limit of 1 free weekly analysis. Upgrade to Warrior for unlimited analysis.',
                    [
                        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                        {
                            text: language === 'es' ? 'Ver Planes' : 'View Plans',
                            onPress: () => router.push('/paywall')
                        }
                    ]
                );
                return;
            }

            // Analyze the message
            const analysis = await analyzeMessage(message);
            setResult(analysis);
            // Usage is already incremented by the RPC call above if allowed

        } catch (error) {
            console.error('Error analyzing message:', error);
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Hubo un error al analizar el mensaje' : 'There was an error analyzing the message'
            );
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, type: string) => {
        await Clipboard.setStringAsync(text);
        setCopiedResponse(type);
        setTimeout(() => setCopiedResponse(null), 2000);
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
                {/* Header */}
                <View className="flex-row items-center px-6 py-4">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-2xl font-bold">
                            {language === 'es' ? 'Decodificador 2.0' : 'Message Decoder 2.0'}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                            {language === 'es' ? 'Análisis + Respuestas Sugeridas' : 'Analysis + Suggested Responses'}
                        </Text>
                    </View>
                </View>

                <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                    {/* Input Section */}
                    <View className="mb-6">
                        <Text className="text-white text-lg font-semibold mb-3">
                            {language === 'es' ? 'Mensaje de tu ex:' : 'Message from your ex:'}
                        </Text>
                        <TextInput
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white min-h-[120px]"
                            placeholder={language === 'es'
                                ? 'Pega aquí el mensaje que recibiste...'
                                : 'Paste the message you received here...'
                            }
                            placeholderTextColor="#6b7280"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            textAlignVertical="top"
                            style={{ outlineStyle: 'none' } as any}
                        />
                    </View>

                    {/* Analyze Button */}
                    <TouchableOpacity
                        onPress={handleAnalyze}
                        disabled={loading || !message.trim()}
                        className={`mb-6 rounded-2xl p-4 ${loading || !message.trim() ? 'bg-gray-600' : 'bg-blue-600'
                            }`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white text-center font-semibold text-lg">
                                {language === 'es' ? 'Analizar Mensaje' : 'Analyze Message'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Results */}
                    {result && (
                        <>
                            {/* Analysis */}
                            <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
                                <View className="flex-row items-center mb-4">
                                    <MessageSquare size={24} color="#3b82f6" />
                                    <Text className="text-white text-lg font-bold ml-2">
                                        {language === 'es' ? 'Análisis Honesto' : 'Honest Analysis'}
                                    </Text>
                                </View>
                                <Text className="text-gray-300 leading-6 mb-4">
                                    {result.analysis}
                                </Text>

                                <View className="border-t border-white/10 pt-4">
                                    <Text className="text-gray-400 text-sm mb-2">
                                        {language === 'es' ? 'Tono Emocional:' : 'Emotional Tone:'}
                                    </Text>
                                    <Text className="text-purple-400 font-semibold">
                                        {result.emotionalTone}
                                    </Text>
                                </View>

                                {result.hiddenMeaning && (
                                    <View className="border-t border-white/10 pt-4 mt-4">
                                        <Text className="text-gray-400 text-sm mb-2">
                                            {language === 'es' ? 'Significado Oculto:' : 'Hidden Meaning:'}
                                        </Text>
                                        <Text className="text-gray-300">
                                            {result.hiddenMeaning}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Red Flags */}
                            {result.redFlags && result.redFlags.length > 0 && (
                                <View className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 mb-4">
                                    <View className="flex-row items-center mb-4">
                                        <AlertTriangle size={24} color="#ef4444" />
                                        <Text className="text-red-400 text-lg font-bold ml-2">
                                            {language === 'es' ? 'Red Flags' : 'Red Flags'}
                                        </Text>
                                    </View>
                                    {result.redFlags.map((flag, index) => (
                                        <View key={index} className="flex-row items-start mb-2">
                                            <Text className="text-red-400 mr-2">•</Text>
                                            <Text className="text-red-300 flex-1">{flag}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Suggested Responses */}
                            <Text className="text-white text-xl font-bold mb-4">
                                {language === 'es' ? 'Respuestas Sugeridas' : 'Suggested Responses'}
                            </Text>
                            <Text className="text-gray-400 mb-4">
                                {language === 'es'
                                    ? 'Elige el tono que mejor se adapte a tu situación:'
                                    : 'Choose the tone that best fits your situation:'
                                }
                            </Text>

                            {/* No Contact Response */}
                            <ResponseCard
                                title={language === 'es' ? 'Contacto Cero' : 'No Contact'}
                                subtitle={language === 'es' ? 'Mantén tus límites' : 'Maintain your boundaries'}
                                response={result.suggestedResponses.noContact}
                                color="#22c55e"
                                onCopy={() => copyToClipboard(result.suggestedResponses.noContact, 'noContact')}
                                copied={copiedResponse === 'noContact'}
                            />

                            {/* Friendly Response */}
                            <ResponseCard
                                title={language === 'es' ? 'Amable pero Distante' : 'Friendly but Distant'}
                                subtitle={language === 'es' ? 'Cortés pero claro' : 'Polite but clear'}
                                response={result.suggestedResponses.friendly}
                                color="#3b82f6"
                                onCopy={() => copyToClipboard(result.suggestedResponses.friendly, 'friendly')}
                                copied={copiedResponse === 'friendly'}
                            />

                            {/* Closure Response */}
                            <ResponseCard
                                title={language === 'es' ? 'Cierre Definitivo' : 'Definitive Closure'}
                                subtitle={language === 'es' ? 'Mensaje final y claro' : 'Final and clear message'}
                                response={result.suggestedResponses.closure}
                                color="#a855f7"
                                onCopy={() => copyToClipboard(result.suggestedResponses.closure, 'closure')}
                                copied={copiedResponse === 'closure'}
                            />

                            {/* Disclaimer */}
                            <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-8">
                                <Text className="text-yellow-400 text-sm text-center">
                                    {language === 'es'
                                        ? '⚠️ Recuerda: No estás obligado/a a responder. A veces, el silencio es la mejor respuesta.'
                                        : '⚠️ Remember: You\'re not obligated to respond. Sometimes, silence is the best answer.'
                                    }
                                </Text>
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

function ResponseCard({
    title,
    subtitle,
    response,
    color,
    onCopy,
    copied
}: {
    title: string;
    subtitle: string;
    response: string;
    color: string;
    onCopy: () => void;
    copied: boolean;
}) {
    return (
        <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
            <View className="flex-row items-center justify-between mb-3">
                <View>
                    <Text className="text-white text-lg font-bold" style={{ color }}>
                        {title}
                    </Text>
                    <Text className="text-gray-400 text-sm">{subtitle}</Text>
                </View>
                <TouchableOpacity
                    onPress={onCopy}
                    className="bg-white/10 rounded-full p-2"
                >
                    {copied ? (
                        <Check size={20} color="#22c55e" />
                    ) : (
                        <Copy size={20} color={color} />
                    )}
                </TouchableOpacity>
            </View>
            <Text className="text-gray-300 leading-6">
                {response}
            </Text>
        </View>
    );
}
