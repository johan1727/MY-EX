import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Modal, Alert, KeyboardAvoidingView, Image, Animated, Keyboard, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fragmentMessage, calculateInitialDelay, buildEnhancedPrompt } from '../../lib/chatHelpers';
import { loadMasterPrompt } from '../../lib/masterPromptSupabase';
import { storage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { checkProhibitedContent } from '../../lib/contentModeration';
import { Send, Sparkles, ImageIcon, Brain, Menu, Flag, MoreVertical, Zap, Headphones, AudioLines, Sun, Moon, Crown } from 'lucide-react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
import { useTheme } from '../../lib/ThemeContext';
import { reportAIContent } from '../../lib/aiContentModeration';
import ChatHeader, { CHAT_THEMES, ChatTheme } from '../../components/ChatHeader';
import SuggestionBanner from '../../components/SuggestionBanner';
import { StatusBar } from 'expo-status-bar';
import ProfileDrawer from '../../components/ProfileDrawer';
import AIReportModal from '../../components/AIReportModal';
import * as ImagePicker from 'expo-image-picker';
import EnergyRechargeModal from '../../components/EnergyRechargeModal';
import InsightTeaserModal from '../../components/InsightTeaserModal'; // New Modal
import { useLanguage } from '../../lib/i18n';

import {
    loadConversationFromCloud,
    saveConversationToCloud,
    loadFacts,
    extractAndSaveFacts,
    buildFactsContext,
    detectMemoryCommand,
    saveExplicitFact,
    MemoryFact
} from '../../lib/memoryService';
import {
    searchSimilarMessages,
    storeMessageEmbedding,
    buildRAGContext,
    getSummaries,
    buildSummaryContext,
    createSessionSummary,
    applyMemoryDecay,
    SimilarMessage
} from '../../lib/ragService';

import {
    getOrCreateSession,
    processUserMessage as processEmotionalMessage,
    saveSession
} from '../../lib/simulationEngine';
import { SimulationSession } from '../../lib/simulationState';
import { refineProfileWithChat } from '../../lib/exSimulator';
import { checkDefensiveTrigger } from '../../lib/defensiveTopicsDetector';
import { checkJealousyTrigger } from '../../lib/jealousyDetector';
import { generateChatResponse } from '../../lib/edgeFunctions';
import { retrieveRelevantMemories, detectDetailedEmotion } from '../../lib/emotionalRAG';

console.log('[ExChat] Using secure Edge Functions for AI');

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
    seen?: boolean;
    imageUri?: string; // For photo attachments
}

