import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Lock, Unlock, MessageCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface CoachMessage {
    id: string;
    sender: 'user' | 'coach';
    content: string;
    created_at: string;
}

export default function CoachChat() {
    const { profileId } = useLocalSearchParams();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);

    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<CoachMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [hasAccessToExChat, setHasAccessToExChat] = useState(false);
    const [exProfile, setExProfile] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        initializeChat();
    }, []);

    const initializeChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (!user) return;

            // Load ex profile if provided
            if (profileId) {
                const { data: profile } = await supabase
                    .from('ex_profiles')
                    .select('*')
                    .eq('id', profileId)
                    .single();

                setExProfile(profile);
            }

            // Check if conversation exists
            const { data: existingConv } = await supabase
                .from('coach_conversations')
                .select('*')
                .eq('user_id', user.id)
                .eq('ex_profile_id', profileId || null)
                .single();

            if (existingConv) {
                setConversationId(existingConv.id);
                setHasAccessToExChat(existingConv.has_access_to_ex_chat);
                await loadMessages(existingConv.id);
            } else {
                // Create new conversation
                const { data: newConv } = await supabase
                    .from('coach_conversations')
                    .insert({
                        user_id: user.id,
                        ex_profile_id: profileId || null
                    })
                    .select()
                    .single();

                setConversationId(newConv.id);

                // Send welcome message from coach
                const welcomeMsg: CoachMessage = {
                    id: '1',
                    sender: 'coach',
                    content: `Hola! Soy tu coach personal. Estoy aquí para ayudarte en tu proceso de recuperación.${exProfile ? `\n\nVeo que estás hablando con ${exProfile.ex_name}. ¿Quieres que analice tu conversación con ella para darte feedback?` : '\n\n¿En qué puedo ayudarte hoy?'}`,
                    created_at: new Date().toISOString()
                };

                setMessages([welcomeMsg]);
            }
        } catch (error) {
            console.error('Error initializing coach chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convId: string) => {
        try {
            const { data, error } = await supabase
                .from('coach_messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setMessages(data || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const requestAccessToExChat = async () => {
        if (!conversationId) return;

        const userMessage: CoachMessage = {
            id: Date.now().toString(),
            sender: 'user',
            content: 'Sí, por favor analiza mi conversación',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);

        // Save user message
        await supabase.from('coach_messages').insert({
            conversation_id: conversationId,
            sender: 'user',
            content: userMessage.content
        });

        // Grant access
        await supabase
            .from('coach_conversations')
            .update({ has_access_to_ex_chat: true })
            .eq('id', conversationId);

        setHasAccessToExChat(true);

        // Coach response
        const coachMsg: CoachMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'coach',
            content: `Perfecto! Ahora puedo ver tu conversación con ${exProfile?.ex_name}. Déjame analizar los mensajes...\n\nVeo algunos patrones interesantes. ¿Hay algo específico que te gustaría que analice?`,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, coachMsg]);

        await supabase.from('coach_messages').insert({
            conversation_id: conversationId,
            sender: 'coach',
            content: coachMsg.content
        });
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isAITyping || !conversationId) return;

        const userMessage: CoachMessage = {
            id: Date.now().toString(),
            sender: 'user',
            content: inputText,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');

        // Save to database
        await supabase.from('coach_messages').insert({
            conversation_id: conversationId,
            sender: 'user',
            content: userMessage.content
        });

        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Generate AI response
        setIsAITyping(true);

        try {
            // TODO: Implement AI coach response with Gemini
            // For now, simple response
            const coachResponse = `Entiendo. ${hasAccessToExChat ? 'Basándome en tu conversación con ' + exProfile?.ex_name + ', ' : ''}te sugiero que...`;

            const coachMessage: CoachMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'coach',
                content: coachResponse,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, coachMessage]);

            await supabase.from('coach_messages').insert({
                conversation_id: conversationId,
                sender: 'coach',
                content: coachMessage.content
            });

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) {
            console.error('Error generating coach response:', error);
        } finally {
            setIsAITyping(false);
        }
    };

    const renderMessage = ({ item }: { item: CoachMessage }) => {
        const isUser = item.sender === 'user';

        return (
            <View className={`px-5 py-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-blue-600'
                    : 'bg-purple-600/20 border border-purple-500/30'
                    }`}>
                    {!isUser && (
                        <Text className="text-purple-400 text-xs mb-1 font-semibold">
                            🤖 Coach
                        </Text>
                    )}
                    <Text className={`${isUser ? 'text-white' : 'text-gray-200'} leading-6`}>
                        {item.content}
                    </Text>
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
                <View className="px-6 py-4 border-b border-white/10">
                    <View className="flex-row items-center">
                        <View className="bg-purple-500/20 p-2 rounded-full mr-3">
                            <MessageCircle size={24} color="#a855f7" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white text-xl font-bold">
                                Coach Personal
                            </Text>
                            {exProfile && (
                                <View className="flex-row items-center mt-1">
                                    {hasAccessToExChat ? (
                                        <>
                                            <Unlock size={12} color="#22c55e" />
                                            <Text className="text-green-400 text-xs ml-1">
                                                Analizando chat con {exProfile.ex_name}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={12} color="#9ca3af" />
                                            <Text className="text-gray-400 text-xs ml-1">
                                                Sin acceso a chat con {exProfile.ex_name}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
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

                    {/* Request Access Button */}
                    {exProfile && !hasAccessToExChat && messages.length > 0 && (
                        <View className="px-5 pb-3">
                            <TouchableOpacity
                                onPress={requestAccessToExChat}
                                className="bg-purple-600 rounded-2xl py-3 flex-row items-center justify-center"
                            >
                                <Unlock size={18} color="white" />
                                <Text className="text-white font-bold ml-2">
                                    Permitir acceso a mi conversación
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Typing Indicator */}
                    {isAITyping && (
                        <View className="px-5 py-3">
                            <View className="bg-purple-600/10 rounded-2xl px-4 py-3 self-start max-w-[80%]">
                                <Text className="text-purple-400 text-sm mb-1">
                                    Coach está escribiendo...
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
                        <View className="flex-row items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] px-3 py-2.5 min-h-[60px]">
                            <TextInput
                                className="flex-1 px-4 text-white text-[15px] max-h-32"
                                placeholder="Pregunta al coach..."
                                placeholderTextColor="#6b7280"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                style={{ outlineStyle: 'none' } as any}
                            />

                            {inputText.trim() && (
                                <TouchableOpacity
                                    onPress={sendMessage}
                                    disabled={isAITyping}
                                    className="w-9 h-9 items-center justify-center rounded-full mr-1"
                                >
                                    <LinearGradient
                                        colors={['#a855f7', '#7c3aed']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        className="w-full h-full rounded-full items-center justify-center"
                                    >
                                        <Send size={16} color="white" fill="white" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}
