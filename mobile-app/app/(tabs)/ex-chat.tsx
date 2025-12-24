import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
import { Send, X, Plus, Brain, MessageSquare, Flame, Zap, ArrowRight, Upload, Image as ImageIcon, Mic, StopCircle, Play } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import ActionSheet from '../../components/ActionSheet';
import { storage } from '../../lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fragmentMessage, calculateInitialDelay, buildEnhancedPrompt } from '../../lib/chatHelpers';
import { loadMasterPrompt } from '../../lib/masterPromptSupabase';
import { loadConversations, setCurrentSimulation } from '../../lib/conversationHelpers';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

type Message = {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    seen?: boolean;
    image?: string;
    audio?: string;
};

export default function ExChatScreen() {
    const { tier } = useSubscription();
    const isPremium = tier === 'warrior' || tier === 'phoenix';
    const router = useRouter();

    // UI State
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    // Simulator State
    const [profileData, setProfileData] = useState<any>(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userName, setUserName] = useState('');

    // Media State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    const [conversations, setConversations] = useState<any[]>([]);

    useEffect(() => {
        loadConvos();
    }, []);

    // Use focus effect to reload profile when simple switching back to this tab
    useFocusEffect(
        React.useCallback(() => {
            checkProfile();
            loadConvos();
        }, [])
    );

    const loadConvos = async () => {
        const convos = await loadConversations();
        setConversations(convos);
    }

    const checkProfile = async () => {
        setLoading(true);
        console.log("Checking profile...");
        try {
            const stored = await storage.getItem('exSimulator_currentProfile');
            if (stored) {
                console.log("Profile found!");
                const data = JSON.parse(stored);

                // Enhance with prompt if available remotely
                if (data.supabaseId) {
                    try {
                        const masterPromptData = await loadMasterPrompt(data.supabaseId);
                        if (masterPromptData) {
                            data.masterPrompt = masterPromptData.masterPrompt;
                            data.tokenCount = masterPromptData.tokenCount;
                        }
                    } catch (err) { }
                }

                setProfileData(data);
                setHasProfile(true);
                setUserName('Usuario');

                // 🔍 DEBUG: Show master prompt info
                console.log('═══════════════════════════════════════════');
                console.log('📋 PERFIL CARGADO');
                console.log('═══════════════════════════════════════════');
                console.log('👤 Ex Name:', data.exName);
                console.log('📊 Message Count:', data.messageCount);
                console.log('🔢 Token Count:', data.tokenCount || 'No generado');
                console.log('📝 Master Prompt:', data.masterPrompt ? 'SÍ ✅' : 'NO ❌');
                if (data.masterPrompt) {
                    console.log('📏 Master Prompt Length:', data.masterPrompt.length, 'chars');
                    console.log('🔍 First 500 chars:', data.masterPrompt.substring(0, 500) + '...');
                }
                console.log('═══════════════════════════════════════════');

                // Load conversation
                const conversationKey = `exSimulator_conversation_${data.id}`;
                const savedConversation = await storage.getItem(conversationKey);
                if (savedConversation) {
                    const parsed = JSON.parse(savedConversation);
                    setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
                } else {
                    setMessages([{
                        id: 'init',
                        role: 'assistant',
                        content: `Hola...`,
                        timestamp: new Date(),
                        seen: false
                    }]);
                }
            } else {
                console.log("No profile found.");
                setHasProfile(false);
            }
        } catch (e) {
            console.error("Error checking profile:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleConversationSelect = async (id: string) => {
        const result = await setCurrentSimulation(id);
        if (result) {
            setSidebarVisible(false);
            checkProfile(); // Reload current screen
        }
    };

    const saveConversation = async (msgs: Message[]) => {
        if (!profileData) return;
        const key = `exSimulator_conversation_${profileData.id}`;
        await storage.setItem(key, JSON.stringify(msgs));
    };

    // --- MEDIA HANDLERS ---
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

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'No se pudo iniciar la grabación');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            // For now, we simulate sending the audio as a message
            // Ideally upload to storage, but for Sim, we just show it
            if (uri) {
                sendAudioMessage(uri);
            }
        } catch (error) {
            console.error('Error stopping recording', error);
        }
    };

    const sendAudioMessage = async (uri: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: '(Audio enviado)',
            audio: uri,
            timestamp: new Date(),
            seen: false
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // Trigger generic AI response for audio
        setTimeout(() => handleAIResponse(updatedMessages, "He escuchado tu audio...", userMessage.id), 1000);
    };

    const handleKeyPress = (e: any) => {
        if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleAIResponse = async (currentHistory: Message[], userPrompt: string, msgId: string, imageBase64?: string | null) => {
        try {
            // Reverting to 2.0 Flash as it is more capable and supports multimodal
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            let systemPrompt: string;

            // Build Prompt
            if (profileData.masterPrompt) {
                const recentContext = currentHistory.slice(-6).map(m =>
                    `${m.role === 'user' ? userName : profileData.exName}: ${m.content} ${m.audio ? '[Audio]' : ''} ${m.image ? '[Imagen]' : ''}`
                ).join('\n');
                systemPrompt = `${profileData.masterPrompt}\n\nCONTEXTO RECIENTE:\n${recentContext}\n\nMENSAJE ACTUAL DEL USUARIO: "${userPrompt}" ${imageBase64 ? '[El usuario adjuntó una imagen]' : ''}\n\nRESPONDE COMO ${profileData.exName}. Si hay imagen, reacciona a ella de forma natural según tu personalidad.`;
            } else {
                systemPrompt = buildEnhancedPrompt(profileData, userName, userPrompt, currentHistory);
            }

            // Simulate "Calculated" delay based on emotional weight
            const initialDelay = calculateInitialDelay(userPrompt, profileData.profile.attachmentStyle, profileData.profile.emotionalTone);
            await new Promise(resolve => setTimeout(resolve, initialDelay));

            // Mark user msg as read
            const msgsWithRead = [...currentHistory];
            const lastMsgIndex = msgsWithRead.findIndex(m => m.id === msgId);
            if (lastMsgIndex !== -1) msgsWithRead[lastMsgIndex].seen = true;

            setMessages(msgsWithRead);
            setIsTyping(true);

            // Fetch Response
            let result;
            if (imageBase64) {
                // Multimodal request
                const promptParts = [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ];
                result = await model.generateContent(promptParts as any);
            } else {
                result = await model.generateContent(systemPrompt);
            }

            const response = await result.response;
            const fullText = response.text();

            // Simulate "Typing" time with fragments
            const fragments = fragmentMessage(fullText, profileData.profile.attachmentStyle);
            let currentMessages = [...msgsWithRead];

            for (let i = 0; i < fragments.length; i++) {
                const fragment = fragments[i];
                if (fragment.delay > 0) await new Promise(resolve => setTimeout(resolve, fragment.delay));

                const aiMessage: Message = {
                    id: (Date.now() + i).toString(),
                    role: 'assistant',
                    content: fragment.text,
                    timestamp: new Date(),
                    seen: false
                };

                currentMessages = [...currentMessages, aiMessage];
                setMessages([...currentMessages]);
                if (i < fragments.length - 1) await new Promise(resolve => setTimeout(resolve, 300));
            }

            await saveConversation(currentMessages);
        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Error de conexión. Intenta de nuevo.',
                timestamp: new Date(),
                seen: false
            };
            setMessages([...currentHistory, errorMessage]);
        } finally {
            setIsTyping(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const sendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || isTyping || !profileData) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
            timestamp: new Date(),
            seen: false
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        const textToSend = inputText;
        const imageBuffer = selectedImage; // Keep ref

        setInputText('');
        setSelectedImage(null);

        // Immediate scroll
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        handleAIResponse(updatedMessages, textToSend, userMessage.id, imageBuffer);
    };

    // --- RENDER ---

    if (loading) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (!hasProfile) {
        return (
            <View className="flex-1 bg-black">
                <StatusBar style="light" backgroundColor="#000000" />

                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-24 h-24 bg-[#1c1c1e] rounded-full items-center justify-center mb-8 border border-white/10 shadow-lg shadow-white/5">
                        <Brain size={48} color="white" />
                    </View>

                    <Text className="text-white text-4xl font-black text-center mb-4 tracking-tighter">
                        Simulador de Ex
                    </Text>

                    <Text className="text-gray-400 text-center text-base mb-12 font-medium leading-relaxed max-w-xs">
                        Entrena situaciones difíciles hablando con una réplica exacta de tu ex impulsada por IA.
                    </Text>

                    {/* Steps */}
                    <View className="w-full space-y-6 mb-12">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-[#1c1c1e] items-center justify-center mr-4 border border-white/5">
                                <Upload size={18} color="#a855f7" />
                            </View>
                            <View>
                                <Text className="text-white font-bold">1. Sube tu Historial</Text>
                                <Text className="text-gray-600 text-xs">Exporta tu chat de WhatsApp o Telegram.</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-[#1c1c1e] items-center justify-center mr-4 border border-white/5">
                                <Zap size={18} color="#10b981" />
                            </View>
                            <View>
                                <Text className="text-white font-bold">2. Análisis Profundo</Text>
                                <Text className="text-gray-600 text-xs">Detectamos patrones, apego y tono emocional.</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-[#1c1c1e] items-center justify-center mr-4 border border-white/5">
                                <MessageSquare size={18} color="#f59e0b" />
                            </View>
                            <View>
                                <Text className="text-white font-bold">3. Practica sin Riesgos</Text>
                                <Text className="text-gray-600 text-xs">Simula respuestas antes de escribirle de verdad.</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/tools/ex-simulator/import' as any)}
                        className="w-full bg-white py-4 rounded-full flex-row items-center justify-center"
                    >
                        <Text className="text-black font-black uppercase tracking-widest mr-2">Configurar Simulador</Text>
                        <ArrowRight size={18} color="black" strokeWidth={3} />
                    </TouchableOpacity>

                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-black flex-row">
            <StatusBar style="light" backgroundColor="#000000" />

            <Sidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                isPremium={isPremium}
                conversations={conversations}
                activeConversationId={profileData?.id}
                onSelectConversation={handleConversationSelect}
                onRenameConversation={() => { }}
                onDeleteConversation={() => { }}
                onNewChat={() => router.push('/(tabs)')}
                userId={""}
            />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/5 bg-black">
                    <TouchableOpacity onPress={() => setSidebarVisible(true)} className="p-2">
                        <View className="w-5 h-0.5 bg-white mb-1.5" />
                        <View className="w-5 h-0.5 bg-white mb-1.5" />
                        <View className="w-3 h-0.5 bg-white" />
                    </TouchableOpacity>

                    <View className="items-center">
                        <Text className="text-white font-black tracking-tight text-lg">{profileData?.exName || 'Simulador'}</Text>
                        <Text className="text-emerald-500 text-[9px] font-bold uppercase tracking-[0.2em] relative -top-0.5">
                            {profileData?.profile?.attachmentStyle || 'EN LÍNEA'}
                        </Text>
                    </View>

                    {/* Removido botón M - no necesario */}
                    <View className="w-8" />
                </View>

                {/* Chat Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item, index) => item.id ? item.id.toString() : `msg-${index}-${Date.now()}`}
                        renderItem={({ item }) => (
                            <View className={`px-4 mb-4 flex-row ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {item.role === 'assistant' && (
                                    <View className="w-6 h-6 rounded-full bg-[#1c1c1e] items-center justify-center mr-2 self-end mb-1 border border-white/5">
                                        <Text className="text-[10px] text-white font-bold">{profileData?.exName?.[0]}</Text>
                                    </View>
                                )}
                                <View className={`rounded-[20px] px-5 py-3 max-w-[80%] ${item.role === 'user'
                                    ? 'bg-white'
                                    : 'bg-[#1c1c1e] border border-white/5'
                                    }`}>
                                    {/* Image Display */}
                                    {item.image && (
                                        <Image
                                            source={{ uri: item.image }}
                                            className="w-48 h-48 rounded-lg mb-2 bg-gray-300"
                                            resizeMode="cover"
                                        />
                                    )}

                                    {/* Audio Display */}
                                    {item.audio && (
                                        <View className="flex-row items-center mb-1">
                                            <TouchableOpacity className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2">
                                                <Play size={12} color="#000" />
                                            </TouchableOpacity>
                                            <View className="h-1 bg-gray-200 w-24 rounded-full" />
                                        </View>
                                    )}

                                    <Text className={`text-base ${item.role === 'user' ? 'text-black font-medium' : 'text-gray-200'}`}>
                                        {item.content}
                                    </Text>
                                    <Text className={`text-[9px] mt-1 opacity-60 text-right ${item.role === 'user' ? 'text-black' : 'text-white'}`}>
                                        {item.timestamp ? item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                        {item.role === 'user' && item.seen && ' • Leído'}
                                    </Text>
                                </View>
                            </View>
                        )}
                        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    />

                    {/* Typing Indicator */}
                    {isTyping && (
                        <View className="px-5 mb-4 ml-8 flex-row items-center">
                            <View className="bg-[#1c1c1e] rounded-full px-4 py-2 border border-white/5">
                                <Text className="text-gray-500 text-xs font-bold tracking-widest animate-pulse">...</Text>
                            </View>
                        </View>
                    )}

                    {/* Input Area */}
                    <View className="px-5 pb-6 pt-3 bg-black border-t border-white/5">

                        {/* Image Preview */}
                        {selectedImage && (
                            <View className="mb-2 relative w-20">
                                <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} className="w-20 h-20 rounded-lg border border-white/20" />
                                <TouchableOpacity
                                    onPress={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                                >
                                    <X size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="flex-row items-center bg-[#1c1c1e] border border-white/10 rounded-full px-2 py-2 min-h-[56px]">

                            {/* Media Buttons */}
                            <TouchableOpacity onPress={pickImage} className="w-10 h-10 items-center justify-center rounded-full ml-1 active:bg-white/10">
                                <ImageIcon size={20} color="#9ca3af" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={isRecording ? stopRecording : startRecording}
                                className={`w-10 h-10 items-center justify-center rounded-full ml-1 mr-2 ${isRecording ? 'bg-red-500/20' : 'active:bg-white/10'}`}
                            >
                                {isRecording ? (
                                    <StopCircle size={20} color="#ef4444" className="animate-pulse" />
                                ) : (
                                    <Mic size={20} color="#9ca3af" />
                                )}
                            </TouchableOpacity>

                            <TextInput
                                className="flex-1 px-2 text-white text-base max-h-32"
                                placeholder={isRecording ? "Grabando..." : "Escribe un mensaje..."}
                                placeholderTextColor="#666"
                                value={inputText}
                                onChangeText={setInputText}
                                onKeyPress={handleKeyPress}
                                multiline
                                style={{ outlineStyle: 'none' } as any}
                            />

                            {(inputText.trim() || selectedImage) && (
                                <TouchableOpacity
                                    onPress={sendMessage}
                                    disabled={isTyping}
                                    className="w-10 h-10 items-center justify-center rounded-full bg-white ml-2"
                                >
                                    <Send size={18} color="black" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                onSelect={(tool) => {
                    if (tool === 'import') router.push('/tools/ex-simulator/import' as any);
                    // Add other redirects
                    setActionSheetVisible(false);
                }}
            />
        </View>
    );
}