export default function ExSimulatorChat() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const scrollViewRef = useRef<ScrollView>(null);
    const [profileData, setProfileData] = useState<any>(null);

    // Check subscription for premium banner
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor'; // Assuming survivor is free
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportData, setReportData] = useState({ id: '', content: '' });
    const [suggestionBanner, setSuggestionBanner] = useState<{ visible: boolean; message: string; icon: string } | null>(null);

    // Use Global Theme Context
    const { isDark, toggleTheme } = useTheme();
    const { t } = useLanguage();

    const handleReport = (msg: any, index: number) => {
        setReportData({ id: `sim_msg_${index}`, content: msg.content });
        setReportModalVisible(true);
    };
    const [userName, setUserName] = useState('');
    const [conversationMemory, setConversationMemory] = useState<string>('');
    const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.id) setUserId(data.user.id);
        });
    }, []);
    const [pastSummaries, setPastSummaries] = useState<string>(''); // RAG: past conversation summaries

    // NEW: Emotional simulation state
    const [emotionalSession, setEmotionalSession] = useState<SimulationSession | null>(null);
    const [typingDelay, setTypingDelay] = useState<number>(2000);

    // NEW: Limits and modals
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showEnergyModal, setShowEnergyModal] = useState(false);
    const [energyWaitTime, setEnergyWaitTime] = useState(0);
    const [showInsightTeaser, setShowInsightTeaser] = useState(false); // New State
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showVoiceUpgradeModal, setShowVoiceUpgradeModal] = useState(false);
    const [hasShownLoginPrompt, setHasShownLoginPrompt] = useState(false);
    const [usageData, setUsageData] = useState<{ allowed: boolean, reason?: 'daily' | 'burst', waitTime?: number, dailyCount?: number } | null>(null);
    // Theme state
    const [chatTheme, setChatTheme] = useState<ChatTheme>('default');

    // Drawer state
    const [drawerVisible, setDrawerVisible] = useState(false);

    // FREE USER LIMITS - SURVIVOR tier (Supabase)
    const FREE_MESSAGE_LIMIT = 10; // simulator_chat_messages for survivor
    const userMessageCount = messages.filter(m => m.role === 'user').length;

    useFocusEffect(
        useCallback(() => {
            loadProfile();
            refreshUsage();
        }, [])
    );

    const refreshUsage = async () => {
        if (tier === 'survivor') {
            const { checkFreeTierLimits } = require('../../lib/usageTracking');
            const result = await checkFreeTierLimits(userId || 'guest');
            setUsageData({ dailyCount: 0, ...result }); // dailyCount is updated elsewhere but we check allowed here
        }
    };

    useEffect(() => {
        // Auto-scroll to bottom when messages change
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    // Auto-scroll on mount
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 500);
    }, []);

    const loadProfile = async () => {
        try {
            // Get user
            const { data: authData } = await supabase.auth.getUser();
            const currentUser = authData.user;
            if (currentUser) setUserId(currentUser.id);

            // Get profile data
            let stored = await storage.getItem('analysis_view_profile');
            if (!stored) {
                stored = await storage.getItem('exSimulator_currentProfile');
            }

            if (stored) {
                const data = JSON.parse(stored);
                setProfileData(data);
                if (data.userName) setUserName(data.userName);

                // Load conversation
                let loadedMessages: Message[] = [];

                // Try cloud first
                if (currentUser && data.supabaseId) {
                    try {
                        const cloudMsgs = await loadConversationFromCloud(currentUser.id, data.supabaseId);
                        if (cloudMsgs && cloudMsgs.length > 0) loadedMessages = cloudMsgs;
                    } catch (err) {
                        console.log('[ExChat] Cloud load failed', err);
                    }

                    // Load Facts
                    try {
                        const facts = await loadFacts(currentUser.id, data.supabaseId);
                        setMemoryFacts(facts);
                        applyMemoryDecay().catch(e => console.log('Decay error', e));
                    } catch (e) { console.log('Facts error', e); }

                    // Load Summaries
                    try {
                        const summaries = await getSummaries(currentUser.id, data.supabaseId, undefined, 5);
                        if (summaries.length > 0) setPastSummaries(buildSummaryContext(summaries));
                    } catch (e) { console.log('Summaries error', e); }

                    // Initialize emotional session
                    try {
                        const session = await getOrCreateSession(data.supabaseId, currentUser.id);
                        setEmotionalSession(session);
                    } catch (e) { console.log('Session error', e); }
                }

                // Fallback to local if cloud empty
                if (loadedMessages.length === 0) {
                    const key = `exSimulator_conversation_${data.id}`;
                    const localStored = await storage.getItem(key);
                    if (localStored) loadedMessages = JSON.parse(localStored);
                }

                if (loadedMessages.length > 0) {
                    setMessages(loadedMessages);
                }

                // Load local memory
                const memoryKey = `exSimulator_memory_${data.id}`;
                const savedMemory = await storage.getItem(memoryKey);
                if (savedMemory) setConversationMemory(savedMemory);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const saveConversation = async (msgs: Message[]) => {
        if (!profileData) return;

        // Save to local storage (immediate)
        const key = `exSimulator_conversation_${profileData.id}`;
        await storage.setItem(key, JSON.stringify(msgs));

        // Save to cloud (background, non-blocking)
        if (userId && profileData.supabaseId) {
            saveConversationToCloud(userId, profileData.supabaseId, msgs).catch(err =>
                console.log('[ExChat] Cloud save failed:', err)
            );

            // Store embeddings for the last 2 messages (user + assistant) for RAG
            const lastTwoMsgs = msgs.slice(-2);
            for (const msg of lastTwoMsgs) {
                storeMessageEmbedding(userId, profileData.supabaseId, msg.content, msg.role).catch(err =>
                    console.log('[ExChat] Embedding storage failed:', err)
                );
            }
        }

        // Update long-term memory every 10 messages
        if (msgs.length % 10 === 0 && msgs.length > 0) {
            await generateMemorySummary(msgs);
        }

        // Extract and save structured facts every 15 messages
        if (msgs.length % 15 === 0 && msgs.length > 0 && userId && profileData.supabaseId) {
            extractAndSaveFacts(userId, profileData.supabaseId, msgs, profileData.exName).catch(err =>
                console.log('[ExChat] Facts extraction failed:', err)
            );
        }

        // Create session summary every 30 messages (hierarchical memory)
        if (msgs.length % 30 === 0 && msgs.length > 0 && userId && profileData.supabaseId) {
            createSessionSummary(userId, profileData.supabaseId, msgs, profileData.exName).catch(err =>
                console.log('[ExChat] Session summary failed:', err)
            );
        }

        // NEW: Dynamic Profile Refinement every 15 messages
        if (msgs.length % 15 === 0 && msgs.length > 0 && profileData) {
            const recent = msgs.slice(-15).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

            // Determine interaction type roughly
            const lastMsg = msgs[msgs.length - 1].content.toLowerCase();
            const type = (lastMsg.includes('odio') || lastMsg.includes('nunca') || lastMsg.includes('!')) ? 'conflict' :
                (lastMsg.includes('amo') || lastMsg.includes('quiero') || lastMsg.includes('❤')) ? 'intimate' : 'neutral';

            try {
                refineProfileWithChat(profileData.profile || profileData, recent, type).then(updates => {
                    if (updates && Object.keys(updates).length > 0) {
                        const currentProfile = profileData.profile || profileData;
                        const newInnerProfile = { ...currentProfile, ...updates };

                        if (updates.triggers && currentProfile.triggers) {
                            newInnerProfile.triggers = { ...currentProfile.triggers, ...updates.triggers };
                        }

                        const newProfileData = { ...profileData, profile: newInnerProfile };
                        setProfileData(newProfileData);
                        storage.setItem('exSimulator_currentProfile', JSON.stringify(newProfileData));

                        if (userId && profileData.supabaseId) {
                            supabase.from('ex_profiles')
                                .update({ profile_data: newInnerProfile })
                                .eq('id', profileData.supabaseId)
                                .then(() => console.log('[ExChat] Profile refined in cloud'));
                        }
                    }
                });
            } catch (e) {
                console.log('[ExChat] Refinement failed:', e);
            }
        }
    };

    const generateMemorySummary = async (msgs: Message[]) => {
        // Temporarily disabled
        return;
    };

    const sendMessage = async (content?: string) => {
        const textToSend = content || inputText;
        if (!textToSend.trim() || isTyping) return;

        // Check Free Limit (Sophisticated)
        if (tier === 'survivor') {
            const { checkFreeTierLimits } = require('../../lib/usageTracking');
            const limitResult = await checkFreeTierLimits(userId || 'guest'); // Use persistent ID

            if (!limitResult.allowed) {
                Keyboard.dismiss();
                if (limitResult.reason === 'daily') {
                    Alert.alert('Límite Diario Alcanzado', 'Has usado tus 30 mensajes de hoy. Vuelve mañana o mejora tu plan.');
                    setShowUpgradeModal(true);
                } else if (limitResult.reason === 'burst') {
                    // Alert.alert('Recargando Energía', `Has consumido tus 10 mensajes. Tómate un descanso, recargaremos en ${limitResult.waitTime} minutos.`);
                    setEnergyWaitTime(limitResult.waitTime);
                    setShowEnergyModal(true);
                }
                return;
            }
        }

        const currentInput = textToSend.trim();
        setInputText(''); // Clear instantly
        Keyboard.dismiss();

        // Check if profile is loaded
        if (!profileData) {
            Alert.alert('Error', 'No hay perfil cargado. Por favor selecciona un perfil.');
            return;
        }

        // Ensure profile has minimum required data
        if (!profileData.exName) {
            console.error('[ExChat] Profile missing exName:', profileData);
            Alert.alert('Error', 'El perfil está incompleto. Por favor vuelve a crear el análisis.');
            return;
        }
        if (!userId && userMessageCount === 0 && !hasShownLoginPrompt) {
            setHasShownLoginPrompt(true);
            setShowLoginModal(true);
        }

        const memoryCommand = detectMemoryCommand(currentInput);
        if (memoryCommand.isCommand && memoryCommand.fact && userId && profileData.supabaseId) {
            const saved = await saveExplicitFact(userId, profileData.supabaseId, memoryCommand.fact);

            const userMessage: Message = { role: 'user', content: currentInput, timestamp: new Date(), seen: true };
            const confirmMessage: Message = {
                role: 'assistant',
                content: saved ? `OK: Lo recordaré: "${memoryCommand.fact}"` : `Entendido, lo tendré en cuenta.`,
                timestamp: new Date(),
                seen: false
            };

            const newMessages = [...messages, userMessage, confirmMessage];
            setMessages(newMessages);
            setInputText('');
            await saveConversation(newMessages);

            const updatedFacts = await loadFacts(userId, profileData.supabaseId);
            setMemoryFacts(updatedFacts);

            // Track Usage
            if (tier === 'survivor') {
                const { incrementFreeTierUsage } = require('../../lib/usageTracking');
                incrementFreeTierUsage(userId || 'guest');
            }
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: currentInput,
            timestamp: new Date(),
            seen: false,
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsTyping(true);

        // Track Usage (Normal Message)
        if (tier === 'survivor') {
            const { incrementFreeTierUsage } = require('../../lib/usageTracking');
            incrementFreeTierUsage(userId || 'guest');
        }

        let promptModifier = '';
        const defensiveTopic = checkDefensiveTrigger(currentInput, profileData.profile?.defensiveTopics || []);
        const jealousyTrigger = checkJealousyTrigger(currentInput, profileData.profile?.jealousyTriggers || []);

        if (defensiveTopic) {
            promptModifier += `\n[MODO DEFENSIVO]: El usuario mencionó "${defensiveTopic.topic}", un tema que causa actitud defensiva.`;
        }

        if (jealousyTrigger) {
            promptModifier += `\n[MODO CELOSO]: El usuario mencionó a "${jealousyTrigger.name}", causa de celos.`;
        }

        try {
            let systemPrompt: string;
            const memoryContext = conversationMemory ? `\n═══════════════════════════════════════════════\nMEMORIA DE CONVERSACIONES ANTERIORES: \n${conversationMemory} \n═══════════════════════════════════════════════\n` : '';
            const factsContext = buildFactsContext(memoryFacts);

            let ragContext = '';
            if (userId && profileData.supabaseId && currentInput.length > 10) {
                try {
                    const similarMessages = await searchSimilarMessages(userId, profileData.supabaseId, currentInput, 5, 0.6);
                    if (similarMessages.length > 0) {
                        ragContext = buildRAGContext(similarMessages);
                    }
                } catch (err) {
                    console.log('[ExChat] RAG search failed:', err);
                }
            }

            // 🆕 EMOTIONAL MEMORIES & DATES CONTEXT
            let emotionalContext = '';
            let importantDatesContext = '';
            if (profileData.supabaseId) {
                try {
                    const userEmotion = detectDetailedEmotion(currentInput);
                    console.log(`[ExChat] Detected emotion: ${userEmotion} `);

                    if (userId) {
                        const memories = await retrieveRelevantMemories(userEmotion as any, profileData.supabaseId, userId);
                        if (memories.length > 0) {
                            emotionalContext = `\n═══════════════════════════════════════════════\nRECUERDOS EMOCIONALES RELEVANTES: \n`;
                            memories.forEach(mem => {
                                emotionalContext += `📌 ${mem.title} \n   ${mem.summary} \n`;
                            });
                            emotionalContext += `\n⚠️ Estos son recuerdos reales.Menciόnalos sutilmente si es natural.\n═══════════════════════════════════════════════\n`;
                        }
                    }


                    if (profileData.importantDates && profileData.importantDates.length > 0) {
                        const today = new Date();
                        const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')} -${String(today.getDate()).padStart(2, '0')} `;
                        const relevantDates = profileData.importantDates.filter((d: any) => d.dateValue.substring(5) === todayStr);

                        if (relevantDates.length > 0) {
                            importantDatesContext = `\n═══════════════════════════════════════════════\nFECHAS IMPORTANTES HOY: \n`;
                            relevantDates.forEach((d: any) => {
                                const emoji = d.dateType === 'birthday' ? '🎂' : d.dateType === 'anniversary' ? '💕' : '📅';
                                importantDatesContext += `${emoji} ${d.description} \n`;
                            });
                            importantDatesContext += `\n⚠️ Hoy es especial.Menciنalo naturalmente.\n═══════════════════════════════════════════════\n`;
                            console.log(`[ExChat] Today has ${relevantDates.length} important dates`);
                        }
                    }
                } catch (err) {
                    console.log('[ExChat] Emotional context retrieval failed:', err);
                }
            }

            if (profileData.masterPrompt) {
                const recentContext = newMessages.slice(-20).map(m =>
                    `${m.role === 'user' ? userName : (profileData.exName || 'Ex')}: ${m.content}`
                ).join('\n');
                systemPrompt = `${profileData.masterPrompt}\n${factsContext}\n${pastSummaries}\n${ragContext}\n${emotionalContext}\n${importantDatesContext}\n${memoryContext}\nCONTEXTO RECIENTE:\n${recentContext}\n\nMENSAJE ACTUAL: "${currentInput}"\n${promptModifier}\n\nRESPONDE (sin poner tu nombre antes):`;
            } else {
                systemPrompt = buildEnhancedPrompt(profileData, userName, currentInput, messages) + promptModifier;
            }

            let emotionalDelay = 2000;
            if (emotionalSession && profileData) {
                try {
                    const emotionalResult = await processEmotionalMessage(
                        currentInput,
                        profileData,
                        emotionalSession,
                        messages.map(m => ({ role: m.role, content: m.content }))
                    );
                    emotionalDelay = emotionalResult.delayMs;
                    setEmotionalSession(emotionalResult.session);
                    setTypingDelay(emotionalDelay);
                } catch (err) {
                    emotionalDelay = calculateInitialDelay(
                        currentInput,
                        profileData.profile?.attachmentStyle || profileData.attachmentStyle,
                        profileData.profile?.emotionalTone || profileData.emotionalTone
                    );
                }
            } else {
                emotionalDelay = calculateInitialDelay(
                    currentInput,
                    profileData.profile?.attachmentStyle || profileData.attachmentStyle,
                    profileData.profile?.emotionalTone || profileData.emotionalTone
                );
            }

            // Artificial delay (capped at 5s)
            emotionalDelay = Math.min(emotionalDelay, 5000);
            await new Promise(resolve => setTimeout(resolve, emotionalDelay));
            newMessages[newMessages.length - 1].seen = true;
            setMessages([...newMessages]);
            setIsTyping(true);

            console.log('[Chat] Generating AI response...');
            const aiResponse = await generateChatResponse(currentInput, systemPrompt);
            console.log('[Chat] AI response received');

            const assistantMsg: Message = {
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                seen: false
            };

            const finalMessages = [...newMessages, assistantMsg];
            setMessages(finalMessages);
            await saveConversation(finalMessages);

            // INSIGHT TEASER: Trigger after 5 messages
            if (finalMessages.filter(m => m.role === 'user').length === 5 && !isPremium) {
                setTimeout(() => {
                    setShowInsightTeaser(true);
                }, 1000);
            }

            refreshUsage();
        } catch (error: any) {
            console.error('[ExChat] Error:', error);
            let errorText = '❌ Error de conexión. ';
            let canRetry = true;

            if (error.message === 'API_KEY_MISSING') {
                errorText = '⚠️ Falta la clave API de Gemini.';
                canRetry = false;
            } else {
                errorText += 'Intenta de nuevo.';
            }

            const errorMessage: Message = {
                role: 'assistant',
                content: errorText,
                timestamp: new Date(),
                seen: false
            };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    useEffect(() => {
        // Set loading to false after a timeout if profile doesn't load
        const timer = setTimeout(() => {
            setIsLoadingProfile(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, [profileData]);

    if (!profileData && isLoadingProfile) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#a855f7" />
                <Text style={styles.loadingText}>Cargando conversación...</Text>
            </SafeAreaView>
        );
    }

    if (!profileData && !isLoadingProfile) {
        return (
            <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.headerSafe}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => {
                                    console.log('[Index] Hamburger pressed. Width:', width);
                                    setDrawerVisible(true);
                                }}
                                style={{ padding: 12, marginLeft: -4 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Menu size={24} color={isDark ? "#fff" : "#111"} />
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity onPress={toggleTheme} style={{ padding: 8 }}>
                                    {isDark ? <Sun size={24} color="#fff" /> : <Moon size={24} color="#111" />}
                                </TouchableOpacity>

                                {!isPremium && (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 16,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                        onPress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                                    >
                                        <Sparkles size={14} color="#a855f7" />
                                        <Text style={{ color: isDark ? '#fff' : '#111', fontWeight: '600', fontSize: 13 }}>{t('btn_upgrade')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: isDark ? '#374151' : '#e5e7eb'
                        }}>
                            <Brain size={40} color={isDark ? '#fff' : '#111'} />
                        </View>

                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#fff' : '#111', marginBottom: 16 }}>{t('home_title')}</Text>

                        <Text style={{
                            fontSize: 16,
                            color: '#9ca3af',
                            textAlign: 'center',
                            marginBottom: 40,
                            lineHeight: 24
                        }}>
                            {t('home_analysis_subtitle')}
                        </Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#111',
                                paddingVertical: 16,
                                paddingHorizontal: 32,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                width: '100%',
                                justifyContent: 'center'
                            }}
                            onPress={() => router.push('/tools/ex-simulator/import')}
                        >
                            <Send size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('home_import_chat')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ marginTop: 24 }}
                            onPress={() => setDrawerVisible(true)}
                        >
                            <Text style={{ color: '#6b7280', fontSize: 14 }}>{t('home_view_past_analysis')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Profile Drawer */}
                    <ProfileDrawer
                        visible={drawerVisible}
                        onClose={() => setDrawerVisible(false)}
                        currentProfileId={profileData?.id || profileData?.supabaseId}
                        onProfileSwitch={async (profile) => {
                            console.log('[ExChat] Profile switched to:', profile.exName);
                            setDrawerVisible(false);

                            // Explicitly show loading state
                            setIsLoadingProfile(true);
                            setProfileData(null);
                            setMessages([]);

                            // Small delay to ensure state clears then reload
                            setTimeout(async () => {
                                await loadProfile();
                                // Ensure loading is turned off if it stuck
                                setTimeout(() => setIsLoadingProfile(false), 500);
                            }, 150);
                        }}
                        onProfileDeleted={() => {
                            console.log('[ExChat/EmptyState] Profile deleted, resetting...');
                            setProfileData(null);
                            setMessages([]);
                        }}
                    />
                </SafeAreaView >
            </View >
        );
    }

    return (
        <View style={[styles.container, isDark && { backgroundColor: '#000000' }, isDesktop && { flexDirection: 'row' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {isDesktop && (
                <View style={{ width: 300, borderRightWidth: 1, borderColor: isDark ? '#333' : '#e5e7eb', height: '100%' }}>
                    <ProfileDrawer
                        visible={true}
                        variant="sidebar"
                        onClose={() => { }}
                        currentProfileId={profileData?.id || profileData?.supabaseId}
                        onProfileSwitch={async (profile) => {
                            setDrawerVisible(false);
                            setIsLoadingProfile(true);
                            setProfileData(null);
                            setMessages([]);
                            setTimeout(async () => {
                                await loadProfile();
                                setTimeout(() => setIsLoadingProfile(false), 500);
                            }, 150);
                        }}
                        onProfileDeleted={() => { setProfileData(null); setMessages([]); }}
                    />
                </View>
            )}

            <View style={{ flex: 1 }}>
                <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
                    {/* Use the Enhanced Header Component */}
                    <ChatHeader
                        exName={profileData.exName || 'Ex'}
                        onMenuPress={!isDesktop ? () => setDrawerVisible(true) : undefined}
                        isPremium={isPremium}
                        onUpgradePress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                    />
                </SafeAreaView>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesContainer}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Limit Warning Banner - Preview Mode for Free Users */}
                        {!isPremium && usageData && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                marginBottom: 16,
                                marginHorizontal: 0,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: 'rgba(245, 158, 11, 0.2)',
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Crown size={16} color="#fbbf24" />
                                    <View>
                                        <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '600' }}>
                                            {t('free_preview_title')}
                                        </Text>
                                        <Text style={{ color: '#d97706', fontSize: 11 }}>
                                            {usageData.dailyCount >= 30
                                                ? t('free_preview_limit_reached')
                                                : t('free_preview_limit_msg')}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 8,
                                    }}
                                    onPress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                                >
                                    <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold' }}>{t('btn_upgrade')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {messages.length === 0 && (
                            <View style={styles.emptyStateContainer}>
                                <View style={[styles.emptyStateIcon, isDark && { backgroundColor: '#1f2937', borderColor: '#374151' }]}>
                                    <Sparkles size={40} color="#a855f7" />
                                </View>
                                <Text style={[styles.emptyStateTitle, isDark && { color: '#fff' }]}>{t('home_greeting')}</Text>
                                <Text style={styles.emptyStateText}>
                                    {t('home_greeting_subtitle')}
                                </Text>

                                <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 24 }}>
                                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                                        {t('home_suggestions_label')}
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                        {[
                                            t('home_chip1'),
                                            t('home_chip2'),
                                            t('home_chip3'),
                                            t('home_chip4'),
                                            t('home_chip5')
                                        ].map((text, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={{
                                                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 10,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? '#374151' : '#e5e7eb'
                                                }}
                                                onPress={() => sendMessage(text)}
                                            >
                                                <Text style={{ color: isDark ? '#fff' : '#111', fontSize: 14 }}>{text}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

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
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' }}>
                                    <View style={[
                                        styles.messageBubble,
                                        msg.role === 'user' ? styles.userBubble : [styles.assistantBubble, isDark && { backgroundColor: '#1f2937', borderColor: '#374151' }],
                                        { maxWidth: msg.role === 'assistant' ? '78%' : '78%' }
                                    ]}>
                                        <Text style={[
                                            styles.messageText,
                                            { color: msg.role === 'user' ? '#fff' : (isDark ? '#e5e5e5' : '#111111') }
                                        ]}>
                                            {msg.content}
                                        </Text>
                                        <Text style={styles.messageTime}>
                                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            {msg.role === 'user' && msg.seen && ' • Leído'}
                                        </Text>
                                    </View>

                                    {msg.role === 'assistant' && (
                                        <TouchableOpacity
                                            onPress={() => handleReport(msg, idx)}
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
                    <AIReportModal
                        visible={reportModalVisible}
                        onClose={() => setReportModalVisible(false)}
                        messageId={reportData.id}
                        content={reportData.content}
                        context="ex_simulator"
                        userId={userId || 'current_user_id'}
                    />

                    {/* Recharge Banner (for free users) */}
                    {usageData && !usageData.allowed && (
                        <View style={{
                            backgroundColor: '#1E1B4B',
                            padding: 12,
                            marginHorizontal: 16,
                            marginBottom: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#4338CA',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
                                    {usageData.reason === 'daily' ? 'Límite diario alcanzado' : 'Recargando energía...'}
                                </Text>
                                <Text style={{ color: '#A5B4FC', fontSize: 12 }}>
                                    {usageData.reason === 'daily'
                                        ? 'Vuelve mañana para seguir sanando.'
                                        : `Tómate un respiro. Recargaremos en ${usageData.waitTime} min.`}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                                style={{
                                    backgroundColor: '#4338CA',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Upgrade</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Suggestion Banner */}
                    {suggestionBanner && (
                        <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, zIndex: 50 }}>
                            <SuggestionBanner
                                visible={suggestionBanner.visible}
                                message={suggestionBanner.message}
                                icon={suggestionBanner.icon}
                                onAccept={() => {
                                    setSuggestionBanner(null);
                                    router.push('/(tabs)/profile');
                                }}
                                onDismiss={() => setSuggestionBanner(null)}
                            />
                        </View>
                    )}

                    {/* Input */}
                    <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
                        {/* Gemini-style Preview Bubble - MOVED ABOVE INPUT */}
                        {inputText.trim() !== '' && (
                            <Animated.View
                                style={[
                                    styles.previewBubble,
                                    {
                                        opacity: 1, // Simple opacity
                                        transform: [{ translateY: 0 }],
                                    }
                                ]}
                            >
                                <Text style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
                                    {inputText}
                                </Text>
                            </Animated.View>
                        )}

                        <View style={[styles.inputContainer, isDark && { backgroundColor: '#000' }]}>
                            <View style={[styles.inputWrapper, isDark && { backgroundColor: '#1f2937', borderColor: '#374151' }]}>
                                {/* Image Picker Button */}
                                <TouchableOpacity
                                    onPress={async () => {
                                        try {
                                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                            if (status !== 'granted') {
                                                Alert.alert(t('alert_permission_needed'), t('alert_permission_photos'));
                                                return;
                                            }
                                            const result = await ImagePicker.launchImageLibraryAsync({
                                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                                quality: 0.7,
                                            });
                                            if (!result.canceled) {
                                                Alert.alert(t('alert_image_analysis'), t('alert_image_analysis_soon'));
                                            }
                                        } catch (error) {
                                            console.error('ImagePicker error:', error);
                                        }
                                    }}
                                    style={styles.imageButton}
                                >
                                    <ImageIcon size={20} color="#9ca3af" />
                                </TouchableOpacity>
                                <TextInput
                                    style={[styles.input, isDark && { color: '#fff' }]}
                                    placeholder="Escribe un mensaje..."
                                    placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                                    value={inputText}
                                    onChangeText={setInputText}
                                    onSubmitEditing={() => sendMessage()}
                                    multiline
                                />

                                {/* VOICE MODE BUTTON - PREMIUM UI */}
                                {/* VOICE MODE BUTTON - GEMINI STYLE */}
                                <TouchableOpacity
                                    onPress={() => {
                                        console.log('[Voice Button] Clicked. ProfileData:', profileData);
                                        console.log('[Voice Button] Current tier:', tier);

                                        if (!profileData) {
                                            Alert.alert('Error', 'Cargando perfil...');
                                            return;
                                        }

                                        // Check subscription tier for voice access
                                        if (tier !== 'warrior' && tier !== 'phoenix') {
                                            console.log('[Voice Button] Access denied - showing upgrade modal');
                                            setShowVoiceUpgradeModal(true);
                                            return;
                                        }

                                        console.log('[Voice Button] Access granted - navigating to voice');
                                        const hasVoice = !!profileData.voice_id;
                                        const target = hasVoice ? '/(app)/voice/call' : '/(app)/voice/configure';
                                        router.push({
                                            pathname: target,
                                            params: {
                                                profileId: profileData.id || profileData.supabaseId,
                                                name: profileData.exName || profileData.name,
                                                voiceId: profileData.voice_id
                                            }
                                        });
                                    }}
                                    style={{
                                        marginRight: 12,
                                        // Removed container shadows to avoid "square" artifact on Android
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#2563eb', '#7c3aed', '#db2777']} // Slightly deeper/premium tones
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 24,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.25)',
                                            // Self-contained shadow
                                            shadowColor: '#7c3aed',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.4,
                                            shadowRadius: 8,
                                            elevation: 8
                                        }}
                                    >
                                        {/* Inner Glow Effect using View */}
                                        <View style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)' }} />

                                        <AudioLines
                                            size={24}
                                            color="white"
                                            style={{ opacity: 1 }}
                                        />
                                        <View style={{ position: 'absolute', bottom: 10, right: 10 }}>
                                            <Sparkles size={10} color="#fbbf24" style={{ opacity: 0.9 }} />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                                {/* Send Button */}
                                {inputText.trim() !== '' && (
                                    <TouchableOpacity
                                        onPress={() => sendMessage()}
                                        disabled={isTyping}
                                        style={styles.sendButton}
                                    >
                                        <Send size={20} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>

                {/* ENERGY RECHARGE MODAL */}
                <EnergyRechargeModal
                    visible={showEnergyModal}
                    waitTimeMinutes={energyWaitTime}
                    onDismiss={() => setShowEnergyModal(false)}
                    onUpgrade={() => {
                        setShowEnergyModal(false);
                        router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                    }}
                />

                {/* NEW INSIGHT TEASER MODAL */}
                <InsightTeaserModal
                    visible={showInsightTeaser}
                    onDismiss={() => setShowInsightTeaser(false)}
                />

                {/* LOGIN RECOMMENDATION MODAL */}
                <Modal
                    visible={showLoginModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowLoginModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIcon}>
                                <Sparkles size={40} color="#a855f7" />
                            </View>
                            <Text style={styles.modalTitle}>{t('modal_save_title')}</Text>
                            <Text style={styles.modalText}>
                                {t('modal_save_text')}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={() => {
                                    setShowLoginModal(false);
                                    router.push('/auth');
                                }}
                            >
                                <Text style={styles.modalPrimaryText}>{t('modal_save_btn_login')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setShowLoginModal(false)}
                            >
                                <Text style={styles.modalSecondaryText}>{t('modal_save_btn_continue')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* VOICE UPGRADE MODAL */}
                <Modal
                    visible={showVoiceUpgradeModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowVoiceUpgradeModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[
                            styles.modalContent,
                            {
                                padding: 32,
                                borderRadius: 24,
                                backgroundColor: isDark ? '#18181b' : '#ffffff',
                                borderWidth: 1,
                                borderColor: isDark ? '#27272a' : '#e5e7eb',
                                maxWidth: 420
                            }
                        ]}>
                            {/* Animated Icon */}
                            <View style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                                position: 'relative'
                            }}>
                                {/* Pulsing background animation */}
                                <View style={{
                                    position: 'absolute',
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                }} />
                                <View style={{
                                    position: 'absolute',
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                }} />
                                {/* Icon container with gradient-like effect */}
                                <View style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: '#a855f7',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#a855f7',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }}>
                                    <AudioLines size={28} color="#fff" strokeWidth={2.5} />
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={{
                                fontSize: 24,
                                fontWeight: 'bold',
                                color: isDark ? '#fff' : '#111',
                                textAlign: 'center',
                                marginBottom: 12
                            }}>
                                {t('modal_voice_limit_title')}
                            </Text>

                            {/* Subtitle badge */}
                            <View style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                borderRadius: 20,
                                marginBottom: 20
                            }}>
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: '#a855f7',
                                    textAlign: 'center'
                                }}>
                                    Warrior • Phoenix
                                </Text>
                            </View>

                            {/* Description */}
                            <Text style={{
                                fontSize: 16,
                                color: isDark ? '#a1a1aa' : '#6b7280',
                                textAlign: 'center',
                                marginBottom: 32,
                                lineHeight: 24
                            }}>
                                {t('modal_voice_limit_text')}
                            </Text>

                            {/* CTA Button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#a855f7',
                                    width: '100%',
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    shadowColor: '#a855f7',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                    marginBottom: 12
                                }}
                                onPress={() => {
                                    setShowVoiceUpgradeModal(false);
                                    router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('modal_btn_see_plans')}</Text>
                            </TouchableOpacity>

                            {/* Cancel button */}
                            <TouchableOpacity
                                style={{ padding: 12 }}
                                onPress={() => setShowVoiceUpgradeModal(false)}
                            >
                                <Text style={{
                                    color: isDark ? '#71717a' : '#9ca3af',
                                    fontSize: 15,
                                    fontWeight: '500',
                                    textAlign: 'center'
                                }}>{t('modal_btn_maybe_later')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* UPGRADE MODAL */}
                <Modal
                    visible={showUpgradeModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowUpgradeModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { padding: 32, borderRadius: 24, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' }]}>
                            <View style={{
                                width: 64, height: 64, borderRadius: 32,
                                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                alignItems: 'center', justifyContent: 'center',
                                marginBottom: 20
                            }}>
                                <Sparkles size={32} color="#a855f7" />
                            </View>

                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 12 }}>
                                {t('modal_limit_title')}
                            </Text>

                            <Text style={{
                                fontSize: 16, color: '#a1a1aa', textAlign: 'center',
                                marginBottom: 28, lineHeight: 24
                            }}>
                                {t('modal_limit_text')}
                            </Text>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#a855f7',
                                    width: '100%',
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    shadowColor: '#a855f7',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                    marginBottom: 16
                                }}
                                onPress={() => {
                                    setShowUpgradeModal(false);
                                    router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall');
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('modal_btn_see_plans')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ padding: 12 }}
                                onPress={() => setShowUpgradeModal(false)}
                            >
                                <Text style={{ color: '#71717a', fontSize: 15, fontWeight: '500' }}>{t('modal_btn_maybe_later')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* ProfileDrawer - Force render for debugging */}
                {true && (
                    <ProfileDrawer
                        visible={drawerVisible}
                        onClose={() => setDrawerVisible(false)}
                        currentProfileId={profileData?.id || profileData?.supabaseId}
                        onProfileSwitch={async (profile) => {
                            console.log('[ExChat] Profile switched to:', profile.exName);
                            setDrawerVisible(false);

                            // Explicitly show loading state
                            setIsLoadingProfile(true);
                            setProfileData(null);
                            setMessages([]);

                            // Small delay to ensure state clears then reload
                            setTimeout(async () => {
                                await loadProfile();
                                // Ensure loading is turned off if it stuck
                                setTimeout(() => setIsLoadingProfile(false), 500);
                            }, 150);
                        }}
                        onProfileDeleted={() => {
                            console.log('[ExChat] Profile deleted, resetting state...');
                            setProfileData(null);
                            setMessages([]);
                            setMemoryFacts([]);
                            setEmotionalSession(null);
                            setConversationMemory('');
                            setUserName('');
                            setPastSummaries('');
                            // Do not reload profile immediately, stick to empty state
                        }}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#6b7280',
        marginTop: 12,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messagesContent: {
        paddingTop: 16,
        paddingBottom: 20,
    },
    messageRow: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowAssistant: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#2563eb', // Blue for user, visible in both modes
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#f3f4f6',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    messageTime: {
        marginTop: 4,
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        alignSelf: 'flex-end',
    },
    typingBubble: {
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    typingText: {
        color: '#9ca3af',
        fontSize: 18,
        letterSpacing: 2,
    },
    // Empty State
    headerSafe: {
        zIndex: 10,
        backgroundColor: 'transparent', // Let parent control bg
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    emptyStateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    actionCards: {
        width: '100%',
        gap: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111', // Default to dark for light mode
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: '#6b7280',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    input: {
        flex: 1,
        color: '#111',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
    },
    imageButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        marginLeft: 12,
        backgroundColor: '#6366f1',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    modalIcon: {
        marginBottom: 16,
    },
    upgradeEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalPrimaryBtn: {
        backgroundColor: '#a855f7',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalPrimaryText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalSecondaryBtn: {
        paddingVertical: 12,
    },
    modalSecondaryText: {
        color: '#6b7280',
        fontSize: 15,
    },
    // Gemini Preview
    previewBubble: {
        alignSelf: 'flex-end',
        marginRight: 16,
        marginBottom: 8,
        maxWidth: '80%',
        backgroundColor: 'rgba(168, 85, 247, 0.95)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        borderBottomRightRadius: 2,
        zIndex: 50,
    },
    previewText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
