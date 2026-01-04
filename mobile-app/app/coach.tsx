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
    Alert,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Heart, Sparkles, Crown, Image as ImageIcon, X } from 'lucide-react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../lib/storage';
import { useSubscription } from '@/lib/SubscriptionContext';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface Message {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
}

// Free tier limit for Coach
const FREE_COACH_MESSAGE_LIMIT = 15;

export default function CoachScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [dailyMessageCount, setDailyMessageCount] = useState(0);
    const [showLimitWarning, setShowLimitWarning] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor';

    // Get today's date key for storage
    const getTodayKey = () => new Date().toISOString().split('T')[0];

    // Load saved messages and daily count on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load messages
                const saved = await storage.getItem('coach_messages');
                if (saved) {
                    setMessages(JSON.parse(saved));
                }

                // Load daily count
                const countData = await storage.getItem('coach_daily_count');
                if (countData) {
                    const data = JSON.parse(countData);
                    if (data.date === getTodayKey()) {
                        setDailyMessageCount(data.count);
                        if (data.count >= FREE_COACH_MESSAGE_LIMIT - 2) {
                            setShowLimitWarning(true);
                        }
                    } else {
                        // New day, reset
                        await storage.setItem('coach_daily_count', JSON.stringify({ date: getTodayKey(), count: 0 }));
                    }
                }
            } catch (e) {
                console.error('Error loading coach data:', e);
            }
        };
        loadData();
    }, []);

    // Save messages when they change
    useEffect(() => {
        if (messages.length > 0) {
            storage.setItem('coach_messages', JSON.stringify(messages));
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const saveDailyCount = async (count: number) => {
        await storage.setItem('coach_daily_count', JSON.stringify({ date: getTodayKey(), count }));
    };

    // Image picker function
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setSelectedImage(result.assets[0].base64);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    const sendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || isTyping) return;

        // Check free tier limit
        if (!isPremium && dailyMessageCount >= FREE_COACH_MESSAGE_LIMIT) {
            setShowLimitWarning(true);
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: inputText.trim() || '(imagen enviada)',
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        const currentInput = inputText;
        const imageToSend = selectedImage;

        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);

        // Increment count for free tier
        if (!isPremium) {
            const newCount = dailyMessageCount + 1;
            setDailyMessageCount(newCount);
            saveDailyCount(newCount);
            if (newCount >= FREE_COACH_MESSAGE_LIMIT - 2) {
                setShowLimitWarning(true);
            }
        }

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const context = updatedMessages.slice(-6).map(m =>
                `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}${m.image ? ' [imagen]' : ''}`
            ).join('\n');

            let systemPrompt = `Eres un coach de bienestar emocional especializado en relaciones. Tu rol es:
- Escuchar con empatía y sin juzgar
- Ayudar al usuario a procesar sus emociones sobre rupturas
- Dar consejos prácticos pero amables
- Fomentar el autocuidado y crecimiento personal
- NUNCA dar consejos médicos o de salud mental específicos
- Sugerir buscar ayuda profesional cuando sea apropiado

Responde de forma cálida, breve (2-3 oraciones máximo), y en español.

CONTEXTO:
${context}

MENSAJE: "${currentInput || '(El usuario envió una imagen)'}"
${imageToSend ? '\nNOTA: El usuario te está enviando una imagen. Describe brevemente tu observación y responde de forma empática.' : ''}

RESPONDE:`;

            let result;
            if (imageToSend) {
                // Multimodal request with image
                const promptParts = [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageToSend
                        }
                    }
                ];
                result = await model.generateContent(promptParts as any);
            } else {
                result = await model.generateContent(systemPrompt);
            }

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

    const remainingMessages = Math.max(0, FREE_COACH_MESSAGE_LIMIT - dailyMessageCount);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={22} color="#9ca3af" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Coach IA</Text>
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
                            <View style={styles.emptyChatIcon}>
                                <Heart size={28} color="#ec4899" />
                            </View>
                            <Text style={styles.emptyChatTitle}>Coach de Bienestar</Text>
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
                                styles.messageRow,
                                msg.role === 'user' ? styles.userRow : styles.assistantRow,
                            ]}
                        >
                            {msg.role === 'assistant' && (
                                <View style={styles.avatarSmall}>
                                    <Sparkles size={14} color="#ec4899" />
                                </View>
                            )}
                            <View style={[
                                styles.messageBubble,
                                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                            ]}>
                                {/* Display image if present */}
                                {msg.image && (
                                    <Image
                                        source={{ uri: msg.image }}
                                        style={styles.messageImage}
                                        resizeMode="cover"
                                    />
                                )}
                                {msg.content && msg.content !== '(imagen enviada)' ? (
                                    <Text style={[
                                        styles.messageText,
                                        msg.role === 'user' ? styles.userText : styles.assistantText,
                                    ]}>
                                        {msg.content}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageRow, styles.assistantRow]}>
                            <View style={styles.avatarSmall}>
                                <Sparkles size={14} color="#ec4899" />
                            </View>
                            <View style={[styles.messageBubble, styles.assistantBubble]}>
                                <Text style={styles.typingDots}>...</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Limit Warning Banner */}
                {showLimitWarning && !isPremium && (
                    <View style={styles.limitBanner}>
                        <View style={styles.limitBannerContent}>
                            <Crown size={18} color="#f59e0b" />
                            <Text style={styles.limitBannerText}>
                                {remainingMessages > 0
                                    ? `Te quedan ${remainingMessages} mensajes hoy`
                                    : 'Has alcanzado el límite diario'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.limitBannerBtn}
                            onPress={() => router.push('/premium')}
                        >
                            <Text style={styles.limitBannerBtnText}>Mejorar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input Area */}
                <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
                    {/* Image Preview */}
                    {selectedImage && (
                        <View style={styles.imagePreviewContainer}>
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                                style={styles.imagePreview}
                            />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setSelectedImage(null)}
                            >
                                <X size={12} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputContainer}>
                        <View style={styles.geminiInputWrapper}>
                            {/* Image picker button */}
                            <TouchableOpacity
                                style={styles.inputActionButton}
                                onPress={pickImage}
                            >
                                <ImageIcon size={22} color="#888" />
                            </TouchableOpacity>

                            {/* Text Input */}
                            <TextInput
                                style={styles.geminiInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="¿Cómo te sientes hoy?"
                                placeholderTextColor="#666"
                                multiline
                                maxLength={1000}
                                editable={isPremium || remainingMessages > 0}
                            />

                            {/* Send Button */}
                            <TouchableOpacity
                                style={[
                                    styles.geminiSendButton,
                                    ((inputText.trim() || selectedImage) && (isPremium || remainingMessages > 0)) && styles.geminiSendButtonActive
                                ]}
                                onPress={sendMessage}
                                disabled={(!inputText.trim() && !selectedImage) || isTyping || (!isPremium && remainingMessages === 0)}
                            >
                                <Send size={18} color={(inputText.trim() || selectedImage) && (isPremium || remainingMessages > 0) ? '#fff' : '#555'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#171717',
    },
    headerSafe: {
        backgroundColor: '#171717',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
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
        paddingTop: 60,
    },
    emptyChatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyChatTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    emptyChatSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 32,
        lineHeight: 20,
    },
    suggestionsContainer: {
        width: '100%',
        gap: 8,
    },
    suggestion: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    suggestionText: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        maxWidth: '85%',
    },
    userRow: {
        alignSelf: 'flex-end',
    },
    assistantRow: {
        alignSelf: 'flex-start',
    },
    avatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 2,
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    userBubble: {
        backgroundColor: '#3b82f6',
    },
    assistantBubble: {
        backgroundColor: '#2a2a2a',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 21,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: '#e5e7eb',
    },
    typingDots: {
        color: '#6b7280',
        fontSize: 16,
    },
    limitBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(245, 158, 11, 0.3)',
    },
    limitBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    limitBannerText: {
        color: '#f59e0b',
        fontSize: 13,
    },
    limitBannerBtn: {
        backgroundColor: '#f59e0b',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    limitBannerBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '600',
    },
    inputSafe: {
        backgroundColor: '#171717',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#fff',
        maxHeight: 100,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#2a2a2a',
    },
    // Image related styles
    imagePreviewContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        left: 76,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        padding: 4,
    },
    imageButton: {
        padding: 8,
        marginRight: 4,
    },
    // Gemini-style input styles
    geminiInputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#1a1a2e',
        borderRadius: 28,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#333',
        gap: 8,
    },
    inputActionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    geminiInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        maxHeight: 120,
        paddingVertical: 10,
        paddingHorizontal: 4,
        lineHeight: 22,
    },
    geminiSendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    geminiSendButtonActive: {
        backgroundColor: '#7c3aed',
    },
    messageImage: {
        width: '100%',
        maxWidth: 180,
        height: 150,
        borderRadius: 10,
        marginBottom: 4,
    },
});
