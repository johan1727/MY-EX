import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { X, MessageSquare, AlertTriangle, Copy, Check, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { analyzeMessage } from '../lib/decoder';
import { canUseFeature, incrementFeatureUsage } from '../lib/subscriptions';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

interface DecoderModalProps {
    visible: boolean;
    onClose: () => void;
    onInsertResponse?: (text: string) => void;
}

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

export default function DecoderModal({ visible, onClose, onInsertResponse }: DecoderModalProps) {
    const { language } = useLanguage();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DecoderResult | null>(null);
    const [copiedResponse, setCopiedResponse] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!message.trim()) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const access = await canUseFeature(user.id, 'decoder');
            if (!access.allowed) {
                Alert.alert(
                    language === 'es' ? 'Límite Alcanzado' : 'Limit Reached',
                    access.reason || 'Upgrade to Warrior for unlimited analysis.'
                );
                return;
            }

            const analysis = await analyzeMessage(message);
            setResult(analysis);
            await incrementFeatureUsage(user.id, 'decoder');

        } catch (error) {
            console.error('Error analyzing:', error);
            Alert.alert('Error', 'Failed to analyze message');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyOrInsert = async (text: string, type: string) => {
        if (onInsertResponse) {
            onInsertResponse(text);
            onClose();
        } else {
            await Clipboard.setStringAsync(text);
            setCopiedResponse(type);
            setTimeout(() => setCopiedResponse(null), 2000);
        }
    };

    const reset = () => {
        setMessage('');
        setResult(null);
        onClose();
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
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
                        <Text className="text-white text-xl font-bold">
                            {language === 'es' ? 'Decodificador de Mensajes' : 'Message Decoder'}
                        </Text>
                        <TouchableOpacity onPress={reset} className="bg-white/10 rounded-full p-2">
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                        {!result ? (
                            <>
                                <Text className="text-gray-400 mb-4">
                                    {language === 'es'
                                        ? 'Pega el mensaje de tu ex para analizar su significado real y obtener respuestas sugeridas.'
                                        : 'Paste your ex\'s message to analyze its true meaning and get suggested responses.'}
                                </Text>

                                <TextInput
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white min-h-[150px] text-base"
                                    placeholder={language === 'es' ? 'Pega el mensaje aquí...' : 'Paste message here...'}
                                    placeholderTextColor="#6b7280"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity
                                    onPress={handleAnalyze}
                                    disabled={loading || !message.trim()}
                                    className={`mt-6 rounded-2xl p-4 flex-row justify-center items-center ${loading || !message.trim() ? 'bg-gray-700' : 'bg-blue-600'}`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <MessageSquare size={20} color="white" className="mr-2" />
                                            <Text className="text-white font-bold text-lg ml-2">
                                                {language === 'es' ? 'Analizar' : 'Analyze'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View className="pb-10">
                                {/* Analysis Result */}
                                <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-4">
                                    <Text className="text-blue-400 font-bold mb-2">
                                        {language === 'es' ? 'Análisis' : 'Analysis'}
                                    </Text>
                                    <Text className="text-white leading-6">{result.analysis}</Text>
                                </View>

                                {result.hiddenMeaning && (
                                    <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 mb-4">
                                        <Text className="text-purple-400 font-bold mb-2">
                                            {language === 'es' ? 'Subtexto' : 'Subtext'}
                                        </Text>
                                        <Text className="text-white leading-6">{result.hiddenMeaning}</Text>
                                    </View>
                                )}

                                {result.redFlags?.length > 0 && (
                                    <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6">
                                        <View className="flex-row items-center mb-3">
                                            <AlertTriangle size={18} color="#ef4444" />
                                            <Text className="text-red-400 font-bold ml-2">Red Flags</Text>
                                        </View>
                                        {result.redFlags.map((flag, i) => (
                                            <Text key={i} className="text-red-200 mb-1">• {flag}</Text>
                                        ))}
                                    </View>
                                )}

                                <Text className="text-white text-lg font-bold mb-4">
                                    {language === 'es' ? 'Respuestas Sugeridas' : 'Suggested Responses'}
                                </Text>

                                <ResponseOption
                                    title={language === 'es' ? 'Contacto Cero' : 'No Contact'}
                                    text={result.suggestedResponses.noContact}
                                    color="#22c55e"
                                    onSelect={() => handleCopyOrInsert(result.suggestedResponses.noContact, 'noContact')}
                                    isCopied={copiedResponse === 'noContact'}
                                    actionLabel={onInsertResponse ? (language === 'es' ? 'Usar' : 'Use') : undefined}
                                />

                                <ResponseOption
                                    title={language === 'es' ? 'Amable' : 'Friendly'}
                                    text={result.suggestedResponses.friendly}
                                    color="#3b82f6"
                                    onSelect={() => handleCopyOrInsert(result.suggestedResponses.friendly, 'friendly')}
                                    isCopied={copiedResponse === 'friendly'}
                                    actionLabel={onInsertResponse ? (language === 'es' ? 'Usar' : 'Use') : undefined}
                                />

                                <ResponseOption
                                    title={language === 'es' ? 'Cierre' : 'Closure'}
                                    text={result.suggestedResponses.closure}
                                    color="#a855f7"
                                    onSelect={() => handleCopyOrInsert(result.suggestedResponses.closure, 'closure')}
                                    isCopied={copiedResponse === 'closure'}
                                    actionLabel={onInsertResponse ? (language === 'es' ? 'Usar' : 'Use') : undefined}
                                />

                                <TouchableOpacity
                                    onPress={() => setResult(null)}
                                    className="mt-4 py-4"
                                >
                                    <Text className="text-gray-400 text-center">
                                        {language === 'es' ? 'Analizar otro mensaje' : 'Analyze another message'}
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

function ResponseOption({ title, text, color, onSelect, isCopied, actionLabel }: any) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 active:bg-white/10"
        >
            <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold" style={{ color }}>{title}</Text>
                {isCopied ? <Check size={16} color={color} /> : (actionLabel ? <ArrowRight size={16} color={color} /> : <Copy size={16} color={color} />)}
            </View>
            <Text className="text-gray-300 leading-5">{text}</Text>
        </TouchableOpacity>
    );
}
