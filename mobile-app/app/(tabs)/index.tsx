import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Send, X, Sparkles, Plus, MessageSquare, Wrench, Heart, BookOpen, Mic } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { sendMessageToChatGPT, extractKeyFacts, checkForCrisisKeywords } from '../../lib/openai';
import { canUseFeature, incrementFeatureUsage } from '../../lib/subscriptions';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MessageItem from '../../components/MessageItem';
import Sidebar from '../../components/Sidebar';
import QuickActionCard from '../../components/QuickActionCard';
import DecoderModal from '../../components/DecoderModal';
import ConversationAnalyzerModal from '../../components/ConversationAnalyzerModal';
import SocialMediaAnalyzerModal from '../../components/SocialMediaAnalyzerModal';
import StalkerDetectorModal from '../../components/StalkerDetectorModal';
import ConversationHistory from '../../components/ConversationHistory';
import { useLanguage } from '../../lib/i18n';
import { registerForPushNotifications, scheduleDailyNotification } from '../../lib/notificationService';
import { conversationManager } from '../../lib/conversationManager';
import { useContextualSuggestions, ToolSuggestion } from '../../lib/contextualSuggestions';
import SuggestionBanner from '../../components/SuggestionBanner';

type Message = {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    created_at: string;
    image?: string;
};

