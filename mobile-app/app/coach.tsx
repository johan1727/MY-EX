import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Heart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../lib/storage';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function CoachScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Load saved messages on mount
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const saved = await storage.getItem('coach_messages');
                if (saved) {
                    setMessages(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Error loading coach messages:', e);
            }
        };
        loadMessages();
    }, []);

    // Save messages when they change
    useEffect(() => {
        if (messages.length > 0) {
            storage.setItem('coach_messages', JSON.stringify(messages));
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!inputText.trim() || isTyping) return;

        const userMessage: Message = { role: 'user', content: inputText.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        const currentInput = inputText;
        setInputText('');
        setIsTyping(true);

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const context = updatedMessages.slice(-6).map(m =>
                `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}`
            ).join('\n');

            const systemPrompt = `Eres un coach de bienestar emocional especializado en relaciones. Tu rol es:
- Escuchar con empatía y sin juzgar
- Ayudar al usuario a procesar sus emociones sobre rupturas
- Dar consejos prácticos pero amables
- Fomentar el autocuidado y crecimiento personal
- NUNCA dar consejos médicos o de salud mental específicos
- Sugerir buscar ayuda profesional cuando sea apropiado

Responde de forma cálida, breve (2-3 oraciones máximo), y en español.

CONTEXTO:
${context}

MENSAJE: "${currentInput}"

RESPONDE:`;

            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const assistantMessage: Message = {
                role: 'assistant',
                content: response.text(),
            };
            setMessages([...updatedMessages, assistantMessage]);
        } catch (error) {
            console.error('[Coach] Error:', error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Coach de Bienestar</Text>
                        {isTyping && <Text style={styles.typingIndicator}>escribiendo...</Text>}
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 && (
                        <View style={styles.emptyChat}>
                            <LinearGradient
                                colors={['#ec4899', '#a855f7']}
                                style={styles.emptyChatIcon}
                            >
                                <Heart size={32} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.emptyChatTitle}>Tu Coach de Bienestar</Text>
                            <Text style={styles.emptyChatSubtitle}>
                                Estoy aquí para escucharte y ayudarte a procesar tus emociones.
                            </Text>

                            <View style={styles.suggestionsContainer}>
                                {[
                                    '¿Cómo puedo superar a mi ex?',
                                    'Me siento triste hoy',
                                    '¿Es normal extrañar a alguien?',
                                ].map((suggestion, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.suggestion}
                                        onPress={() => setInputText(suggestion)}
                                    >
                                        <Text style={styles.suggestionText}>{suggestion}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {messages.map((msg, index) => (
                        <View
                            key={index}
                            style={[
                                styles.messageBubble,
                                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                            ]}
                        >
                            <Text style={[
                                styles.messageText,
                                msg.role === 'user' ? styles.userText : styles.assistantText,
                            ]}>
                                {msg.content}
                            </Text>
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageBubble, styles.assistantBubble]}>
                            <Text style={styles.typingDots}>●●●</Text>
                        </View>
                    )}
                </ScrollView>

                <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="¿Cómo te sientes hoy?"
                            placeholderTextColor="#6b7280"
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || isTyping}
                        >
                            <Send size={20} color={inputText.trim() ? '#fff' : '#6b7280'} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerSafe: {
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    typingIndicator: {
        fontSize: 12,
        color: '#ec4899',
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    chatContainer: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 8,
    },
    emptyChat: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyChatIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyChatTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    emptyChatSubtitle: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    suggestionsContainer: {
        width: '100%',
        gap: 8,
    },
    suggestion: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    suggestionText: {
        color: '#ec4899',
        fontSize: 15,
        textAlign: 'center',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        marginVertical: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#ec4899',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1f1f1f',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: '#e5e7eb',
    },
    typingDots: {
        color: '#6b7280',
        fontSize: 18,
        letterSpacing: 2,
    },
    inputSafe: {
        backgroundColor: '#0a0a0a',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#1f1f1f',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        maxHeight: 120,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ec4899',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#1f1f1f',
    },
});
