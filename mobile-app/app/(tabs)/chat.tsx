import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, SafeAreaView, Alert, StyleSheet } from 'react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
import { Send, Image as ImageIcon, Mic, StopCircle, X, Heart, MessageSquare, Zap, Menu } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Sidebar from '../../components/Sidebar';
import { storage } from '../../lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as ImagePicker from 'expo-image-picker';
import { loadConversations, setCurrentSimulation } from '../../lib/conversationHelpers';
import { useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import * as FileSystem from 'expo-file-system';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

type Message = {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    image?: string;
    audio?: string;
};

export default function CoachChatScreen() {
    const { tier } = useSubscription();
    const isPremium = tier === 'warrior' || tier === 'phoenix';
    const router = useRouter();

    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<any[]>([]);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadHistory();
        loadConvos();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadConvos();
        }, [])
    );

    const loadConvos = async () => {
        const convos = await loadConversations();
        setConversations(convos);
    }

    const handleConversationSelect = async (id: string) => {
        const result = await setCurrentSimulation(id);
        if (result) {
            router.push('/(tabs)/ex-chat');
        }
    };

    const loadHistory = async () => {
        setLoading(true);
        try {
            const saved = await storage.getItem('coach_conversation_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const saveHistory = async (msgs: Message[]) => {
        await storage.setItem('coach_conversation_history', JSON.stringify(msgs));
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
            if (uri) {
                const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const userMessage: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content: '(Audio enviado)',
                    audio: uri,
                    timestamp: new Date()
                };
                const updated = [...messages, userMessage];
                setMessages(updated);
                handleAIResponse(updated, "Analiza este audio que te acabo de enviar.", userMessage.id, undefined, base64Audio);
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const handleAIResponse = async (history: Message[], userPrompt: string, msgId: string, imageBase64?: string | null, audioBase64?: string | null) => {
        setIsTyping(true);
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const systemPrompt = `Eres REMI, un amigo que entiende las rupturas porque también las ha vivido.

TU ESTILO:
- Habla como un amigo de confianza, no como un terapeuta formal
- Usa un tono cálido pero honesto - di las cosas como son
- Respuestas CORTAS (máx 3-4 líneas, tipo mensaje de WhatsApp)
- Usa emojis ocasionalmente cuando sea natural
- Pregunta cosas para entender mejor, no des sermones largos

LO QUE NUNCA HACES:
- Dar respuestas largas tipo ensayo
- Sonar como libro de autoayuda
- Usar palabras muy formales o técnicas
- Justificar comportamientos tóxicos

SI TE ENVÍAN AUDIO:
Responde al tono emocional. Si suena triste, reconócelo. Si suena enojado, valídalo. Sé humano.

CONTEXTO RECIENTE:
${history.slice(-6).map(m => `${m.role === 'user' ? 'Ellos' : 'Tú'}: ${m.content}`).join('\n')}

MENSAJE ACTUAL: "${userPrompt}"

Responde como REMI (amigo real, no coach formal). Corto y natural.`;

            let result;
            if (imageBase64) {
                result = await model.generateContent([
                    { text: systemPrompt },
                    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
                ]);
            } else if (audioBase64) {
                result = await model.generateContent([
                    { text: systemPrompt },
                    { inlineData: { mimeType: "audio/mp4", data: audioBase64 } }
                ]);
            } else {
                result = await model.generateContent(systemPrompt);
            }

            const response = result.response.text();

            const aiMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };

            const newHistory = [...history, aiMessage];
            setMessages(newHistory);
            saveHistory(newHistory);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const sendMessage = async (text: string = inputText) => {
        if ((!text.trim() && !selectedImage) || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
            timestamp: new Date()
        };

        const updated = [...messages, userMessage];
        setMessages(updated);

        const textToSend = text;
        const imgToSend = selectedImage;

        setInputText('');
        setSelectedImage(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        handleAIResponse(updated, textToSend, userMessage.id, imgToSend);
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Heart size={32} color="#a855f7" strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>Hola, soy REMI</Text>
            <Text style={styles.emptySubtitle}>
                Tu acompañante emocional inteligente. ¿En qué puedo ayudarte hoy?
            </Text>

            <View style={styles.quickActions}>
                <TouchableOpacity
                    onPress={() => sendMessage("Analiza este mensaje de mi ex...")}
                    style={styles.quickAction}
                >
                    <MessageSquare size={20} color="#a855f7" />
                    <Text style={styles.quickActionText}>Analiza este mensaje...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => sendMessage("Me siento triste y ansioso...")}
                    style={styles.quickAction}
                >
                    <Heart size={20} color="#ec4899" />
                    <Text style={styles.quickActionText}>Me siento triste...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => sendMessage("¿Cómo le respondo a esto?")}
                    style={styles.quickAction}
                >
                    <Zap size={20} color="#f59e0b" />
                    <Text style={styles.quickActionText}>¿Cómo le respondo a esto?</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />

            <Sidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                isPremium={isPremium}
                conversations={conversations}
                activeConversationId={null}
                onSelectConversation={handleConversationSelect}
                onRenameConversation={async (id, newTitle) => {
                    const convos = await loadConversations();
                    const updated = convos.map(c => c.id === id ? { ...c, title: newTitle } : c);
                    await storage.setItem('ex_simulator_sessions', JSON.stringify(updated));
                    setConversations(updated);
                }}
                onDeleteConversation={async (id) => {
                    const convos = await loadConversations();
                    const updated = convos.filter(c => c.id !== id);
                    await storage.setItem('ex_simulator_sessions', JSON.stringify(updated));
                    await storage.removeItem(`exSimulator_conversation_${id}`);
                    setConversations(updated);
                }}
                onNewChat={() => router.push('/(tabs)')}
                userId={""}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
                        <Menu size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>REMI</Text>
                        <Text style={styles.headerSubtitle}>IA ASISTENTE</Text>
                    </View>

                    <View style={styles.headerSpacer} />
                </View>

                {/* Chat Area */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatArea}>

                    {/* Promo Card */}
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)')}
                        style={styles.promoCard}
                    >
                        <LinearGradient
                            colors={['#1e1b4b', '#4c1d95']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.promoGradient}
                        >
                            <View style={styles.promoContent}>
                                <Text style={styles.promoTitle}>Prueba el Simulador</Text>
                                <Text style={styles.promoSubtitle}>Practica antes de escribirle.</Text>
                            </View>
                            <View style={styles.promoIcon}>
                                <MessageSquare size={10} color="white" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {messages.length === 0 ? (
                        renderEmptyState()
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item, index) => item.id || index.toString()}
                            renderItem={({ item }) => {
                                const isUser = item.role === 'user';
                                return (
                                    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
                                        {item.role === 'assistant' && (
                                            <View style={styles.aiAvatar}>
                                                <Text style={styles.aiAvatarText}>AI</Text>
                                            </View>
                                        )}
                                        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAI]}>
                                            {item.image && (
                                                <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
                                            )}
                                            {isUser ? (
                                                <Text style={styles.messageTextUser}>{item.content}</Text>
                                            ) : (
                                                <Markdown
                                                    style={{
                                                        body: { color: '#e5e7eb', fontSize: 16, lineHeight: 24 },
                                                        heading1: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 10 },
                                                        heading2: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginVertical: 8 },
                                                        paragraph: { marginVertical: 0 },
                                                        list_item: { marginVertical: 4 },
                                                        bullet_list: { marginVertical: 4 },
                                                        code_block: { backgroundColor: '#000', padding: 10, borderRadius: 8, marginVertical: 8, borderColor: '#333', borderWidth: 1 },
                                                        code_inline: { backgroundColor: '#333', color: '#f3f4f6', borderRadius: 4, paddingHorizontal: 4 },
                                                        link: { color: '#a855f7' },
                                                    }}
                                                >
                                                    {item.content}
                                                </Markdown>
                                            )}
                                            <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
                                                {item.timestamp ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            }}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    )}

                    {/* Input Area */}
                    <View style={styles.inputContainer}>
                        {selectedImage && (
                            <View style={styles.imagePreview}>
                                <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} style={styles.previewImage} />
                                <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImage}>
                                    <X size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.inputRow}>
                            <TouchableOpacity onPress={pickImage} style={styles.inputButton}>
                                <ImageIcon size={20} color="#9ca3af" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.inputButton, isRecording && styles.inputButtonRecording]}>
                                {isRecording ? <StopCircle size={20} color="#ef4444" /> : <Mic size={20} color="#9ca3af" />}
                            </TouchableOpacity>

                            <TextInput
                                style={styles.textInput}
                                placeholder="Escribe a tu coach..."
                                placeholderTextColor="#6b7280"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                onSubmitEditing={() => {
                                    if (Platform.OS === 'web' && inputText.trim()) {
                                        sendMessage();
                                    }
                                }}
                            />

                            <TouchableOpacity
                                onPress={() => sendMessage()}
                                disabled={(!inputText.trim() && !selectedImage) || isTyping}
                                style={[styles.sendButton, ((!inputText.trim() && !selectedImage) || isTyping) && styles.sendButtonDisabled]}
                            >
                                {isTyping ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Send size={20} color={(!inputText.trim() && !selectedImage) ? '#6b7280' : 'white'} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#000',
    },
    menuButton: {
        padding: 8,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
    },
    headerSubtitle: {
        color: '#a855f7',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
    },
    headerSpacer: {
        width: 40,
    },
    chatArea: {
        flex: 1,
    },
    promoCard: {
        marginHorizontal: 32,
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.2)',
    },
    promoGradient: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promoContent: {
        flex: 1,
        marginRight: 8,
    },
    promoTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 10,
    },
    promoSubtitle: {
        color: '#c4b5fd',
        fontSize: 8,
    },
    promoIcon: {
        width: 20,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(168,85,247,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.3)',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: '80%',
    },
    quickActions: {
        width: '100%',
        maxWidth: 320,
        gap: 12,
    },
    quickAction: {
        backgroundColor: '#1c1c1e',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    quickActionText: {
        color: '#d1d5db',
        fontWeight: '500',
        marginLeft: 12,
    },
    messageRow: {
        paddingHorizontal: 16,
        marginBottom: 16,
        flexDirection: 'row',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAI: {
        justifyContent: 'flex-start',
    },
    aiAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#9333ea',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    aiAvatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    messageBubble: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        maxWidth: '85%',
    },
    messageBubbleUser: {
        backgroundColor: '#9333ea',
    },
    messageBubbleAI: {
        backgroundColor: '#1c1c1e',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    messageImage: {
        width: 192,
        height: 192,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#d1d5db',
    },
    messageTextUser: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 8,
        color: '#6b7280',
    },
    messageTimeUser: {
        color: 'rgba(233,213,255,0.8)',
        textAlign: 'right',
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: '#000',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    imagePreview: {
        marginBottom: 8,
        width: 80,
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    removeImage: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        padding: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 28,
        paddingHorizontal: 8,
        paddingVertical: 8,
        minHeight: 56,
    },
    inputButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        marginHorizontal: 2,
    },
    inputButtonRecording: {
        backgroundColor: 'rgba(239,68,68,0.2)',
    },
    textInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        maxHeight: 96,
        paddingVertical: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        backgroundColor: '#9333ea',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
