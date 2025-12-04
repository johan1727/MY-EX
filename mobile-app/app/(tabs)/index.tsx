import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
import { Send, X, Sparkles, Plus, MessageSquare, Wrench, Heart, BookOpen, Mic } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { sendMessageToChatGPT, extractKeyFacts, checkForCrisisKeywords } from '../../lib/openai';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MessageItem from '../../components/MessageItem';
import Sidebar from '../../components/Sidebar';
import DecoderModal from '../../components/DecoderModal';
import ConversationAnalyzerModal from '../../components/ConversationAnalyzerModal';
import SocialMediaAnalyzerModal from '../../components/SocialMediaAnalyzerModal';
import StalkerDetectorModal from '../../components/StalkerDetectorModal';
import ToolModal from '../../components/ToolModal';
import ExSimulatorShowcase from '../../components/ExSimulatorShowcase';
import EmptyState from '../../components/EmptyState';
import ActionSheet from '../../components/ActionSheet';
import { useLanguage } from '../../lib/i18n';
import { Conversation } from '../../components/ConversationList';

type Message = {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    created_at: string;
    image?: string;
};

export default function ChatScreen() {
    const { tier } = useSubscription();
    const isPremium = tier === 'warrior' || tier === 'phoenix';
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    // Tool States
    const [decoderVisible, setDecoderVisible] = useState(false);
    const [conversationAnalyzerVisible, setConversationAnalyzerVisible] = useState(false);
    const [socialMediaAnalyzerVisible, setSocialMediaAnalyzerVisible] = useState(false);
    const [stalkerDetectorVisible, setStalkerDetectorVisible] = useState(false);
    const [journalVisible, setJournalVisible] = useState(false);
    const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
    const [isAITyping, setIsAITyping] = useState(false);

    // Conversation State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    const flatListRef = useRef<FlatList>(null);
    const { t } = useLanguage();

    useEffect(() => {
        initializeChat();
    }, []);

    const initializeChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Redirect to login if not authenticated
                router.replace('/login');
                return;
            }

            setCurrentUser(user);
            await loadConversations(user.id);

            // Update Streak
            const { data: streakData, error: streakError } = await supabase.rpc('update_streak', {
                p_user_id: user.id
            });

            if (streakError) console.error('Error updating streak:', streakError);
            if (streakData && streakData.streak_bonus) {
                Alert.alert('🔥 ¡Racha Mantenida!', `Has mantenido tu racha de ${streakData.current_streak} días.`);
            }
        } catch (error) {
            console.error('Error initializing chat:', error);
        }
    };

    const loadConversations = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setConversations(data);
                if (data.length > 0 && !activeConversationId) {
                    // Select most recent conversation by default
                    handleSelectConversation(data[0].id);
                } else if (data.length === 0) {
                    // Create default conversation if none exists
                    await createNewConversation(userId, 'Conversación Principal');
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    };

    const createNewConversation = async (userId: string, title: string = 'Nueva conversación') => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    user_id: userId,
                    title: title
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setConversations(prev => [data, ...prev]);
                handleSelectConversation(data.id);
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    };

    const handleSelectConversation = async (conversationId: string) => {
        setActiveConversationId(conversationId);
        await loadMessages(conversationId);
        setSidebarVisible(false);
    };

    const handleRenameConversation = async (id: string, newTitle: string) => {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ title: newTitle })
                .eq('id', id);

            if (error) throw error;

            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, title: newTitle } : c
            ));
        } catch (error) {
            console.error('Error renaming conversation:', error);
            Alert.alert('Error', 'No se pudo renombrar la conversación');
        }
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setConversations(prev => prev.filter(c => c.id !== id));

            if (activeConversationId === id) {
                // If deleted active conversation, switch to another or clear
                const remaining = conversations.filter(c => c.id !== id);
                if (remaining.length > 0) {
                    handleSelectConversation(remaining[0].id);
                } else {
                    setActiveConversationId(null);
                    setMessages([]);
                    // Create new default one
                    if (currentUser) {
                        createNewConversation(currentUser.id);
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Alert.alert('Error', 'No se pudo eliminar la conversación');
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                setMessages(data as any);
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleNewChat = () => {
        if (currentUser) {
            createNewConversation(currentUser.id);
        }
    };

    const handleQuickAction = (prompt: string) => {
        setInputText(prompt);
    };

    const handleToolSelect = (tool: string) => {
        // Instead of opening modals, insert tool-specific prompts into chat
        switch (tool) {
            case 'chat':
                // User selected Chat Coach - focus on input with a welcoming prompt
                setInputText('');
                // Focus will happen naturally, just scroll to bottom
                flatListRef.current?.scrollToEnd({ animated: true });
                break;
            case 'image':
                pickImage();
                break;
            case 'ex-simulator':
                router.push('/tools/ex-simulator');
                break;
            case 'decoder':
                setInputText('🔍 Decodificar mensaje: ');
                break;
            case 'analyzer': // Updated ID from MinimalHeader
            case 'conversation':
                setInputText('📊 Analizar conversación: ');
                break;
            case 'social':
                setInputText('📱 Analizar publicación: ');
                break;
            case 'stalker':
                setInputText('👁️ Detectar stalking: ');
                break;
            case 'journal':
                // Navigate to journal tool directly
                router.push('/tools/journal');
                break;
            case 'panic':
                // Panic button sends immediate help message
                setInputText('🆘 Necesito ayuda urgente, estoy en crisis');
                setTimeout(() => sendMessage(), 100);
                break;
            case 'progress':
                router.push('/(tabs)/progress');
                break;
        }
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

    const handleEditMessage = async (messageId: string, newContent: string) => {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .update({ content: newContent })
                .eq('id', messageId);

            if (error) throw error;

            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, content: newContent } : m
            ));

            // Check if we need to regenerate the response
            const msgIndex = messages.findIndex(m => m.id === messageId);
            if (msgIndex !== -1 && msgIndex < messages.length - 1) {
                const nextMsg = messages[msgIndex + 1];
                if (nextMsg.sender === 'ai') {
                    await handleRegenerateResponse(nextMsg.id);
                }
            } else if (msgIndex === messages.length - 1) {
                // If it's the last message, trigger a response
                setIsAITyping(true);
                const response = await sendMessageToChatGPT(
                    newContent,
                    null,
                    currentUser?.id,
                    messages.slice(0, msgIndex)
                );
                setIsAITyping(false);

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    content: response.text,
                    sender: 'ai',
                    created_at: new Date().toISOString(),
                };

                setMessages(prev => [...prev, aiMsg]);

                if (currentUser && activeConversationId) {
                    await supabase.from('chat_messages').insert({
                        user_id: currentUser.id,
                        content: aiMsg.content,
                        sender: aiMsg.sender,
                        conversation_id: activeConversationId
                    });
                }
            }
        } catch (error) {
            console.error('Error editing message:', error);
            Alert.alert('Error', 'No se pudo editar el mensaje');
        }
    };

    const handleRegenerateResponse = async (messageId: string) => {
        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex <= 0) return;

        const userMessage = messages[msgIndex - 1];
        if (userMessage.sender !== 'user') return;

        try {
            await handleDeleteMessage(messageId);

            setIsAITyping(true);
            const response = await sendMessageToChatGPT(
                userMessage.content,
                userMessage.image,
                currentUser?.id,
                messages.slice(0, msgIndex)
            );
            setIsAITyping(false);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                content: response.text,
                sender: 'ai',
                created_at: new Date().toISOString(),
            };

            setMessages(prev => {
                const newMessages = [...prev];
                return [...newMessages, aiMsg];
            });

            if (currentUser && activeConversationId) {
                await supabase.from('chat_messages').insert({
                    user_id: currentUser.id,
                    content: aiMsg.content,
                    sender: aiMsg.sender,
                    conversation_id: activeConversationId
                });
            }
        } catch (error) {
            console.error('Error regenerating response:', error);
            setIsAITyping(false);
            Alert.alert('Error', 'No se pudo regenerar la respuesta');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
            Alert.alert('Error', 'No se pudo eliminar el mensaje');
        }
    };

    const sendMessage = async () => {
        console.log('sendMessage called, inputText:', inputText, 'loading:', loading);
        if ((!inputText.trim() && !selectedImage) || loading) {
            console.log('Blocked: empty input or already loading');
            return;
        }

        if (currentUser) {
            const { data, error } = await supabase.rpc('increment_usage', {
                p_user_id: currentUser.id,
                p_feature_type: 'message'
            });

            if (error) {
                console.error('Error checking limits:', error);
            } else if (data && data.length > 0) {
                const result = data[0];

                if (!result.allowed) {
                    const limitType = result.limit_type;
                    const resetMinutes = result.reset_in_minutes;

                    let message = '';
                    let upgradeMessage = '';

                    if (limitType === 'hourly') {
                        const hours = Math.floor(resetMinutes / 60);
                        const mins = resetMinutes % 60;
                        message = `Has alcanzado tu límite de mensajes por hora. Podrás enviar más mensajes en ${hours > 0 ? `${hours}h ${mins}m` : `${mins} minutos`}.`;
                        upgradeMessage = 'Actualiza a un plan superior para más mensajes por hora.';
                    } else {
                        message = 'Has alcanzado tu límite diario de mensajes.';
                        upgradeMessage = 'Actualiza a Warrior, Premium o Phoenix para más mensajes.';
                    }

                    Alert.alert(
                        '⏱️ Límite Alcanzado',
                        `${message}\n\n${upgradeMessage}`,
                        [
                            { text: 'Entendido', style: 'cancel' },
                            {
                                text: 'Ver Planes',
                                onPress: () => router.push('/paywall')
                            }
                        ]
                    );
                    return;
                }
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
        const textToSend = inputText;
        const imageToSend = selectedImage;
        setInputText('');
        setSelectedImage(null);
        setLoading(true);

        console.log('Message added to UI, loading set to true');

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            if (currentUser && activeConversationId) {
                await supabase.from('chat_messages').insert({
                    user_id: currentUser.id,
                    content: userMsg.content,
                    sender: userMsg.sender,
                    image: userMsg.image,
                    conversation_id: activeConversationId
                });
            }

            setIsAITyping(true);

            const response = await sendMessageToChatGPT(
                textToSend,
                imageToSend,
                currentUser?.id,
                messages
            );

            console.log('Got AI response:', response.text.substring(0, 50));

            setIsAITyping(false);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                content: response.text,
                sender: 'ai',
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, aiMsg]);

            if (response.suggestedReplies && response.suggestedReplies.length > 0) {
                setSuggestedReplies(response.suggestedReplies);
            }

            if (currentUser && activeConversationId) {
                await supabase.from('chat_messages').insert({
                    user_id: currentUser.id,
                    content: aiMsg.content,
                    sender: aiMsg.sender,
                    conversation_id: activeConversationId
                });

                try {
                    // 1. Extract Key Facts (Memory)
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

                    // 2. Add XP (Gamification)
                    const { data: xpData, error: xpError } = await supabase.rpc('add_xp', {
                        p_user_id: currentUser.id,
                        p_amount: 10 // 10 XP per message
                    });

                    if (xpError) console.error('Error adding XP:', xpError);
                    if (xpData && xpData.leveled_up) {
                        Alert.alert('🎉 ¡Subiste de Nivel!', `Has alcanzado el nivel ${xpData.new_level}. ¡Sigue así!`);
                    }

                } catch (memoryError) {
                    console.error('Error in background tasks (memory/xp):', memoryError);
                }
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            console.error('Error details:', error.message, error.stack);
            Alert.alert("Error", `No se pudo enviar el mensaje.\n\nError: ${error.message}\n\nIntenta de nuevo.`);
        } finally {
            setLoading(false);
            console.log('sendMessage finished, loading set to false');
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



    return (
        <View className="flex-1 bg-black flex-row">
            <StatusBar style="light" backgroundColor="#0f0f1e" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a2e', '#16213e', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            <Sidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                isPremium={isPremium}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onRenameConversation={handleRenameConversation}
                onDeleteConversation={handleDeleteConversation}
                onNewChat={handleNewChat}
                userId={currentUser?.id}
            />

            <SafeAreaView className="flex-1">
                <View className="flex-row items-center justify-between px-4 py-3 md:hidden">
                    <TouchableOpacity
                        onPress={() => setSidebarVisible(true)}
                        className="p-2 bg-white/10 rounded-lg"
                    >
                        <View className="w-5 h-0.5 bg-white mb-1" />
                        <View className="w-5 h-0.5 bg-white mb-1" />
                        <View className="w-5 h-0.5 bg-white" />
                    </TouchableOpacity>
                    <Text className="text-white font-semibold text-lg">My Ex Chat</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/tools')}
                        className="p-2 bg-white/10 rounded-lg"
                    >
                        <View className="w-1 h-1 bg-white rounded-full mb-1" />
                        <View className="w-1 h-1 bg-white rounded-full mb-1" />
                        <View className="w-1 h-1 bg-white rounded-full" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    className="flex-1"
                >
                    {messages.length === 0 ? (
                        <View className="flex-1">
                            <EmptyState onQuickAction={handleQuickAction} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            ListHeaderComponent={() => (
                                <View className="h-2" />
                            )}
                            renderItem={({ item }) => (
                                <MessageItem
                                    item={item}
                                    onEdit={(newContent) => handleEditMessage(item.id, newContent)}
                                    onRegenerate={() => handleRegenerateResponse(item.id)}
                                    onDelete={() => handleDeleteMessage(item.id)}
                                />
                            )}
                            contentContainerStyle={{ paddingVertical: 15, paddingBottom: 25 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    {/* Typing Indicator */}
                    {isAITyping && (
                        <View className="px-5 py-3">
                            <View className="bg-white/5 rounded-2xl px-4 py-3 self-start max-w-[80%]">
                                <Text className="text-gray-400 text-sm mb-1">Coach está escribiendo...</Text>
                                <View className="flex-row gap-1">
                                    <View className="w-2 h-2 bg-purple-500 rounded-full opacity-100" />
                                    <View className="w-2 h-2 bg-purple-400 rounded-full opacity-75" />
                                    <View className="w-2 h-2 bg-purple-300 rounded-full opacity-50" />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Suggested Replies */}
                    {suggestedReplies.length > 0 && (
                        <View className="px-5 pb-3">
                            <View className="flex-row flex-wrap gap-2">
                                {suggestedReplies.map((reply, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setInputText(reply);
                                            setSuggestedReplies([]);
                                        }}
                                        className="bg-white/5 border border-purple-500/30 px-4 py-2 rounded-full"
                                    >
                                        <Text className="text-purple-300 text-sm">💬 {reply}</Text>
                                    </TouchableOpacity>
                                ))}
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

                        <View className="flex-row items-center bg-[#2f2f2f] border border-[#3f3f3f] rounded-3xl px-4 py-3 min-h-[56px]">
                            <TouchableOpacity
                                onPress={() => setActionSheetVisible(true)}
                                className="w-8 h-8 items-center justify-center rounded-lg bg-white/10 mr-2"
                            >
                                <Plus size={18} color="#9ca3af" />
                            </TouchableOpacity>

                            <TextInput
                                className="flex-1 px-2 text-white text-[15px] max-h-32"
                                placeholder="Mensaje..."
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
                                    className="w-8 h-8 items-center justify-center rounded-lg bg-purple-600 ml-2"
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Send size={16} color="white" fill="white" />
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Próximamente', 'La función de voz estará disponible pronto.')}
                                    className="w-8 h-8 items-center justify-center rounded-lg bg-white/10 ml-2"
                                >
                                    <Mic size={16} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text className="text-center text-gray-500 text-[10px] mt-3">
                            La IA puede cometer errores. Verifica la información importante.
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Modals */}
            <DecoderModal
                visible={decoderVisible}
                onClose={() => setDecoderVisible(false)}
                onInsertResponse={(text) => setInputText(text)}
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
                onAnalyzeInChat={(text) => setInputText(text)}
            />

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                onSelect={handleToolSelect}
            />

            {/* Journal Modal - Placeholder for now */}
            <ToolModal
                visible={journalVisible}
                onClose={() => setJournalVisible(false)}
                title="Diario de Ánimo"
            >
                <View className="flex-1 items-center justify-center p-6">
                    <Text className="text-white text-center mb-4">
                        La versión rápida del diario está en construcción.
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setJournalVisible(false);
                            router.push('/tools/journal');
                        }}
                        className="bg-blue-600 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Ir al Diario Completo</Text>
                    </TouchableOpacity>
                </View>
            </ToolModal>

        </View>
    );
}
