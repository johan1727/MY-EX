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
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    Image as ImageIcon,
    X,
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
import { loadProfiles, deleteProfile } from '@/lib/profileSync';
import { syncConversation, saveConversationToCloud } from '@/lib/conversationSync';

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
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    seen?: boolean;
    image?: string;
}

export default function MainScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [currentProfile, setCurrentProfile] = useState<ExProfile | null>(null);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [checkInVisible, setCheckInVisible] = useState(false);
    const [showAIDisclaimer, setShowAIDisclaimer] = useState(false);
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
    const [dailyMessageCount, setDailyMessageCount] = useState(0);
    const [showLimitWarning, setShowLimitWarning] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showGuestBanner, setShowGuestBanner] = useState(false); // Registration banner for guests

    // Get subscription status to show upgrade banner
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor'; // survivor is free tier

    // Free tier limits
    const FREE_MESSAGE_LIMIT = 5;

    // Get today's date key for storage
    const getTodayKey = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    useEffect(() => {
        checkUserStatus();
        loadProfile();
        loadDailyMessageCount();

        // Safety timeout - if still loading after 10s, force completion
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn('[MainScreen] Safety timeout triggered - forcing load completion');
                setLoading(false);
            }
        }, 10000);

        return () => clearTimeout(safetyTimeout);
    }, []);

    // Load daily message count from storage
    const loadDailyMessageCount = async () => {
        try {
            const stored = await storage.getItem('daily_message_count');
            if (stored) {
                const data = JSON.parse(stored);
                // Check if it's from today
                if (data.date === getTodayKey()) {
                    setDailyMessageCount(data.count);
                    if (data.count >= FREE_MESSAGE_LIMIT - 1) {
                        setShowLimitWarning(true);
                    }
                } else {
                    // New day, reset count
                    await storage.setItem('daily_message_count', JSON.stringify({ date: getTodayKey(), count: 0 }));
                    setDailyMessageCount(0);
                }
            }
        } catch (e) {
            console.error('Error loading daily message count:', e);
        }
    };

    // Save daily message count to storage
    const saveDailyMessageCount = async (count: number) => {
        try {
            await storage.setItem('daily_message_count', JSON.stringify({ date: getTodayKey(), count }));
        } catch (e) {
            console.error('Error saving daily message count:', e);
        }
    };

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

                // Get current user for cloud sync
                const { data: { user } } = await supabase.auth.getUser();

                // Load conversation with cloud sync
                const convKey = `exSimulator_conversation_${profile.id}`;
                const savedConv = await storage.getItem(convKey);

                let localMessages: any[] = [];
                if (savedConv) {
                    const parsed = JSON.parse(savedConv);
                    localMessages = parsed.map((m: any) => {
                        let content = m.content;
                        if (content && typeof content === 'object' && content.text) {
                            content = content.text;
                        }
                        return {
                            ...m,
                            content: String(content || ''),
                            timestamp: new Date(m.timestamp)
                        };
                    });
                }

                // Sync with cloud if user is logged in
                if (user && !user.is_anonymous) {
                    console.log('[MainScreen] Syncing conversation with cloud...');
                    const { messages: syncedMessages } = await syncConversation(
                        user.id,
                        profile.id,
                        localMessages
                    );
                    // Convert timestamps from number to Date
                    const messagesWithDates = syncedMessages.map(m => ({
                        ...m,
                        timestamp: typeof m.timestamp === 'number' ? new Date(m.timestamp) : m.timestamp
                    }));
                    setMessages(messagesWithDates as Message[]);
                    console.log(`[MainScreen] ✅ Loaded ${syncedMessages.length} messages (synced with cloud)`);
                } else {
                    // Guest mode - use local only
                    setMessages(localMessages);
                    console.log(`[MainScreen] ✅ Loaded ${localMessages.length} messages (local only - guest mode)`);
                }

                // Load memory
                const memKey = `exSimulator_memory_${profile.id}`;
                const savedMem = await storage.getItem(memKey);
                if (savedMem) setConversationMemory(savedMem);
            }

            // Load all profiles for side menu (from cloud if logged in)
            const { data: { user } } = await supabase.auth.getUser();
            const profiles = await loadProfiles(user?.id);
            console.log('[DEBUG] Loaded profiles (local+cloud):', profiles.length);
            console.log('[DEBUG] Profiles:', profiles.map((p: any) => p.exName));
            setAllProfiles(profiles);

            // If we have profiles from cloud but no current profile, set the first one
            if (profiles.length > 0 && !stored) {
                const firstProfile = profiles[0];
                setCurrentProfile(firstProfile);
                await storage.setItem('exSimulator_currentProfile', JSON.stringify(firstProfile));
            }

            // Check if user has done daily check-in today
            const lastCheckIn = await storage.getItem('last_check_in_date');
            const today = new Date().toDateString();
            if (lastCheckIn !== today) {
                setCheckInVisible(true);
            }

            // Show sidebar on first visit to help users discover features
            const hasSeenSidebar = await storage.getItem('hasSeenSidebar');
            if (!hasSeenSidebar) {
                setSidebarVisible(true);
                await storage.setItem('hasSeenSidebar', 'true');
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchProfile = async (profileOrId: any) => {
        // Accept either a profile object or just an ID
        const profileId = typeof profileOrId === 'string' ? profileOrId : profileOrId?.id;
        const profileFromParam = typeof profileOrId === 'object' ? profileOrId : null;

        console.log('[handleSwitchProfile] ========= INICIANDO CAMBIO DE PERFIL =========');
        console.log('[handleSwitchProfile] Target profile ID:', profileId);
        setLoading(true);
        try {
            // 0. PRIMERO: Guardar conversación actual si existe
            if (currentProfile && messages.length > 0) {
                console.log('[handleSwitchProfile] Guardando conversación actual antes de cambiar...');
                const currentConvKey = `exSimulator_conversation_${currentProfile.id}`;
                await storage.setItem(currentConvKey, JSON.stringify(messages));
                console.log('[handleSwitchProfile] ✅ Conversación guardada:', messages.length, 'mensajes');
            }

            // 1. Find the profile (or use the one passed directly)
            let targetProfile = profileFromParam;
            if (!targetProfile) {
                console.log('[handleSwitchProfile] Buscando en', allProfiles.length, 'perfiles...');
                targetProfile = allProfiles.find(p => p.id === profileId);
            }

            if (!targetProfile) {
                console.error('[handleSwitchProfile] ❌ Perfil NO encontrado:', profileId);
                console.log('[handleSwitchProfile] IDs disponibles:', allProfiles.map(p => p.id));
                setLoading(false);
                return;
            }
            console.log('[handleSwitchProfile] ✅ Perfil encontrado:', targetProfile.exName);

            // 2. Save current profile ID
            await storage.setItem('exSimulator_currentProfile', JSON.stringify(targetProfile));
            setCurrentProfile(targetProfile);
            console.log('[handleSwitchProfile] ✅ Perfil actual actualizado en storage');

            // 3. Load conversation for this profile
            const convKey = `exSimulator_conversation_${profileId}`;
            console.log('[handleSwitchProfile] Cargando conversación con key:', convKey);
            const savedConv = await storage.getItem(convKey);

            if (savedConv) {
                const parsed = JSON.parse(savedConv);
                console.log('[handleSwitchProfile] ✅ Conversación encontrada:', parsed.length, 'mensajes');
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
                console.log('[handleSwitchProfile] ⚠️ Sin conversación previa - iniciando vacío');
                setMessages([]);
            }

            // 4. Load memory for this profile
            const memKey = `exSimulator_memory_${profileId}`;
            const savedMem = await storage.getItem(memKey);
            if (savedMem) {
                setConversationMemory(savedMem);
                console.log('[handleSwitchProfile] ✅ Memoria cargada');
            } else {
                setConversationMemory('');
                console.log('[handleSwitchProfile] ⚠️ Sin memoria previa');
            }

            setSidebarVisible(false);
            console.log('[handleSwitchProfile] ========= CAMBIO COMPLETADO =========');

            // Profile switched silently - no alert needed
            setLoading(false);

        } catch (error) {
            console.error('[handleSwitchProfile] ❌ ERROR:', error);
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

    const handleDeleteProfileById = async (profileId: string) => {
        try {
            const profileToDelete = allProfiles.find(p => p.id === profileId);
            if (!profileToDelete) return;

            // Remove from all profiles (UI update first)
            const updatedProfiles = allProfiles.filter(p => p.id !== profileId);
            setAllProfiles(updatedProfiles);

            // If deleting current profile, switch to another or clear
            if (currentProfile?.id === profileId) {
                if (updatedProfiles.length > 0) {
                    setCurrentProfile(updatedProfiles[0]);
                    await storage.setItem('exSimulator_currentProfile', JSON.stringify(updatedProfiles[0]));
                } else {
                    setCurrentProfile(null);
                    await storage.removeItem('exSimulator_currentProfile');
                }
                setMessages([]);
            }

            // Delete from both local and cloud using profileSync
            await deleteProfile(profileId, profileToDelete.supabaseId);

            // Also remove conversation
            await storage.removeItem(`exSimulator_conversation_${profileId}`);

            console.log('[Index] ✅ Profile deleted:', profileId);
            haptics.notification(haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error deleting profile by ID:', error);
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
        if ((!inputText.trim() && !selectedImage) || !currentProfile) return;

        // Check free tier limit
        if (!isPremium && dailyMessageCount >= FREE_MESSAGE_LIMIT) {
            setShowLimitWarning(true);
            return;
        }

        // 1. User message
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date(),
            seen: true, // User sees their own message immediately
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

        const textToSend = inputText;
        const imageToSend = selectedImage;

        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);
        haptics.impact(haptics.ImpactFeedbackStyle.Light);

        // Increment message count for free tier and persist
        if (!isPremium) {
            const newCount = dailyMessageCount + 1;
            setDailyMessageCount(newCount);
            saveDailyMessageCount(newCount);

            // Show warning when approaching limit
            if (newCount >= FREE_MESSAGE_LIMIT - 1) {
                setShowLimitWarning(true);
            }
        }

        // Save conversation synchronously
        const convKey = `exSimulator_conversation_${currentProfile.id}`;
        await storage.setItem(convKey, JSON.stringify(newMessages));

        // 2. Prepare context for AI
        const userName = 'Tú'; // The current user
        let contextPrompt = buildEnhancedPrompt(currentProfile, userName, userMsg.content || '(imagen enviada)', newMessages);

        // Add image context to prompt if image was sent
        if (imageToSend) {
            contextPrompt += '\n\nNOTA: El usuario te está enviando una imagen. Describe brevemente tu reacción a la imagen y responde de forma natural PUEDES COMENTAR TAMBIEN ALGO.';
        }

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            let result;

            // Send multimodal if image exists
            if (imageToSend) {
                const promptParts = [
                    { text: contextPrompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageToSend
                        }
                    }
                ];
                result = await model.generateContent(promptParts as any);
            } else {
                result = await model.generateContent(contextPrompt);
            }

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

                        // Auto-save to cloud when conversation updates (only on last fragment)
                        if (index === fragments.length - 1 && !isGuest && currentProfile) {
                            const cloudMessages = updated.map(m => ({
                                role: m.role,
                                content: typeof m.content === 'string' ? m.content : String(m.content),
                                timestamp: typeof m.timestamp === 'number' ? m.timestamp : m.timestamp.getTime()
                            }));
                            const profileCloudId = (currentProfile as any).supabaseId || currentProfile.id;
                            supabase.auth.getUser().then(({ data }) => {
                                if (data?.user?.id) {
                                    saveConversationToCloud(data.user.id, profileCloudId, cloudMessages);
                                }
                            });
                        }

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

                // Add realistic typing delay (max 5 seconds)
                // Formula: 500ms base + (20ms per character) = more natural
                // Short message (50 chars) = 500ms + 1000ms = 1.5s
                // Long message (200 chars) = 500ms + 4000ms = 4.5s
                const baseDelay = 500; // Base thinking time
                const charDelay = 20; // ms per character (simular tipeo)
                const calculatedDelay = baseDelay + (fragment.text.length * charDelay);
                const realisticDelay = Math.min(calculatedDelay, 5000); // Cap at 5 seconds
                delayAccumulator += fragment.delay || realisticDelay;
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
        // Add '/' prefix if not present for proper routing
        const route = path.startsWith('/') ? path : `/${path}`;
        router.push(route);
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

                {/* Header with Menu Button */}
                <SafeAreaView edges={['top']} style={styles.emptyHeaderSafe}>
                    <View style={styles.emptyHeader}>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => setSidebarVisible(true)}
                        >
                            <Menu size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                        {!isPremium && <UpgradeBanner variant="header" />}
                    </View>
                </SafeAreaView>

                <View style={styles.emptyContent}>
                    <View style={styles.iconCircle}>
                        <Brain size={48} color="#fff" />
                    </View>
                    <Text style={styles.emptyTitle}>Simulador</Text>
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
                    profile={null}
                    allProfiles={allProfiles}
                    onSelectProfile={handleSwitchProfile}
                    onNavigate={handleNavigate}
                    onDelete={() => { }}
                    isPremium={isPremium}
                    isGuest={isGuest}
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

            {/* Simple Header with profile - wrapped in SafeAreaView */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
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
            </SafeAreaView>

            {/* Limit Warning for Free Users */}
            {showLimitWarning && !isPremium && (
                <UpgradeBanner
                    variant="limit-warning"
                    remainingMessages={Math.max(0, FREE_MESSAGE_LIMIT - dailyMessageCount)}
                    onDismiss={() => setShowLimitWarning(false)}
                />
            )}

            {/* Upgrade Banner for Free Users */}
            {!isPremium && !showLimitWarning && <UpgradeBanner />}

            {/* Daily Check-in Modal - DISABLED for now
            <DailyCheckIn
                visible={checkInVisible}
                onClose={() => setCheckInVisible(false)}
                onSelectMood={handleMoodSelect}
            />
            */}

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
                                <Flag size={14} color="#fff" />
                                <Text style={styles.promptButtonText}>Aclarar algo</Text>
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
                                        {/* Display image if present */}
                                        {msg.image && (
                                            <Image
                                                source={{ uri: msg.image }}
                                                style={styles.messageImage}
                                                resizeMode="cover"
                                            />
                                        )}
                                        {msg.content ? (
                                            <Text style={[
                                                styles.messageText,
                                                msg.role === 'user'
                                                    ? { color: CHAT_THEMES[chatTheme].textUser }
                                                    : { color: CHAT_THEMES[chatTheme].textEx }
                                            ]}>
                                                {msg.content}
                                            </Text>
                                        ) : null}
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
                            {/* Image picker button */}
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={pickImage}
                            >
                                <ImageIcon size={22} color="#9ca3af" />
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
                                    (!inputText.trim() && !selectedImage) && { backgroundColor: '#333' }
                                ]}
                                onPress={sendMessage}
                                disabled={isTyping || (!inputText.trim() && !selectedImage)}
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
                onDeleteProfile={handleDeleteProfileById}
                onEditProfile={handleEditProfile}
                isPremium={isPremium}
                isGuest={isGuest}
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
    emptyHeaderSafe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    emptyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        marginTop: -60,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
        maxWidth: 280,
    },
    importButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    importButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
    historyButton: {
        padding: 10,
    },
    historyButtonText: {
        color: '#6b7280',
        fontSize: 13,
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
        fontSize: 11,
        fontWeight: '600',
    },
    messageBubble: {
        padding: 14,
        borderRadius: 16,
    },
    messageText: {
        fontSize: 15,
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
        color: '#6b7280',
        fontSize: 12,
        fontStyle: 'italic',
    },
    inputSafe: {
        backgroundColor: '#171717',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // New styles for centered welcome design
    headerSafe: {
        backgroundColor: 'transparent',
    },
    simpleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    headerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    headerInfo: {
        marginLeft: 10,
    },
    headerName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
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
    // Image picker styles
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
    messageImage: {
        width: '100%',
        maxWidth: 180,
        height: 150,
        borderRadius: 10,
        marginBottom: 4,
    },
});
