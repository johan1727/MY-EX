import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Brain,
    Menu,
    Send,
    Upload,
    Sparkles,
    Flag,
    Keyboard,
    Mic,
    Plus,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyCheckIn from '@/components/DailyCheckIn';
import StarterPrompts from '@/components/StarterPrompts';
import { storage } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import ReportModal from '@/components/ReportModal';
import ConsentDisclaimer, { AIGeneratedLabel } from '@/components/ConsentDisclaimer';
import ChatHeader, { ChatTheme, CHAT_THEMES } from '@/components/ChatHeader';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useSubscription } from '@/lib/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildEnhancedPrompt, fragmentMessage, calculateInitialDelay } from '@/lib/chatHelpers';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ExProfile {
    id: string;
    exName: string;
    profile: any;
    messageCount: number;
    createdAt: string;
    tokenCount?: number;
    masterPrompt?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    seen?: boolean;
}

export default function MainScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [currentProfile, setCurrentProfile] = useState<ExProfile | null>(null);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [checkInVisible, setCheckInVisible] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [conversationMemory, setConversationMemory] = useState('');
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [reportMessageContent, setReportMessageContent] = useState('');
    const [chatTheme, setChatTheme] = useState<ChatTheme>('default');
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

    // Get subscription status to show upgrade banner
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor'; // survivor is free tier

    useEffect(() => {
        checkUserStatus();
        loadProfile();
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const checkUserStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setIsGuest(!user || user.is_anonymous === true);
    };

    const loadProfile = async () => {
        try {
            // Check if consent was accepted
            const consentAccepted = await storage.getItem('exSimulator_consentAccepted');
            if (!consentAccepted) {
                setShowConsent(true);
            }

            const stored = await storage.getItem('exSimulator_currentProfile');
            if (stored) {
                const profile = JSON.parse(stored);
                setCurrentProfile(profile);

                // Load conversation
                const convKey = `exSimulator_conversation_${profile.id}`;
                const savedConv = await storage.getItem(convKey);
                if (savedConv) {
                    const parsed = JSON.parse(savedConv);
                    // Sanitize messages - fix corrupted {text, delay} objects
                    const sanitizedMessages = parsed.map((m: any) => {
                        let content = m.content;
                        // If content is an object with text property, extract the text
                        if (content && typeof content === 'object' && content.text) {
                            content = content.text;
                        }
                        return {
                            ...m,
                            content: String(content || ''),
                            timestamp: new Date(m.timestamp)
                        };
                    });
                    setMessages(sanitizedMessages);
                }

                // Load memory
                const memKey = `exSimulator_memory_${profile.id}`;
                const savedMem = await storage.getItem(memKey);
                if (savedMem) setConversationMemory(savedMem);
            }

            // Load all profiles for side menu
            const allStored = await storage.getItem('exSimulator_profiles');
            if (allStored) {
                setAllProfiles(JSON.parse(allStored));
            }

            // Check if user has done daily check-in today
            const lastCheckIn = await storage.getItem('last_check_in_date');
            const today = new Date().toDateString();
            if (lastCheckIn !== today) {
                setCheckInVisible(true);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchProfile = async (profileId: string) => {
        setLoading(true);
        try {
            // 1. Find the profile
            const targetProfile = allProfiles.find(p => p.id === profileId);
            if (!targetProfile) return;

            // 2. Save current profile ID
            await storage.setItem('exSimulator_currentProfile', JSON.stringify(targetProfile));
            setCurrentProfile(targetProfile);

            // 3. Load conversation for this profile
            const convKey = `exSimulator_conversation_${profileId}`;
            const savedConv = await storage.getItem(convKey);
            if (savedConv) {
                const parsed = JSON.parse(savedConv);
                // Sanitize messages - fix corrupted {text, delay} objects
                const sanitizedMessages = parsed.map((m: any) => {
                    let content = m.content;
                    // If content is an object with text property, extract the text
                    if (content && typeof content === 'object' && content.text) {
                        content = content.text;
                    }
                    return {
                        ...m,
                        content: String(content || ''),
                        timestamp: new Date(m.timestamp)
                    };
                });
                setMessages(sanitizedMessages);
            } else {
                setMessages([]);
            }

            setSidebarVisible(false);

            // 4. Force reload or re-render if needed (state update should suffice)
            if (Platform.OS === 'web') {
                window.location.reload();
            } else {
                Alert.alert("Perfil cambiado", `Ahora chateas con ${targetProfile.exName}`);
            }

        } catch (error) {
            console.error('Error switching profile:', error);
            setLoading(false);
        };
    };

    const handleEditProfile = async (profileId: string, newName: string) => {
        try {
            // Find and update the profile
            const updatedProfiles = allProfiles.map(p => {
                if (p.id === profileId) {
                    return { ...p, exName: newName };
                }
                return p;
            });

            // Update state
            setAllProfiles(updatedProfiles);

            // Update current profile if it's the one being edited
            if (currentProfile?.id === profileId) {
                const updatedCurrent = { ...currentProfile, exName: newName };
                setCurrentProfile(updatedCurrent);
                await storage.setItem('exSimulator_currentProfile', JSON.stringify(updatedCurrent));
            }

            // Save to storage
            await storage.setItem('exSimulator_allProfiles', JSON.stringify(updatedProfiles));

            haptics.notification(haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error editing profile:', error);
        }
    };

    const handleDeleteProfile = async () => {
        if (!currentProfile) return;

        try {
            // Remove from all profiles
            const updatedProfiles = allProfiles.filter(p => p.id !== currentProfile.id);
            setAllProfiles(updatedProfiles);

            // Clear current profile
            setCurrentProfile(null);
            setMessages([]);

            // Update storage
            await storage.setItem('exSimulator_allProfiles', JSON.stringify(updatedProfiles));
            await storage.removeItem('exSimulator_currentProfile');
            await storage.removeItem(`exSimulator_conversation_${currentProfile.id}`);

            haptics.notification(haptics.NotificationFeedbackType.Success);
            setSidebarVisible(false);
        } catch (error) {
            console.error('Error deleting profile:', error);
        }
    };

    const handleMoodSelect = async (mood: string, color: string) => {
        const today = new Date().toDateString();
        await storage.setItem('last_check_in_date', today);
        setCheckInVisible(false);
        haptics.notification(haptics.NotificationFeedbackType.Success);

        // Optional: Send a lighter message based on mood?
        // For now, just close the modal
        if (currentProfile) {
            Alert.alert("Estado registrado", `Hoy te sientes ${mood}. ¡Gracias por compartir!`);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !currentProfile) return;

        // 1. User message
        const userMsg: Message = {
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date(),
            seen: true, // User sees their own message immediately
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputText('');
        setIsTyping(true);
        haptics.impact(haptics.ImpactFeedbackStyle.Light);

        // Save conversation synchronously
        const convKey = `exSimulator_conversation_${currentProfile.id}`;
        await storage.setItem(convKey, JSON.stringify(newMessages));

        // 2. Prepare context for AI
        const userName = 'Tú'; // The current user
        const context = buildEnhancedPrompt(currentProfile, userName, userMsg.content, newMessages);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const result = await model.generateContent(context);
            const response = result.response;
            const text = response.text();

            // Store new memory summary (simple approach: append last interaction)
            // In a real app, you'd ask the AI to summarize periodically
            const newMemory = conversationMemory + `\nUser: ${userMsg.content}\nEx: ${text}`;
            if (newMemory.length > 2000) {
                // naive truncation
                setConversationMemory(newMemory.slice(-2000));
            } else {
                setConversationMemory(newMemory);
            }
            const memKey = `exSimulator_memory_${currentProfile.id}`;
            await storage.setItem(memKey, newMemory);

            // 3. Fragment message for realism
            const attachmentStyle = currentProfile?.profile?.attachmentStyle || 'seguro';
            const emotionalTone = currentProfile?.profile?.emotionalTone || 'neutral';
            const fragments = fragmentMessage(text, attachmentStyle);

            // 4. Simulate typing and sending delays
            let delayAccumulator = calculateInitialDelay(userMsg.content, attachmentStyle, emotionalTone);

            fragments.forEach((fragment, index) => {
                setTimeout(() => {
                    const assistantMsg: Message = {
                        role: 'assistant',
                        content: fragment.text,
                        timestamp: new Date(),
                        seen: false, // Initially unseen
                    };

                    setMessages(prev => {
                        const updated = [...prev, assistantMsg];
                        storage.setItem(convKey, JSON.stringify(updated));
                        return updated;
                    });

                    haptics.notification(haptics.NotificationFeedbackType.Success);

                    // Mark as seen after a momentary read delay (e.g., 2 seconds)
                    setTimeout(() => {
                        setMessages(prev => prev.map(m =>
                            m === assistantMsg ? { ...m, seen: true } : m
                        ));
                    }, 2000);

                    if (index === fragments.length - 1) {
                        setIsTyping(false);
                    }
                }, delayAccumulator);

                // Add delay for next fragment
                delayAccumulator += fragment.delay || Math.max(1000, fragment.text.length * 50);
            });

        } catch (error) {
            console.error(error);
            setIsTyping(false);
            Alert.alert('Error', 'No se pudo conectar con el simulador.');
        }
    };


    const handleReport = (content: string) => {
        setReportMessageContent(content);
        setShowReport(true);
    };

    const confirmReport = () => {
        // Here you would send the report to Supabase/backend
        Alert.alert("Reporte enviado", "El mensaje ha sido reportado y será revisado.");
        setShowReport(false);
    };

    const handleAcceptConsent = async () => {
        await storage.setItem('exSimulator_consentAccepted', 'true');
        setShowConsent(false);
    };

    const handleNavigate = (path: any) => {
        setSidebarVisible(false);
        router.push(path);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Cargando simulador...</Text>
            </View>
        );
    }

    if (!currentProfile) {
        return (
            <LinearGradient
                colors={['#000000', '#1a1a1a']}
                style={styles.emptyContainer}
            >
                <StatusBar style="light" />

                {/* Upgrade Banner for Free Users */}
                {!isPremium && <UpgradeBanner />}

                <View style={styles.emptyContent}>
                    <View style={styles.iconCircle}>
                        <Brain size={48} color="#fff" />
                    </View>
                    <Text style={styles.emptyTitle}>Simulador de Ex</Text>
                    <Text style={styles.emptySubtitle}>
                        Importa un chat de WhatsApp y deja que la IA recree su personalidad.
                    </Text>

                    <TouchableOpacity
                        style={styles.importButton}
                        onPress={() => router.push('/tools/ex-simulator/import')}
                    >
                        <Upload size={20} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.importButtonText}>Importar Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.historyButton}
                        onPress={() => setSidebarVisible(true)}
                    >
                        <Text style={styles.historyButtonText}>Ver análisis anteriores</Text>
                    </TouchableOpacity>
                </View>

                {/* Sidebar Menu */}
                <Sidebar
                    visible={sidebarVisible}
                    onClose={() => setSidebarVisible(false)}
                    currentProfileId={currentProfile ? (currentProfile as any).id : undefined}
                    allProfiles={allProfiles}
                    onSwitchProfile={handleSwitchProfile}
                    onNavigate={handleNavigate}
                />
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={CHAT_THEMES[chatTheme].background}
                style={styles.background}
            />

            {/* Simple Header with profile */}
            <View style={styles.simpleHeader}>
                <TouchableOpacity
                    style={styles.headerMenuBtn}
                    onPress={() => setSidebarVisible(true)}
                >
                    <Menu size={24} color="#9CA3AF" />
                </TouchableOpacity>
                <View style={styles.headerProfile}>
                    <LinearGradient
                        colors={['#404040', '#171717']}
                        style={styles.headerAvatar}
                    >
                        <Text style={styles.headerAvatarText}>
                            {(currentProfile?.exName || 'E').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{currentProfile?.exName || 'Ex'}</Text>
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Upgrade Banner for Free Users */}
            {!isPremium && <UpgradeBanner />}

            {/* Daily Check-in Modal */}
            <DailyCheckIn
                visible={checkInVisible}
                onClose={() => setCheckInVisible(false)}
                onSelectMood={handleMoodSelect}
            />

            {/* Main Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {messages.length === 0 ? (
                    /* Empty State - Centered Welcome */
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeTitle}>
                            ¿De qué quieres hablar{'\n'}con {currentProfile?.exName || 'tu ex'}?
                        </Text>


                        {/* Centered Input */}
                        <View style={styles.welcomeInputContainer}>
                            <TextInput
                                style={styles.welcomeInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Escribe algo..."
                                placeholderTextColor="#6b7280"
                            />
                            <TouchableOpacity
                                style={[
                                    styles.welcomeSendButton,
                                    inputText.trim() && styles.welcomeSendButtonActive
                                ]}
                                onPress={sendMessage}
                                disabled={!inputText.trim() || isTyping}
                            >
                                <Send size={18} color={inputText.trim() ? '#fff' : '#6b7280'} />
                            </TouchableOpacity>
                        </View>

                        {/* Simple Prompt Buttons */}
                        <View style={styles.promptButtons}>
                            <TouchableOpacity
                                style={styles.promptButton}
                                onPress={() => setInputText('Hola, ¿cómo estás?')}
                            >
                                <Keyboard size={14} color="#fff" />
                                <Text style={styles.promptButtonText}>Iniciar conversación</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.promptButton, styles.promptButtonPurple]}
                                onPress={() => setInputText('Te extraño mucho...')}
                            >
                                <Sparkles size={14} color="#a855f7" />
                                <Text style={[styles.promptButtonText, { color: '#a855f7' }]}>Te extraño</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.promptButton}
                                onPress={() => setInputText('Necesito aclarar algo contigo...')}
                            >
                                <Text style={styles.promptButtonText}>? Aclarar algo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Chat Messages */
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContent}
                    >
                        {messages
                            .filter(msg =>
                                msg.content.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((msg, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.messageRow,
                                        msg.role === 'user' ? styles.userRow : styles.assistantRow
                                    ]}
                                >
                                    {msg.role === 'assistant' && (
                                        <View style={styles.avatarSmall}>
                                            <Text style={styles.avatarLetter}>
                                                {(currentProfile?.exName || 'E').charAt(0)}
                                            </Text>
                                        </View>
                                    )}

                                    <View
                                        style={[
                                            styles.messageBubble,
                                            msg.role === 'user'
                                                ? { backgroundColor: CHAT_THEMES[chatTheme].bubbleUser }
                                                : { backgroundColor: CHAT_THEMES[chatTheme].bubbleEx }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.messageText,
                                            msg.role === 'user'
                                                ? { color: CHAT_THEMES[chatTheme].textUser }
                                                : { color: CHAT_THEMES[chatTheme].textEx }
                                        ]}>
                                            {msg.content}
                                        </Text>
                                        <View style={styles.messageFooter}>
                                            <Text style={[
                                                styles.timestamp,
                                                { color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.5)' }
                                            ]}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {msg.role === 'assistant' && (
                                                <TouchableOpacity
                                                    onPress={() => handleReport(msg.content)}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    <Flag size={12} color="#666" />
                                                </TouchableOpacity>
                                            )}
                                            {msg.role === 'assistant' && (
                                                <View style={{ marginLeft: 6 }}>
                                                    {msg.seen ? (
                                                        <Text style={{ fontSize: 10, color: '#3b82f6' }}>✓✓</Text>
                                                    ) : (
                                                        <Text style={{ fontSize: 10, color: '#666' }}>✓</Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        {isTyping && (
                            <View style={styles.typingIndicator}>
                                <Text style={styles.typingText}>Escribiendo...</Text>
                            </View>
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                )}

                {/* Bottom Input (only when in chat mode) */}
                {messages.length > 0 && (
                    <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
                        <View style={styles.inputContainer}>
                            <TouchableOpacity
                                style={styles.attachButton}
                                onPress={() => router.push('/tools/ex-simulator/import')}
                            >
                                <Plus size={24} color="#9CA3AF" />
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Mensaje..."
                                placeholderTextColor="#6b7280"
                                multiline
                                maxLength={1000}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    !inputText.trim() && { backgroundColor: '#333' }
                                ]}
                                onPress={sendMessage}
                                disabled={isTyping || !inputText.trim()}
                            >
                                <Send size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                )}
            </KeyboardAvoidingView>

            <ConsentDisclaimer
                visible={showConsent}
                onAccept={handleAcceptConsent}
            />

            <ReportModal
                visible={showReport}
                onClose={() => setShowReport(false)}
                messageContent={reportMessageContent}
            />

            <Sidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                profile={currentProfile}
                allProfiles={allProfiles}
                onSelectProfile={handleSwitchProfile}
                onNavigate={handleNavigate}
                onDelete={handleDeleteProfile}
                onEditProfile={handleEditProfile}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    importButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 16,
    },
    importButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    historyButton: {
        padding: 12,
    },
    historyButtonText: {
        color: '#666',
        fontSize: 14,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 20,
    },
    emptyChatState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyChatText: {
        color: '#666',
        fontSize: 16,
        marginBottom: 24,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    userRow: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    assistantRow: {
        alignSelf: 'flex-start',
    },
    avatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 4,
    },
    avatarLetter: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    typingIndicator: {
        padding: 8,
        marginLeft: 36,
    },
    typingText: {
        color: '#666',
        fontSize: 12,
        fontStyle: 'italic',
    },
    inputSafe: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // New styles for centered welcome design
    simpleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerInfo: {
        marginLeft: 12,
    },
    headerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    headerSearchBtn: {
        padding: 8,
    },
    headerMenuBtn: {
        padding: 8,
    },
    welcomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    welcomeTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 32,
    },
    welcomeSubtitle: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 32,
    },
    welcomeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    welcomeInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 8,
    },
    welcomeSendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeSendButtonActive: {
        backgroundColor: '#a855f7',
    },
    promptButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    promptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    promptButtonPurple: {
        borderColor: 'rgba(168,85,247,0.3)',
        backgroundColor: 'rgba(168,85,247,0.1)',
    },
    promptButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
});
