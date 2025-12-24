import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Send, X, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '../../../../lib/supabase';
import { simulateResponse, ExProfile, ParsedMessage } from '../../../../lib/exSimulator';

interface SimulationMessage {
    id: string;
    role: 'user' | 'ex';
    content: string;
    timestamp: string;
    confidence?: number;
}

export default function SimulateConversation() {
    const { profileId } = useLocalSearchParams();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [profile, setProfile] = useState<any>(null);
    const [messages, setMessages] = useState<SimulationMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [sessionStartTime] = useState(Date.now());
    const [messageCount, setMessageCount] = useState(0);
    const [maxMessages, setMaxMessages] = useState(30);

    useEffect(() => {
        loadProfile();
        checkLimits();
    }, []);

    const checkLimits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', user.id)
                .single();

            const tier = profileData?.subscription_tier || 'free';
            setMaxMessages(tier === 'premium' ? 50 : 30);
        } catch (error) {
            console.error('Error checking limits:', error);
        }
    };

    const loadProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('ex_profiles')
                .select('*')
                .eq('id', profileId)
                .single();

            if (error) throw error;

            setProfile(data);

            // Add initial message from "ex"
            const initialMessage: SimulationMessage = {
                id: '1',
                role: 'ex',
                content: getInitialMessage(data.profile_data),
                timestamp: new Date().toISOString(),
                confidence: 1.0
            };

            setMessages([initialMessage]);

            // Check for proactive message (Simulating "Life")
            if (data.last_used_at) {
                const lastUsed = new Date(data.last_used_at);
                const now = new Date();
                const hoursSinceLastUse = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);

                // If more than 2 hours passed, simulate a "missed message"
                if (hoursSinceLastUse > 2) {
                    generateProactiveMessage(data);
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Alert.alert('Error', 'No se pudo cargar el perfil');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const generateProactiveMessage = async (profileData: any) => {
        console.log('[Simulator] Generating proactive message...');
        try {
            // Create a temporary history for context
            const tempHistory: ParsedMessage[] = [{
                timestamp: new Date().toISOString(),
                sender: 'user',
                content: '(El usuario no ha escrito en un tiempo. Inicia tú la conversación o comenta algo sobre tu día.)'
            }];

            const { response, confidence } = await simulateResponse(
                '', // No new user input
                null,
                profileData.profile_data,
                tempHistory
            );

            const proactiveMsg: SimulationMessage = {
                id: 'proactive_' + Date.now(),
                role: 'ex',
                content: response,
                timestamp: new Date().toISOString(),
                confidence
            };

            setMessages(prev => [...prev, proactiveMsg]);
        } catch (error) {
            console.error('[Simulator] Error generating proactive message:', error);
        }
    };

    const getInitialMessage = (profileData: ExProfile): string => {
        const greetings = [
            'Hola',
            'Hey',
            'Qué tal',
            'Hola, cómo estás?'
        ];

        // Use a common phrase if available
        if (profileData.commonPhrases && profileData.commonPhrases.length > 0) {
            return profileData.commonPhrases[0];
        }

        return greetings[Math.floor(Math.random() * greetings.length)];
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].base64 || null);
        }
    };

    const sendMessage = async () => {
        console.log('[Simulator] sendMessage called, inputText:', inputText, 'isAITyping:', isAITyping);
        if ((!inputText.trim() && !selectedImage) || isAITyping) {
            console.log('[Simulator] Blocked: empty input or AI typing');
            return;
        }

        if (messageCount >= maxMessages) {
            console.log('[Simulator] Message limit reached:', messageCount, '/', maxMessages);
            Alert.alert(
                'Límite Alcanzado',
                `Has alcanzado el límite de ${maxMessages} mensajes para esta simulación. Finaliza la conversación para ver tu feedback.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Finalizar', onPress: handleFinishSimulation }
                ]
            );
            return;
        }

        const userMessage: SimulationMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            timestamp: new Date().toISOString()
        };

        console.log('[Simulator] Adding user message:', userMessage.content.substring(0, 50));
        setMessages(prev => [...prev, userMessage]);
        const textToSend = inputText;
        setInputText('');
        const imageToSend = selectedImage;
        setSelectedImage(null);
        setMessageCount(prev => prev + 1);

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Generate AI response
        setIsAITyping(true);
        console.log('[Simulator] Generating AI response...');

        try {
            const conversationHistory: ParsedMessage[] = messages.map(m => ({
                timestamp: m.timestamp,
                sender: m.role === 'user' ? 'user' : 'ex',
                content: m.content
            }));

            console.log('[Simulator] Calling simulateResponse with', conversationHistory.length, 'history messages');
            const { response, confidence } = await simulateResponse(
                textToSend,
                imageToSend,
                profile.profile_data,
                conversationHistory
            );

            console.log('[Simulator] Got response:', response.substring(0, 50), 'confidence:', confidence);

            const aiMessage: SimulationMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ex',
                content: response,
                timestamp: new Date().toISOString(),
                confidence
            };

            setMessages(prev => [...prev, aiMessage]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error: any) {
            console.error('[Simulator] Error generating response:', error);
            console.error('[Simulator] Error details:', error.message, error.stack);
            Alert.alert('Error', `No se pudo generar la respuesta.\n\nError: ${error.message}\n\nIntenta de nuevo.`);
        } finally {
            setIsAITyping(false);
            console.log('[Simulator] sendMessage finished');
        }
    };

    const handleFinishSimulation = () => {
        Alert.alert(
            'Finalizar Simulación',
            '¿Quieres finalizar esta simulación y ver tu análisis?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Finalizar',
                    onPress: async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);

                            const { data: session, error } = await supabase
                                .from('simulation_sessions')
                                .insert({
                                    user_id: user.id,
                                    ex_profile_id: profileId,
                                    scenario: 'free_talk',
                                    messages: messages.map(m => ({
                                        role: m.role,
                                        content: m.content,
                                        timestamp: m.timestamp,
                                        confidence: m.confidence
                                    })),
                                    duration_seconds: durationSeconds
                                })
                                .select()
                                .single();

                            if (error) throw error;

                            router.replace(`/tools/ex-simulator/feedback/${session.id}` as any);
                        } catch (error) {
                            console.error('Error saving session:', error);
                            Alert.alert('Error', 'No se pudo guardar la sesión');
                        }
                    }
                }
            ]
        );
    };

    const renderMessage = ({ item }: { item: SimulationMessage }) => {
        const isUser = item.role === 'user';

        return (
            <View className={`px-5 py-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-purple-600'
                    : 'bg-white/10 border border-white/10'
                    }`}>
                    {!isUser && (
                        <Text className="text-gray-400 text-xs mb-1">
                            {profile?.ex_name}
                        </Text>
                    )}
                    <Text className={`${isUser ? 'text-white' : 'text-gray-200'} leading-6`}>
                        {item.content}
                    </Text>
                    {!isUser && item.confidence && item.confidence < 0.8 && (
                        <View className="flex-row items-center mt-2">
                            <AlertCircle size={12} color="#f59e0b" />
                            <Text className="text-yellow-500 text-xs ml-1">
                                Confianza: {Math.round(item.confidence * 100)}%
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
                <ActivityIndicator size="large" color="#a855f7" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#0a0a0a]">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="flex-1"
            >
                {/* Header */}
                <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold">
                            🎭 Simulación: {profile?.ex_name}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                            {messageCount}/{maxMessages} mensajes
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleFinishSimulation}
                        className="bg-red-500/20 px-4 py-2 rounded-full"
                    >
                        <Text className="text-red-400 font-semibold">Finalizar</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    className="flex-1"
                >
                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={{ paddingVertical: 15, paddingBottom: 25 }}
                        showsVerticalScrollIndicator={false}
                    />

                    {/* Typing Indicator */}
                    {isAITyping && (
                        <View className="px-5 py-3">
                            <View className="bg-white/5 rounded-2xl px-4 py-3 self-start max-w-[80%]">
                                <Text className="text-gray-400 text-sm mb-1">
                                    {profile?.ex_name} está escribiendo...
                                </Text>
                                <View className="flex-row gap-1">
                                    <View className="w-2 h-2 bg-purple-500 rounded-full opacity-100" />
                                    <View className="w-2 h-2 bg-purple-400 rounded-full opacity-75" />
                                    <View className="w-2 h-2 bg-purple-300 rounded-full opacity-50" />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Input Area */}
                    <View className="px-5 pb-6 pt-3 bg-[#0a0a0a]">
                        {selectedImage && (
                            <View className="flex-row items-center mb-3 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl self-start">
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                                    className="w-14 h-14 rounded-xl"
                                />
                                <TouchableOpacity
                                    onPress={() => setSelectedImage(null)}
                                    className="ml-2 bg-red-500/20 rounded-full p-1.5"
                                >
                                    <X size={14} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="flex-row items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] px-3 py-2.5 min-h-[60px]">
                            <TouchableOpacity
                                onPress={pickImage}
                                className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-1"
                            >
                                <ImageIcon size={18} color="#a855f7" />
                            </TouchableOpacity>

                            <TextInput
                                className="flex-1 px-4 text-white text-[15px] max-h-32"
                                placeholder="Escribe tu mensaje..."
                                placeholderTextColor="#6b7280"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                style={{ outlineStyle: 'none' } as any}
                            />

                            {(inputText.trim() || selectedImage) && (
                                <TouchableOpacity
                                    onPress={sendMessage}
                                    disabled={isAITyping}
                                    className="w-9 h-9 items-center justify-center rounded-full mr-1"
                                >
                                    <LinearGradient
                                        colors={['#3b82f6', '#a855f7']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="w-full h-full rounded-full items-center justify-center"
                                    >
                                        <Send size={16} color="white" fill="white" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text className="text-center text-gray-500 text-[10px] mt-3">
                            Esta es una simulación. No es la persona real.
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}
