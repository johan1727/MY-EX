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
    Image,
    Modal,
    Alert,
} from 'react-native';
import AIReportModal from '../components/AIReportModal';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Heart, Sparkles, Crown, Image as ImageIcon, X, HelpCircle, LogOut, Flag, MoreVertical, Moon, Sun, Menu } from 'lucide-react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import UpgradeBanner from '../components/UpgradeBanner';
import ProfileDrawer from '../components/ProfileDrawer';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/i18n';
import { reportAIContent } from '../lib/aiContentModeration';

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
    const { isDark, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const scrollViewRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportData, setReportData] = useState({ id: '', content: '' });
    const [userId, setUserId] = useState<string>('');
    const [drawerVisible, setDrawerVisible] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.id) setUserId(data.user.id);
        });
    }, []);


    const handleReport = (msg: any, index: number) => {
        setReportData({ id: `coach_msg_${index}`, content: msg.content });
        setReportModalVisible(true);
    };
    const [dailyMessageCount, setDailyMessageCount] = useState(0);
    const [showLimitWarning, setShowLimitWarning] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Custom Alert State
    interface AlertConfig {
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' | 'confirm' }[];
        type?: 'success' | 'error' | 'info' | 'warning';
    }
    const [customAlert, setCustomAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons'], type: AlertConfig['type'] = 'info') => {
        setCustomAlert({
            visible: true,
            title,
            message,
            buttons,
            type
        });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

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
            showAlert('Error', 'No se pudo seleccionar la imagen', [{ text: 'OK' }], 'error');
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

            let systemPrompt = `Eres un coach experto en rupturas amorosas llamada "Ana". 
            Tu objetivo es ayudar al usuario a procesar su ruptura, validar sus emociones y darle consejos prácticos.
            Usa la información del análisis del chat para dar consejos personalizados si es relevante.
            Responde de forma cálida, breve (2-3 oraciones máximo), y en ${language === 'es' ? 'español' : 'inglés'}.

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
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={[styles.headerSafe, isDark && styles.headerSafeDark]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }}
                        style={[styles.backButton, isDark && styles.backButtonDark]}
                    >
                        <ArrowLeft size={22} color={isDark ? "#fff" : "#9ca3af"} />
                    </TouchableOpacity>

                    {/* Hamburger Menu in Coach Screen */}
                    <TouchableOpacity
                        onPress={() => setDrawerVisible(true)}
                        style={[styles.backButton, isDark && styles.backButtonDark, { marginLeft: 8 }]}
                    >
                        <Menu size={22} color={isDark ? "#fff" : "#9ca3af"} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000', marginLeft: 12 }]}>{t('coach_title')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
                            {isDark ? <Sun size={22} color="#fff" /> : <Moon size={22} color="#374151" />}
                        </TouchableOpacity>
                        {isPremium ? (
                            <View style={styles.headerSpacer} />
                        ) : (
                            <View style={styles.headerRight}>
                                <UpgradeBanner variant="header" />
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView >

            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                >
                    {messages.length === 0 && (
                        <View style={styles.emptyChat}>
                            <View style={styles.emptyChatIcon}>
                                <Heart size={28} color="#ec4899" />
                            </View>
                            <Text style={[styles.emptyChatTitle, { color: isDark ? '#fff' : '#000' }]}>{t('coach_wellness_title')}</Text>
                            <Text style={[styles.emptyChatSubtitle, { color: isDark ? '#ccc' : '#666' }]}>
                                {t('coach_subtitle')}
                            </Text>

                            <View style={styles.suggestionsContainer}>
                                {[
                                    t('coach_suggestion1'),
                                    t('coach_suggestion2'),
                                    t('coach_suggestion3'),
                                ].map((suggestion, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.suggestion, isDark && { backgroundColor: '#1f2937', borderColor: '#374151' }]}
                                        onPress={() => setInputText(suggestion)}
                                    >
                                        <Text style={[styles.suggestionText, { color: isDark ? '#ccc' : '#555' }]}>{suggestion}</Text>
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
                                    <Sparkles size={14} color="#a855f7" />
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' }}>
                                <View style={[
                                    styles.messageBubble,
                                    msg.role === 'user' ? styles.userBubble : [styles.assistantBubble, isDark && { backgroundColor: '#1f2937', borderColor: '#374151' }],
                                    { maxWidth: msg.role === 'assistant' ? '78%' : '75%' }
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
                                            msg.role === 'user' ? styles.userText : [styles.assistantText, !isDark && { color: '#111' }],
                                        ]}>
                                            {msg.content}
                                        </Text>
                                    ) : null}
                                </View>

                                {msg.role === 'assistant' && (
                                    <TouchableOpacity
                                        onPress={() => handleReport(msg, index)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        style={{ marginLeft: 4, marginBottom: 4 }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <MoreVertical size={16} color="#6b7280" />
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}

                    {isTyping && (
                        <View style={[styles.messageRow, styles.assistantRow]}>
                            <View style={styles.avatarSmall}>
                                <Sparkles size={14} color="#a855f7" />
                            </View>
                            <View style={[styles.messageBubble, styles.assistantBubble]}>
                                <Text style={styles.typingDots}>...</Text>
                            </View>
                        </View>
                    )}
                    <AIReportModal
                        visible={reportModalVisible}
                        onClose={() => setReportModalVisible(false)}
                        messageId={reportData.id}
                        content={reportData.content}
                        context="coach"
                        userId="current_user_id"
                    />
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
                            onPress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                        >
                            <Text style={styles.limitBannerBtnText}>Mejorar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input Area */}
                <SafeAreaView edges={['bottom']} style={[styles.inputSafe, isDark && styles.inputSafeDark]}>
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

                    {/* Message Preview - Shows while typing */}
                    {inputText.trim() !== '' && (
                        <View style={styles.messagePreviewContainer}>
                            <View style={styles.messagePreviewBubble}>
                                <Text style={styles.messagePreviewText} numberOfLines={3}>
                                    {inputText}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        {/* Image picker button */}
                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={pickImage}
                        >
                            <ImageIcon size={22} color="#9ca3af" />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, isDark && { color: '#fff', backgroundColor: '#1f2937', borderColor: '#374151' }]}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={t('coach_placeholder')}
                            placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                            multiline
                            maxLength={1000}
                            editable={isPremium || remainingMessages > 0}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, ((!inputText.trim() && !selectedImage) || (!isPremium && remainingMessages === 0)) && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={(!inputText.trim() && !selectedImage) || isTyping || (!isPremium && remainingMessages === 0)}
                        >
                            <Send size={18} color={(inputText.trim() || selectedImage) && (isPremium || remainingMessages > 0) ? '#000' : '#6b7280'} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>

            {/* Custom Alert Modal */}
            <Modal
                transparent
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <View style={[
                            styles.alertIconContainer,
                            customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {customAlert.type === 'error' && <X size={32} color="#ef4444" />}
                            {customAlert.type === 'warning' && <LogOut size={32} color="#f59e0b" />}
                            {customAlert.type === 'success' && <Sparkles size={32} color="#22c55e" />}
                            {customAlert.type === 'info' && <HelpCircle size={32} color="#3b82f6" />}
                        </View>
                        <Text style={styles.alertTitle}>{customAlert.title}</Text>
                        <Text style={styles.alertMessage}>
                            {customAlert.message}
                        </Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertButtonPrimary]}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.alertButton,
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'destructive' ? styles.alertButtonDestructive :
                                                    styles.alertButtonPrimary
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            else closeAlert();
                                        }}
                                    >
                                        <Text style={[
                                            styles.alertButtonText,
                                            btn.style === 'destructive' && { color: '#ef4444' }
                                        ]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Profile Drawer */}
            <ProfileDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                // Use current user/profile data if available, or guest
                currentProfileId={null}
                onProfileSwitch={(profile) => {
                    setDrawerVisible(false);
                    // Handle switch - Navigate to chat with this profile
                    router.replace('/'); // Go home which usually loads current profile
                    setTimeout(() => {
                        // Logic to switch profile is handled inside drawer usually, 
                        // but we might need to ensure the app reloads the new profile.
                        // For now, replacing to root index is safest.
                    }, 100);
                }}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    headerSafe: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerSafeDark: {
        backgroundColor: '#000000',
        borderBottomColor: '#1f2937',
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
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    backButtonDark: {
        backgroundColor: '#1f2937',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111827',
        letterSpacing: 0.5,
    },
    headerSpacer: {
        width: 40,
    },
    headerRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    chatContainer: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 20,
    },
    emptyChat: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyChatIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
    },
    emptyChatTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    emptyChatSubtitle: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 40,
        lineHeight: 22,
    },
    suggestionsContainer: {
        width: '100%',
        gap: 12,
        paddingHorizontal: 20,
    },
    suggestion: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    suggestionText: {
        color: '#374151',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    userRow: {
        alignSelf: 'flex-end',
    },
    assistantRow: {
        alignSelf: 'flex-start',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
    },
    messageBubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#111827',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#f3f4f6',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
    },
    userText: {
        color: '#fff',
    },
    assistantText: {
        color: '#111827',
    },
    typingDots: {
        color: '#9ca3af',
        fontSize: 16,
        letterSpacing: 2,
    },
    limitBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(245, 158, 11, 0.2)',
    },
    limitBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    limitBannerText: {
        color: '#fbbf24',
        fontSize: 13,
        fontWeight: '500',
    },
    limitBannerBtn: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    limitBannerBtnText: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputSafe: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    inputSafeDark: {
        backgroundColor: '#000000',
        borderTopColor: '#1f2937',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        shadowOpacity: 0,
        elevation: 0,
    },
    imagePreviewContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        left: 104,
        backgroundColor: '#ef4444',
        borderRadius: 12,
        padding: 6,
        borderWidth: 1,
        borderColor: '#fff',
    },
    imageButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    messageImage: {
        width: '100%',
        maxWidth: 220,
        height: 180,
        borderRadius: 14,
        marginBottom: 6,
    },
    messagePreviewContainer: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    messagePreviewBubble: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomRightRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    messagePreviewText: {
        color: '#e5e7eb',
        fontSize: 14,
        lineHeight: 20,
    },
    // Custom Alert Styles
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    alertIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    alertMessage: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    alertButtonPrimary: {
        backgroundColor: '#3b82f6',
    },
    alertButtonCancel: {
        backgroundColor: '#333',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    alertButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
