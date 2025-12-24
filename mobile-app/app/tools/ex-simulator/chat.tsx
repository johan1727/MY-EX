import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fragmentMessage, calculateInitialDelay, buildEnhancedPrompt } from '../../../lib/chatHelpers';
import { loadMasterPrompt } from '../../../lib/masterPromptSupabase';
import { storage } from '../../../lib/storage';
import { checkProhibitedContent } from '../../../lib/contentModeration';
import { ArrowLeft, Send } from 'lucide-react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
console.log('[ExChat] API Key check:', GEMINI_API_KEY ? `Present (${GEMINI_API_KEY.substring(0, 8)}...)` : 'MISSING');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    seen?: boolean;
}

export default function ExSimulatorChat() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userName, setUserName] = useState('');
    const [conversationMemory, setConversationMemory] = useState<string>(''); // Long-term memory

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const loadProfile = async () => {
        const stored = await storage.getItem('exSimulator_currentProfile');
        if (stored) {
            const data = JSON.parse(stored);
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
            // Detect user name from messages or use generic
            const detectedUserName = data.userName || 'Usuario';
            setUserName(detectedUserName);

            const conversationKey = `exSimulator_conversation_${data.id}`;
            const savedConversation = await storage.getItem(conversationKey);
            if (savedConversation) {
                const parsed = JSON.parse(savedConversation);
                setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } else {
                // Start with empty chat - no initial greeting
                setMessages([]);
            }

            // Load long-term memory
            const memoryKey = `exSimulator_memory_${data.id}`;
            const savedMemory = await storage.getItem(memoryKey);
            if (savedMemory) {
                setConversationMemory(savedMemory);
                console.log('[ExChat] Loaded memory:', savedMemory.substring(0, 100));
            }
        } else {
            router.back();
        }
    };

    const saveConversation = async (msgs: Message[]) => {
        if (!profileData) return;
        const key = `exSimulator_conversation_${profileData.id}`;
        await storage.setItem(key, JSON.stringify(msgs));

        // Update long-term memory every 20 messages
        if (msgs.length % 20 === 0 && msgs.length > 0) {
            await generateMemorySummary(msgs);
        }
    };

    // Generate a summary of important conversation points for long-term memory
    const generateMemorySummary = async (msgs: Message[]) => {
        if (!profileData) return;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const recentMsgs = msgs.slice(-30).map(m =>
                `${m.role === 'user' ? 'Usuario' : profileData.exName}: ${m.content}`
            ).join('\n');

            const memoryPrompt = `Analiza esta conversación y extrae los puntos IMPORTANTES que ${profileData.exName} debería recordar:
${recentMsgs}

Extrae en máximo 5 bullets:
- Temas que se discutieron
- Promesas o acuerdos hechos
- Información personal compartida
- Estado emocional de la conversación
- Cualquier otro detalle relevante

Responde SOLO con los bullets, máximo 200 caracteres total:`;

            const result = await model.generateContent(memoryPrompt);
            const newMemory = result.response.text().trim();

            // Append to existing memory, keeping only last 1000 chars
            const updatedMemory = (conversationMemory + '\n' + newMemory).slice(-1000).trim();
            setConversationMemory(updatedMemory);

            const memoryKey = `exSimulator_memory_${profileData.id}`;
            await storage.setItem(memoryKey, updatedMemory);
            console.log('[ExChat] Memory updated:', updatedMemory.substring(0, 100));
        } catch (err) {
            console.error('[ExChat] Memory generation failed:', err);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isTyping || !profileData) return;

        const contentCheck = checkProhibitedContent(inputText);
        if (contentCheck.isProhibited) {
            const errorMessage: Message = {
                role: 'assistant',
                content: `❌ ${contentCheck.message}`,
                timestamp: new Date(),
                seen: false
            };
            setMessages([...messages, errorMessage]);
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: inputText,
            timestamp: new Date(),
            seen: false
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        const currentInput = inputText;
        setInputText('');

        try {
            if (!GEMINI_API_KEY) {
                throw new Error('API_KEY_MISSING');
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            let systemPrompt: string;

            // Build memory context if available
            const memoryContext = conversationMemory ? `
═══════════════════════════════════════════════
MEMORIA DE CONVERSACIONES ANTERIORES:
${conversationMemory}
═══════════════════════════════════════════════
` : '';

            if (profileData.masterPrompt) {
                const recentContext = messages.slice(-6).map(m =>
                    `${m.role === 'user' ? userName : profileData.exName}: ${m.content}`
                ).join('\n');
                systemPrompt = `${profileData.masterPrompt}\n${memoryContext}\nCONTEXTO RECIENTE:\n${recentContext}\n\nMENSAJE ACTUAL: "${currentInput}"\n\nRESPONDE (sin poner tu nombre antes):`;
            } else {
                systemPrompt = buildEnhancedPrompt(profileData, userName, currentInput, messages);
            }

            const initialDelay = calculateInitialDelay(currentInput, profileData.profile.attachmentStyle, profileData.profile.emotionalTone);
            await new Promise(resolve => setTimeout(resolve, initialDelay));

            updatedMessages[updatedMessages.length - 1].seen = true;
            setMessages([...updatedMessages]);
            setIsTyping(true);

            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            let fullText = response.text();

            // Clean AI response - remove name prefixes like "Marian:" or "Marian: Marian:"
            const exNameLower = profileData.exName.toLowerCase();
            // Remove patterns like "Marian: " or "Marian: Marian: " at the start
            fullText = fullText.replace(new RegExp(`^${profileData.exName}:\\s*`, 'i'), '');
            fullText = fullText.replace(new RegExp(`^${profileData.exName}:\\s*${profileData.exName}:\\s*`, 'i'), '');
            // Also remove any remaining name prefix
            fullText = fullText.replace(/^[A-Za-záéíóúñÁÉÍÓÚÑ]+:\s*/i, '').trim();

            const fragments = fragmentMessage(fullText, profileData.profile.attachmentStyle);
            let currentMessages = [...updatedMessages];

            for (let i = 0; i < fragments.length; i++) {
                const fragment = fragments[i];
                if (fragment.delay > 0) await new Promise(resolve => setTimeout(resolve, fragment.delay));
                const aiMessage: Message = {
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
        } catch (error: any) {
            console.error('[ExChat] Error:', error);
            let errorText = 'Error de conexión. Intenta de nuevo.';
            if (error.message === 'API_KEY_MISSING') {
                errorText = '⚠️ Falta la clave API de Gemini. Contacta a soporte.';
            } else if (error.message?.includes('API key')) {
                errorText = '🔑 Error de autenticación API.';
            } else if (error.message?.includes('quota')) {
                errorText = '📊 Límite de uso excedido. Intenta más tarde.';
            }
            const errorMessage: Message = {
                role: 'assistant',
                content: errorText,
                timestamp: new Date(),
                seen: false
            };
            setMessages([...updatedMessages, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!profileData) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#a855f7" />
                <Text style={styles.loadingText}>Cargando conversación...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{profileData.exName[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{profileData.exName}</Text>
                        <Text style={styles.headerStatus}>
                            {isTyping ? 'Escribiendo...' : 'En línea'}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerRight} />
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.messageRow,
                            msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant
                        ]}
                    >
                        {msg.role === 'assistant' && (
                            <View style={styles.messageAvatar}>
                                <Text style={styles.messageAvatarText}>{profileData.exName[0]}</Text>
                            </View>
                        )}
                        <View
                            style={[
                                styles.messageBubble,
                                msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant
                            ]}
                        >
                            <Text style={[
                                styles.messageText,
                                msg.role === 'user' ? styles.messageTextUser : styles.messageTextAssistant
                            ]}>
                                {msg.content}
                            </Text>
                            <Text style={[
                                styles.messageTime,
                                msg.role === 'user' ? styles.messageTimeUser : styles.messageTimeAssistant
                            ]}>
                                {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                {msg.role === 'user' && msg.seen && ' • Leído'}
                            </Text>
                        </View>
                    </View>
                ))}

                {isTyping && (
                    <View style={[styles.messageRow, styles.messageRowAssistant]}>
                        <View style={styles.messageAvatar}>
                            <Text style={styles.messageAvatarText}>{profileData.exName[0]}</Text>
                        </View>
                        <View style={styles.typingBubble}>
                            <Text style={styles.typingText}>...</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                        editable={!isTyping}
                        multiline
                    />
                    {inputText.trim() && (
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={isTyping}
                            style={styles.sendButton}
                        >
                            <Send size={20} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#0a0a0a',
    },
    backButton: {
        padding: 8,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#a855f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerInfo: {
        marginLeft: 12,
    },
    headerName: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
    headerStatus: {
        color: '#22c55e',
        fontSize: 12,
    },
    headerRight: {
        width: 40,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAssistant: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#27272a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageAvatarText: {
        color: '#a855f7',
        fontSize: 11,
        fontWeight: 'bold',
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    messageBubbleUser: {
        backgroundColor: '#a855f7',
        borderBottomRightRadius: 4,
    },
    messageBubbleAssistant: {
        backgroundColor: '#1c1c1e',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageTextUser: {
        color: 'white',
    },
    messageTextAssistant: {
        color: '#e5e5e5',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
    },
    messageTimeUser: {
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'right',
    },
    messageTimeAssistant: {
        color: 'rgba(255,255,255,0.5)',
    },
    typingBubble: {
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    typingText: {
        color: '#a855f7',
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 48,
    },
    textInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#a855f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
