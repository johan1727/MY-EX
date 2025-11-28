import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { Instagram, Video, Image as ImageIcon, Link, AlertTriangle, TrendingUp, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { analyzeSocialMedia } from '../lib/socialMediaAnalyzer';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

interface SocialMediaAnalyzerModalProps {
    visible: boolean;
    onClose: () => void;
}

interface AnalysisResult {
    contentType: string;
    emotionalState: string;
    movingOnSignals: string[];
    stillThinkingAboutYou: string[];
    recommendations: string[];
    overallAssessment: string;
}

export default function SocialMediaAnalyzerModal({ visible, onClose }: SocialMediaAnalyzerModalProps) {
    const { language } = useLanguage();
    const [inputType, setInputType] = useState<'link' | 'screenshot'>('link');
    const [link, setLink] = useState('');
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setScreenshot(result.assets[0].uri);
        }
    };

    const handleAnalyze = async () => {
        if (inputType === 'link' && !link.trim()) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Por favor pega un link' : 'Please paste a link'
            );
            return;
        }

        if (inputType === 'screenshot' && !screenshot) {
            Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                language === 'es' ? 'Por favor sube un screenshot' : 'Please upload a screenshot'
            );
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const analysis = await analyzeSocialMedia(
                inputType === 'link' ? link : screenshot!,
                inputType
            );
            setResult(analysis);

        } catch (error) {
            console.error('Error analyzing social media:', error);
            Alert.alert('Error', 'Failed to analyze content');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLink('');
        setScreenshot(null);
        setResult(null);
        setInputType('link');
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
                    <View className="px-6 py-5 border-b border-white/10">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-white text-xl font-bold">
                                    {language === 'es' ? 'Analizador de Redes Sociales' : 'Social Media Analyzer'}
                                </Text>
                                <Text className="text-gray-400 text-sm mt-1">
                                    {language === 'es' ? '¿Qué dice su actividad?' : 'What does their activity say?'}
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
                                        ? 'Analiza reels, posts o historias que tu ex compartió o le dio like. Descubre qué revelan sobre su estado emocional.'
                                        : 'Analyze reels, posts or stories your ex shared or liked. Discover what they reveal about their emotional state.'}
                                </Text>

                                {/* Input Type Selector */}
                                <View className="flex-row gap-3 mb-6">
                                    <TouchableOpacity
                                        onPress={() => setInputType('link')}
                                        className={`flex-1 rounded-xl p-4 flex-row items-center justify-center ${inputType === 'link' ? 'bg-purple-600' : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <Link size={20} color="white" />
                                        <Text className="text-white font-semibold ml-2">Link</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setInputType('screenshot')}
                                        className={`flex-1 rounded-xl p-4 flex-row items-center justify-center ${inputType === 'screenshot' ? 'bg-purple-600' : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <ImageIcon size={20} color="white" />
                                        <Text className="text-white font-semibold ml-2">Screenshot</Text>
                                    </TouchableOpacity>
                                </View>

                                {inputType === 'link' ? (
                                    <View>
                                        <Text className="text-gray-400 text-sm mb-2">
                                            {language === 'es' ? 'Link del post/reel' : 'Post/reel link'}
                                        </Text>
                                        <TextInput
                                            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-base"
                                            placeholder="https://instagram.com/..."
                                            placeholderTextColor="#6b7280"
                                            value={link}
                                            onChangeText={setLink}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                ) : (
                                    <View>
                                        {screenshot ? (
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: screenshot }}
                                                    className="w-full h-64 rounded-2xl"
                                                    resizeMode="cover"
                                                />
                                                <TouchableOpacity
                                                    onPress={() => setScreenshot(null)}
                                                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                                                >
                                                    <Text className="text-white text-xs">✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={pickImage}
                                                className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-8 items-center"
                                            >
                                                <ImageIcon size={48} color="#6b7280" />
                                                <Text className="text-gray-400 mt-4">
                                                    {language === 'es' ? 'Toca para subir screenshot' : 'Tap to upload screenshot'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={handleAnalyze}
                                    disabled={loading || (inputType === 'link' ? !link.trim() : !screenshot)}
                                    className={`mt-6 rounded-2xl p-4 flex-row justify-center items-center ${loading || (inputType === 'link' ? !link.trim() : !screenshot) ? 'bg-gray-700' : 'bg-gradient-to-r from-pink-600 to-purple-600'
                                        }`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Instagram size={20} color="white" />
                                            <Text className="text-white font-bold text-lg ml-2">
                                                {language === 'es' ? 'Analizar Contenido' : 'Analyze Content'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View className="pb-10">
                                {/* Content Type */}
                                <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-2">
                                        <Video size={20} color="#3b82f6" />
                                        <Text className="text-blue-400 font-bold ml-2">
                                            {language === 'es' ? 'Tipo de Contenido' : 'Content Type'}
                                        </Text>
                                    </View>
                                    <Text className="text-white text-lg">{result.contentType}</Text>
                                </View>

                                {/* Emotional State */}
                                <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 mb-4">
                                    <View className="flex-row items-center mb-2">
                                        <Heart size={20} color="#a855f7" />
                                        <Text className="text-purple-400 font-bold ml-2">
                                            {language === 'es' ? 'Estado Emocional' : 'Emotional State'}
                                        </Text>
                                    </View>
                                    <Text className="text-white leading-6">{result.emotionalState}</Text>
                                </View>

                                {/* Moving On Signals */}
                                {result.movingOnSignals?.length > 0 && (
                                    <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-4">
                                        <Text className="text-green-400 font-bold mb-3">
                                            {language === 'es' ? '✓ Señales de Superación' : '✓ Moving On Signals'}
                                        </Text>
                                        {result.movingOnSignals.map((signal, i) => (
                                            <Text key={i} className="text-green-200 mb-2">• {signal}</Text>
                                        ))}
                                    </View>
                                )}

                                {/* Still Thinking About You */}
                                {result.stillThinkingAboutYou?.length > 0 && (
                                    <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-4">
                                        <Text className="text-yellow-400 font-bold mb-3">
                                            {language === 'es' ? '💭 Aún Piensa en Ti' : '💭 Still Thinking About You'}
                                        </Text>
                                        {result.stillThinkingAboutYou.map((signal, i) => (
                                            <Text key={i} className="text-yellow-200 mb-2">• {signal}</Text>
                                        ))}
                                    </View>
                                )}

                                {/* Overall Assessment */}
                                <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                                    <Text className="text-white font-bold mb-2">
                                        {language === 'es' ? 'Evaluación General' : 'Overall Assessment'}
                                    </Text>
                                    <Text className="text-gray-300 leading-6">{result.overallAssessment}</Text>
                                </View>

                                {/* Recommendations */}
                                <View className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 mb-4">
                                    <Text className="text-purple-400 font-bold mb-3">
                                        {language === 'es' ? 'Recomendaciones' : 'Recommendations'}
                                    </Text>
                                    {result.recommendations.map((rec, i) => (
                                        <Text key={i} className="text-purple-200 mb-2">→ {rec}</Text>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    onPress={() => setResult(null)}
                                    className="mt-4 py-4"
                                >
                                    <Text className="text-gray-400 text-center">
                                        {language === 'es' ? 'Analizar otro contenido' : 'Analyze another content'}
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
