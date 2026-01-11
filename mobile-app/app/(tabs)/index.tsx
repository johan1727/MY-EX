import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Modal, Alert, KeyboardAvoidingView, Image, Animated, Keyboard } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fragmentMessage, calculateInitialDelay, buildEnhancedPrompt } from '../../lib/chatHelpers';
import { loadMasterPrompt } from '../../lib/masterPromptSupabase';
import { storage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { checkProhibitedContent } from '../../lib/contentModeration';
import { Send, Sparkles, ImageIcon, Brain, Menu } from 'lucide-react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
import ChatHeader, { CHAT_THEMES, ChatTheme } from '../../components/ChatHeader';
import { StatusBar } from 'expo-status-bar';
import ProfileDrawer from '../../components/ProfileDrawer';
import * as ImagePicker from 'expo-image-picker';

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
    const scrollViewRef = useRef<ScrollView>(null);
    const [profileData, setProfileData] = useState<any>(null);

    // Check subscription for premium banner
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor'; // Assuming survivor is free
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userName, setUserName] = useState('');
    const [conversationMemory, setConversationMemory] = useState<string>('');
    const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [pastSummaries, setPastSummaries] = useState<string>(''); // RAG: past conversation summaries

    // NEW: Emotional simulation state
    const [emotionalSession, setEmotionalSession] = useState<SimulationSession | null>(null);
    const [typingDelay, setTypingDelay] = useState<number>(2000);

    // NEW: Limits and modals
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [hasShownLoginPrompt, setHasShownLoginPrompt] = useState(false);

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
        }, [])
    );

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

        // Check Free Limit
        if (tier === 'survivor' && userMessageCount >= FREE_MESSAGE_LIMIT) {
            Keyboard.dismiss();
            setShowUpgradeModal(true);
            return;
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
            return;
        }

        const userMessage: Message = {
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date(),
            seen: false,
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsTyping(true);

        let promptModifier = '';
        const defensiveTopic = checkDefensiveTrigger(inputText, profileData.profile?.defensiveTopics || []);
        const jealousyTrigger = checkJealousyTrigger(inputText, profileData.profile?.jealousyTriggers || []);

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
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.headerSafe}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setDrawerVisible(true)} style={{ padding: 8 }}>
                                <Menu size={24} color="#fff" />
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
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Mejorar plan</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#1A1A1A',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: '#333'
                        }}>
                            <Brain size={40} color="#fff" />
                        </View>

                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>Análisis de Patrones</Text>

                        <Text style={{
                            fontSize: 16,
                            color: '#9ca3af',
                            textAlign: 'center',
                            marginBottom: 40,
                            lineHeight: 24
                        }}>
                            Analiza la dinámica de tu relación pasada para identificar patrones y sanar.
                        </Text>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#fff',
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
                            <Send size={20} color="#000" />
                            <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>Importar Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ marginTop: 24 }}
                            onPress={() => setDrawerVisible(true)}
                        >
                            <Text style={{ color: '#6b7280', fontSize: 14 }}>Ver análisis anteriores</Text>
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
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
                {/* Use the Enhanced Header Component */}
                <ChatHeader
                    exName={profileData.exName || 'Ex'}
                    onMenuPress={() => setDrawerVisible(true)}
                    isPremium={isPremium}
                    onUpgradePress={() => router.push(Platform.OS === 'web' ? '/subscribe' : '/paywall')}
                />
            </SafeAreaView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 && (
                        <View style={styles.emptyStateContainer}>
                            <View style={styles.emptyStateIcon}>
                                <Sparkles size={40} color="#a855f7" />
                            </View>
                            <Text style={styles.emptyStateTitle}>¿Cómo te sientes hoy?</Text>
                            <Text style={styles.emptyStateText}>
                                Estoy aquí para escucharte y analizar tu situación.
                            </Text>

                            <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 24 }}>
                                <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                                    Sugerencias para iniciar:
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                    {[
                                        "Hola",
                                        "Te extraño",
                                        "¿Podemos hablar?",
                                        "No dejo de pensar en ti",
                                        "¿Cómo has estado?"
                                    ].map((text, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{
                                                backgroundColor: '#2A2A2A',
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: '#333'
                                            }}
                                            onPress={() => sendMessage(text)}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 14 }}>{text}</Text>
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
                            <View
                                style={[
                                    styles.messageBubble,
                                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                                ]}
                            >
                                <Text style={[
                                    styles.messageText,
                                    { color: msg.role === 'user' ? '#fff' : '#e5e5e5' }
                                ]}>
                                    {msg.content}
                                </Text>
                                <Text style={styles.messageTime}>
                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
                    <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                            {/* Image Picker Button */}
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                        if (status !== 'granted') {
                                            Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
                                            return;
                                        }
                                        const result = await ImagePicker.launchImageLibraryAsync({
                                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                            quality: 0.7,
                                        });
                                        if (!result.canceled) {
                                            Alert.alert('Análisis de imagen', 'Función de análisis de imágenes próximamente.');
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
                                style={styles.input}
                                placeholder="Escribe un mensaje..."
                                placeholderTextColor="#666"
                                value={inputText}
                                onChangeText={setInputText}
                                onSubmitEditing={() => sendMessage()}
                                editable={!isTyping}
                                multiline
                            />
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
                    {/* Gemini-style Preview Bubble */}
                    {inputText.trim() !== '' && (
                        <Animated.View
                            style={[
                                styles.previewBubble,
                                {
                                    opacity: new Animated.Value(1), // Simple fade could be enhanced with useEffect
                                    transform: [{ translateY: 0 }]
                                }
                            ]}
                        >
                            <Text style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
                                {inputText}
                            </Text>
                        </Animated.View>
                    )}
                </SafeAreaView>
            </KeyboardAvoidingView>

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
                        <Text style={styles.modalTitle}>¡Guarda tu conversación!</Text>
                        <Text style={styles.modalText}>
                            Crea una cuenta para que tu simulación y análisis se guarden automáticamente.
                            Sin cuenta, podrías perder tus datos.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalPrimaryBtn}
                            onPress={() => {
                                setShowLoginModal(false);
                                router.push('/auth');
                            }}
                        >
                            <Text style={styles.modalPrimaryText}>Crear cuenta / Iniciar sesión</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalSecondaryBtn}
                            onPress={() => setShowLoginModal(false)}
                        >
                            <Text style={styles.modalSecondaryText}>Continuar sin guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* UPGRADE MODAL - When free messages run out */}
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
                            Has alcanzado el límite
                        </Text>

                        <Text style={{
                            fontSize: 16, color: '#a1a1aa', textAlign: 'center',
                            marginBottom: 28, lineHeight: 24
                        }}>
                            Los usuarios gratuitos tienen 10 mensajes por simulación.
                            Actualiza a Premium para chatear sin límites y desbloquear el análisis profundo.
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
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Ver planes Premium</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ padding: 12 }}
                            onPress={() => setShowUpgradeModal(false)}
                        >
                            <Text style={{ color: '#71717a', fontSize: 15, fontWeight: '500' }}>Quizás después</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ProfileDrawer */}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
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
        backgroundColor: '#2A2A2A',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#1A1A1A',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    messageTime: {
        marginTop: 4,
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        alignSelf: 'flex-end',
    },
    typingBubble: {
        backgroundColor: '#1A1A1A',
        padding: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
    },
    typingText: {
        color: '#9ca3af',
        fontSize: 18,
        letterSpacing: 2,
    },
    // Empty State
    headerSafe: {
        zIndex: 10,
        backgroundColor: '#000',
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
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9ca3af',
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
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
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
        color: '#fff',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: '#9ca3af',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    input: {
        flex: 1,
        color: '#fff',
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
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
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
        color: '#fff',
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
    // Gemini Preview
    previewBubble: {
        position: 'absolute',
        bottom: 90, // Increased to clear input safely
        left: 20,
        right: 20, // Constrain width
        backgroundColor: 'rgba(168, 85, 247, 0.95)', // Slightly more opaque
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999, // Force on top
        borderBottomLeftRadius: 4,
    },
    previewText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