export default function ChatScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [darkMode, setDarkMode] = useState(true);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [decoderVisible, setDecoderVisible] = useState(false);
    const [conversationAnalyzerVisible, setConversationAnalyzerVisible] = useState(false);
    const [socialMediaAnalyzerVisible, setSocialMediaAnalyzerVisible] = useState(false);
    const [stalkerDetectorVisible, setStalkerDetectorVisible] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<ToolSuggestion | null>(null);
    const [recentToolUsage, setRecentToolUsage] = useState<string[]>([]);
    const flatListRef = useRef<FlatList>(null);
    const { t } = useLanguage();
    const { analyze, shouldAnalyze } = useContextualSuggestions();

    useEffect(() => {
        initializeChat();
    }, []);

    const initializeChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            await loadMessages(user);
        } catch (error) {
            console.error('Error initializing chat:', error);
        }
    };

    const loadMessages = async (user: any) => {
        try {
            if (!user) {
                setMessages([]);
                return;
            }

            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;

            if (data && data.length > 0) {
                setMessages(data as any);
            } else {
                setMessages([{
                    id: 'welcome',
                    content: 'Hola. Soy tu Ex Coach, potenciado por IA. Estoy aquí para ayudarte a sanar, crecer y seguir adelante. ¿Qué tienes en mente hoy?',
                    sender: 'ai',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleNewChat = () => {
        Alert.alert(
            'Nueva Conversación',
            '¿Quieres iniciar una nueva conversación? Esto no borrará tu historial.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Iniciar',
                    onPress: () => {
                        setMessages([]);
                        setInputText('');
                    }
                }
            ]
        );
    };

    const handleQuickAction = (prompt: string) => {
        setInputText(prompt);
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
        if ((!inputText.trim() && !selectedImage) || loading) return;

        if (currentUser) {
            const access = await canUseFeature(currentUser.id, 'message');

            if (!access.allowed) {
                Alert.alert(
                    'Límite Diario Alcanzado',
                    access.reason || `Has usado ${access.current}/${access.limit} mensajes hoy. Actualiza a Warrior para mensajes ilimitados.`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Actualizar',
                            onPress: () => router.push('/paywall')
                        }
                    ]
                );
                return;
            }
        }

        const crisisCheck = checkForCrisisKeywords(inputText);
        if (crisisCheck.isCrisis) {
            Alert.alert(
                '🆘 Nos preocupas',
                crisisCheck.resources || 'Por favor busca ayuda profesional.',
                [{ text: 'Entiendo', style: 'default' }]
            );
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            content: inputText,
            sender: 'user',
            created_at: new Date().toISOString(),
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        const imageToSend = selectedImage;
        setSelectedImage(null);
        setLoading(true);

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            if (currentUser) {
                await supabase.from('chat_messages').insert({
                    user_id: currentUser.id,
                    content: userMsg.content,
                    sender: userMsg.sender,
                    image: userMsg.image,
                });

                await incrementFeatureUsage(currentUser.id, 'message');
            }

            const response = await sendMessageToChatGPT(
                userMsg.content,
                imageToSend,
                currentUser?.id
            );

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                content: response.text,
                sender: 'ai',
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, aiMsg]);

            if (currentUser) {
                await supabase.from('chat_messages').insert({
                    user_id: currentUser.id,
                    content: aiMsg.content,
                    sender: aiMsg.sender,
                });

                try {
                    const facts = await extractKeyFacts(userMsg.content, currentUser.id);
                    if (facts && facts.length > 0) {
                        for (const fact of facts) {
                            await supabase.from('user_memory').insert({
                                user_id: currentUser.id,
                                key_fact: fact.fact,
                                category: fact.category,
                                importance_score: fact.importance,
                                last_referenced_at: new Date().toISOString(),
                            });
                        }
                    }
                } catch (memoryError) {
                    console.error('Error saving to memory:', memoryError);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert("Error", "No se pudo enviar el mensaje. Intenta de nuevo.");
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const handleKeyPress = (e: any) => {
        if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

    const quickActions = [
        {
            icon: MessageSquare,
            title: 'Hablar sobre mi ruptura',
            subtitle: 'Necesito desahogarme y procesar mis emociones',
            color: '#3b82f6',
            prompt: 'Necesito hablar sobre mi ruptura. Me siento...'
        },
        {
            icon: Wrench,
            title: 'Analizar un mensaje',
            subtitle: '¿Qué significa realmente lo que me escribió?',
            color: '#8b5cf6',
            prompt: 'Quiero analizar un mensaje que recibí de mi ex...'
        },
        {
            icon: Heart,
            title: 'Ayuda con no contacto',
            subtitle: 'Tengo ganas de escribirle, necesito apoyo',
            color: '#ef4444',
            prompt: 'Tengo muchas ganas de contactar a mi ex. ¿Qué hago?'
        },
        {
            icon: BookOpen,
            title: 'Consejos de sanación',
            subtitle: '¿Cómo puedo sentirme mejor hoy?',
            color: '#22c55e',
            prompt: '¿Qué puedo hacer hoy para sentirme mejor y avanzar en mi sanación?'
        },
        {
            icon: Sparkles,
            title: 'Motivación Diaria',
            subtitle: 'Necesito palabras de aliento',
            color: '#f59e0b',
            prompt: 'Dame una frase motivadora para seguir adelante hoy.'
        },
        {
            icon: MessageSquare,
            title: 'Simular Conversación',
            subtitle: 'Practicar qué decirle si me llama',
            color: '#ec4899',
            prompt: 'Quiero simular una conversación con mi ex para estar preparado.'
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPromptIndex((prev) => (prev + 1) % Math.ceil(quickActions.length / 4));
        }, 10000); // Rotate every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const displayedActions = quickActions.slice(currentPromptIndex * 4, (currentPromptIndex * 4) + 4);
    // If we run out of items, wrap around or show what's left plus start
    const visibleActions = displayedActions.length === 4 ? displayedActions : [...displayedActions, ...quickActions.slice(0, 4 - displayedActions.length)];

    return (
        <View className="flex-1 flex-row bg-black">
            <StatusBar style="light" backgroundColor="#000000" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            {/* Sidebar */}
            <Sidebar
                onNewChat={handleNewChat}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                isPremium={false}
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
            />

            {/* Main Chat Area */}
            <View className="flex-1">
                <SafeAreaView className="flex-1">
                    {/* Header with Hamburger Menu */}
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            {/* Hamburger button - visible only on mobile */}
                            <TouchableOpacity
                                onPress={() => setSidebarVisible(true)}
                                className="mr-4 md:hidden"
                            >
                                <View className="w-6 h-6 justify-center">
                                    <View className="w-full h-0.5 bg-white mb-1.5" />
                                    <View className="w-full h-0.5 bg-white mb-1.5" />
                                    <View className="w-full h-0.5 bg-white" />
                                </View>
                            </TouchableOpacity>
                            <View className="flex-1 items-center">
                                <Text className="text-white text-2xl font-bold">
                                    {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Usuario'}
                                </Text>
                                <Text className="text-gray-400 text-sm">¿Cómo puedo ayudarte hoy?</Text>
                            </View>
                        </View>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                        className="flex-1"
                    >
                        {messages.length === 0 ? (
                            <View className="flex-1 items-center justify-center px-8">
                                <Sparkles size={64} color="#a855f7" />
                                <Text className="text-white text-2xl font-bold mt-6 text-center">
                                    Inicia una conversación
                                </Text>
                                <Text className="text-gray-400 text-center mt-3 leading-6 mb-8">
                                    Estoy aquí para escucharte, apoyarte y guiarte en tu proceso de sanación.
                                </Text>

                                {/* Quick Action Cards */}
                                <View className="w-full max-w-2xl">
                                    <View className="flex-row flex-wrap gap-4">
                                        {visibleActions.map((action, index) => (
                                            <View key={index} className="w-[48%]">
                                                <QuickActionCard
                                                    icon={action.icon}
                                                    title={action.title}
                                                    subtitle={action.subtitle}
                                                    color={action.color}
                                                    onPress={() => handleQuickAction(action.prompt)}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => <MessageItem item={item} />}
                                contentContainerStyle={{ paddingVertical: 15, paddingBottom: 25 }}
                                showsVerticalScrollIndicator={false}
                            />
                        )}

                        {/* Input Area */}
                        <View className="px-5 pb-6 pt-3">
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
                                    <Plus size={18} color="#a855f7" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setDecoderVisible(true)}
                                    className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                                    title="Decodificador"
                                >
                                    <Wrench size={18} color="#a855f7" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setConversationAnalyzerVisible(true)}
                                    className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                                    title="Analizar Conversación"
                                >
                                    <MessageSquare size={18} color="#3b82f6" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setSocialMediaAnalyzerVisible(true)}
                                    className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                                    title="Analizar Redes Sociales"
                                >
                                    <Heart size={18} color="#ec4899" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => Alert.alert('Próximamente', 'La función de voz estará disponible pronto.')}
                                    className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                                >
                                    <Mic size={18} color="#a855f7" />
                                </TouchableOpacity>

                                <TextInput
                                    className="flex-1 px-4 text-white text-[15px] max-h-32"
                                    placeholder="Escribe tu mensaje..."
                                    placeholderTextColor="#6b7280"
                                    value={inputText}
                                    onChangeText={setInputText}
                                    multiline
                                    onKeyPress={handleKeyPress}
                                    style={{ outlineStyle: 'none' } as any}
                                />


                                {inputText.trim() || selectedImage ? (
                                    <TouchableOpacity
                                        onPress={sendMessage}
                                        disabled={loading}
                                        className="w-9 h-9 items-center justify-center rounded-full mr-1"
                                    >
                                        <LinearGradient
                                            colors={['#3b82f6', '#a855f7']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            className="w-full h-full rounded-full items-center justify-center"
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Send size={16} color="white" fill="white" />
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        className="w-9 h-9 items-center justify-center rounded-full bg-white/10 mr-1"
                                    >
                                        <Mic size={18} color="#9ca3af" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>

            {/* Modals */}
            <Sidebar
                onNewChat={handleNewChat}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                isPremium={false}
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
            />

            <DecoderModal
                visible={decoderVisible}
                onClose={() => setDecoderVisible(false)}
            />

            <ConversationAnalyzerModal
                visible={conversationAnalyzerVisible}
                onClose={() => setConversationAnalyzerVisible(false)}
            />

            <SocialMediaAnalyzerModal
                visible={socialMediaAnalyzerVisible}
                onClose={() => setSocialMediaAnalyzerVisible(false)}
            />

            <StalkerDetectorModal
                visible={stalkerDetectorVisible}
                onClose={() => setStalkerDetectorVisible(false)}
                onAnalyzeInChat={(analysis) => {
                    setInputText(analysis);
                    setStalkerDetectorVisible(false);
                }}
            />

            <ConversationHistory
                className="mr-4 md:hidden"
            >
                <View className="w-6 h-6 justify-center">
                    <View className="w-full h-0.5 bg-white mb-1.5" />
                    <View className="w-full h-0.5 bg-white mb-1.5" />
                    <View className="w-full h-0.5 bg-white" />
                </View>
            </TouchableOpacity>
            <View className="flex-1 items-center">
                <Text className="text-white text-2xl font-bold">
                    {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Usuario'}
                </Text>
                <Text className="text-gray-400 text-sm">¿Cómo puedo ayudarte hoy?</Text>
            </View>
        </View>
                    </View >

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            className="flex-1"
        >
            {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                    <Sparkles size={64} color="#a855f7" />
                    <Text className="text-white text-2xl font-bold mt-6 text-center">
                        Inicia una conversación
                    </Text>
                    <Text className="text-gray-400 text-center mt-3 leading-6 mb-8">
                        Estoy aquí para escucharte, apoyarte y guiarte en tu proceso de sanación.
                    </Text>

                    {/* Quick Action Cards */}
                    <View className="w-full max-w-2xl">
                        <View className="flex-row flex-wrap gap-4">
                            {visibleActions.map((action, index) => (
                                <View key={index} className="w-[48%]">
                                    <QuickActionCard
                                        icon={action.icon}
                                        title={action.title}
                                        subtitle={action.subtitle}
                                        color={action.color}
                                        onPress={() => handleQuickAction(action.prompt)}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <MessageItem item={item} />}
                    contentContainerStyle={{ paddingVertical: 15, paddingBottom: 25 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Input Area */}
            <View className="px-5 pb-6 pt-3">
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
                        <Plus size={18} color="#a855f7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setDecoderVisible(true)}
                        className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                        title="Decodificador"
                    >
                        <Wrench size={18} color="#a855f7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setConversationAnalyzerVisible(true)}
                        className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                        title="Analizar Conversación"
                    >
                        <MessageSquare size={18} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setSocialMediaAnalyzerVisible(true)}
                        className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                        title="Analizar Redes Sociales"
                    >
                        <Heart size={18} color="#ec4899" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => Alert.alert('Próximamente', 'La función de voz estará disponible pronto.')}
                        className="w-9 h-9 items-center justify-center rounded-full bg-white/10 ml-2"
                    >
                        <Mic size={18} color="#a855f7" />
                    </TouchableOpacity>

                    <TextInput
                        className="flex-1 px-4 text-white text-[15px] max-h-32"
                        placeholder="Escribe tu mensaje..."
                        placeholderTextColor="#6b7280"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        onKeyPress={handleKeyPress}
                        style={{ outlineStyle: 'none' } as any}
                    />


                    {inputText.trim() || selectedImage ? (
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={loading}
                            className="w-9 h-9 items-center justify-center rounded-full mr-1"
                        >
                            <LinearGradient
                                colors={['#3b82f6', '#a855f7']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="w-full h-full rounded-full items-center justify-center"
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Send size={16} color="white" fill="white" />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            className="w-9 h-9 items-center justify-center rounded-full bg-white/10 mr-1"
                        >
                            <Mic size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
                </SafeAreaView >
            </View >

        {/* Modals */ }
        < Sidebar
    onNewChat = { handleNewChat }
    darkMode = { darkMode }
    onToggleDarkMode = {() => setDarkMode(!darkMode)
}
isPremium = { false}
visible = { sidebarVisible }
onClose = {() => setSidebarVisible(false)}
            />

    < DecoderModal
visible = { decoderVisible }
onClose = {() => setDecoderVisible(false)}
            />

    < ConversationAnalyzerModal
visible = { conversationAnalyzerVisible }
onClose = {() => setConversationAnalyzerVisible(false)}
            />

    < SocialMediaAnalyzerModal
visible = { socialMediaAnalyzerVisible }
onClose = {() => setSocialMediaAnalyzerVisible(false)}
            />

    < StalkerDetectorModal
visible = { stalkerDetectorVisible }
onClose = {() => setStalkerDetectorVisible(false)}
onAnalyzeInChat = {(analysis) => {
    setInputText(analysis);
    setStalkerDetectorVisible(false);
}}
            />

    < ConversationHistory
visible = { historyVisible }
onClose = {() => setHistoryVisible(false)}
onLoadConversation = {(conversationId) => {
    // Load conversation logic here
    setHistoryVisible(false);
}}
            />
        </View >
    );
}
