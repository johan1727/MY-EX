import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fragmentMessage, calculateInitialDelay, buildEnhancedPrompt } from '../../../lib/chatHelpers';
import { loadMasterPrompt } from '../../../lib/masterPromptSupabase';
import { storage } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { checkProhibitedContent } from '../../../lib/contentModeration';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import { useSubscription } from '../../../lib/SubscriptionContext';
import UpgradeBanner from '../../../components/UpgradeBanner';
import {
    loadConversationFromCloud,
    saveConversationToCloud,
    loadFacts,
    extractAndSaveFacts,
    buildFactsContext,
    detectMemoryCommand,
    saveExplicitFact,
    MemoryFact
} from '../../../lib/memoryService';
import {
    searchSimilarMessages,
    storeMessageEmbedding,
    buildRAGContext,
    getSummaries,
    buildSummaryContext,
    createSessionSummary,
    applyMemoryDecay,
    SimilarMessage
} from '../../../lib/ragService';

// NEW: Emotional simulation engine imports
import {
    getOrCreateSession,
    processUserMessage as processEmotionalMessage,
    saveSession
} from '../../../lib/simulationEngine';
import { SimulationSession } from '../../../lib/simulationState';

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

    // Check subscription for premium banner
    const { tier } = useSubscription();
    const isPremium = tier !== 'survivor';
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

    // FREE USER LIMITS - SURVIVOR tier (Supabase)
    const FREE_MESSAGE_LIMIT = 30; // simulator_chat_messages for survivor
    const userMessageCount = messages.filter(m => m.role === 'user').length;

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const loadProfile = async () => {
        // Get user ID for cloud sync
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
            setUserId(user.id);
        }

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
            const detectedUserName = data.userName || 'Usuario';
            setUserName(detectedUserName);

            // Try to load conversation from cloud first
            let loadedMessages: any[] = [];
            if (user?.id && data.supabaseId) {
                try {
                    const cloudMsgs = await loadConversationFromCloud(user.id, data.supabaseId);
                    if (cloudMsgs.length > 0) {
                        loadedMessages = cloudMsgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                        console.log('[ExChat] Loaded', cloudMsgs.length, 'messages from cloud');
                    }
                } catch (err) {
                    console.log('[ExChat] Cloud load failed, trying local');
                }
            }

            // Fallback to local storage
            if (loadedMessages.length === 0) {
                const conversationKey = `exSimulator_conversation_${data.id}`;
                const savedConversation = await storage.getItem(conversationKey);
                if (savedConversation) {
                    const parsed = JSON.parse(savedConversation);
                    loadedMessages = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                }
            }
            setMessages(loadedMessages);

            // Load structured facts from cloud
            if (user?.id && data.supabaseId) {
                try {
                    const facts = await loadFacts(user.id, data.supabaseId);
                    setMemoryFacts(facts);
                    console.log('[ExChat] Loaded', facts.length, 'structured facts');

                    // Apply memory decay on app start
                    applyMemoryDecay().catch(err => console.log('[ExChat] Decay failed'));
                } catch (err) {
                    console.log('[ExChat] Facts load failed');
                }
            }

            // Load past conversation summaries (RAG)
            if (user?.id && data.supabaseId) {
                try {
                    const summaries = await getSummaries(user.id, data.supabaseId, undefined, 5);
                    if (summaries.length > 0) {
                        const summaryContext = buildSummaryContext(summaries);
                        setPastSummaries(summaryContext);
                        console.log('[ExChat] Loaded', summaries.length, 'past summaries');
                    }
                } catch (err) {
                    console.log('[ExChat] Summaries load failed');
                }
            }

            // Load long-term memory from local
            const memoryKey = `exSimulator_memory_${data.id}`;
            const savedMemory = await storage.getItem(memoryKey);
            if (savedMemory) {
                setConversationMemory(savedMemory);
                console.log('[ExChat] Loaded memory:', savedMemory.substring(0, 100));
            }

            // NEW: Initialize emotional simulation session
            if (user?.id && data.supabaseId) {
                try {
                    const session = await getOrCreateSession(data.supabaseId, user.id);
                    setEmotionalSession(session);
                    console.log('[ExChat] Emotional session loaded:', session.currentEmotion.primary);
                } catch (err) {
                    console.log('[ExChat] Emotional session load failed, using defaults');
                }
            }
        } else {
            router.back();
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
    };

    // Generate a summary of important conversation points for long-term memory
    const generateMemorySummary = async (msgs: Message[]) => {
        if (!profileData) return;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            // Analyze last 50 messages for better memory (was 30)
            const recentMsgs = msgs.slice(-50).map(m =>
                `${m.role === 'user' ? 'Usuario' : profileData.exName}: ${m.content}`
            ).join('\n');

            const memoryPrompt = `Analiza esta conversación y extrae los puntos MÁS IMPORTANTES que ${profileData.exName} debería recordar para futuras conversaciones:
${recentMsgs}

Extrae en máximo 8 bullets los siguientes tipos de información:
- Nombres mencionados (personas, lugares, mascotas)
- Fechas o eventos importantes mencionados
- Planes futuros o cosas pendientes
- Promesas o acuerdos hechos
- Información personal nueva compartida
- Momentos emocionales significativos
- Temas que quedaron inconclusos
- El tono general de la conversación

Formato: bullets concisos pero informativos. Máximo 500 caracteres:`;

            const result = await model.generateContent(memoryPrompt);
            const newMemory = result.response.text().trim();

            // Append to existing memory, keeping only last 4000 chars (was 1000)
            const updatedMemory = (conversationMemory + '\n' + newMemory).slice(-4000).trim();
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

        // NEW: Check if user is logged in and recommend login after first message
        if (!userId && userMessageCount === 0 && !hasShownLoginPrompt) {
            setHasShownLoginPrompt(true);
            setShowLoginModal(true);
            // Continue anyway - this is just a recommendation
        }

        // NEW: Check message limits for free users
        if (!isPremium && userMessageCount >= FREE_MESSAGE_LIMIT) {
            setShowUpgradeModal(true);
            return;
        }

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

        // Check for explicit memory commands (ChatGPT-style)
        const memoryCommand = detectMemoryCommand(inputText);
        if (memoryCommand.isCommand && memoryCommand.fact && userId && profileData.supabaseId) {
            // Save the fact and confirm to user
            const saved = await saveExplicitFact(userId, profileData.supabaseId, memoryCommand.fact);

            const userMessage: Message = {
                role: 'user',
                content: inputText,
                timestamp: new Date(),
                seen: true
            };

            const confirmMessage: Message = {
                role: 'assistant',
                content: saved
                    ? `✓ Lo recordaré: "${memoryCommand.fact}"`
                    : `Entendido, lo tendré en cuenta.`,
                timestamp: new Date(),
                seen: false
            };

            const newMessages = [...messages, userMessage, confirmMessage];
            setMessages(newMessages);
            setInputText('');
            await saveConversation(newMessages);

            // Reload facts to include the new one
            const updatedFacts = await loadFacts(userId, profileData.supabaseId);
            setMemoryFacts(updatedFacts);
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

            // Build structured facts context
            const factsContext = buildFactsContext(memoryFacts);

            // RAG: Search for similar past messages (semantic search)
            let ragContext = '';
            if (userId && profileData.supabaseId && currentInput.length > 10) {
                try {
                    const similarMessages = await searchSimilarMessages(
                        userId,
                        profileData.supabaseId,
                        currentInput,
                        5,  // limit
                        0.6 // threshold
                    );
                    if (similarMessages.length > 0) {
                        ragContext = buildRAGContext(similarMessages);
                        console.log('[ExChat] RAG found', similarMessages.length, 'similar messages');
                    }
                } catch (err) {
                    console.log('[ExChat] RAG search failed:', err);
                }
            }

            if (profileData.masterPrompt) {
                // Use last 20 messages for context
                const recentContext = messages.slice(-20).map(m =>
                    `${m.role === 'user' ? userName : profileData.exName}: ${m.content}`
                ).join('\n');

                // Full context: Master prompt + Facts + Past summaries + RAG + Memory + Recent
                systemPrompt = `${profileData.masterPrompt}\n${factsContext}\n${pastSummaries}\n${ragContext}\n${memoryContext}\nCONTEXTO RECIENTE:\n${recentContext}\n\nMENSAJE ACTUAL: "${currentInput}"\n\nRESPONDE (sin poner tu nombre antes):`;
            } else {
                systemPrompt = buildEnhancedPrompt(profileData, userName, currentInput, messages);
            }

            // NEW: Calculate emotional delay if session available
            let emotionalDelay = 2000; // Default 2s
            if (emotionalSession && profileData) {
                try {
                    // Process message through emotional engine to get delay
                    const emotionalResult = await processEmotionalMessage(
                        currentInput,
                        profileData,
                        emotionalSession,
                        messages.map(m => ({ role: m.role, content: m.content }))
                    );
                    emotionalDelay = emotionalResult.delayMs;
                    setEmotionalSession(emotionalResult.session);
                    setTypingDelay(emotionalDelay);
                    console.log('[ExChat] Emotional response:', emotionalResult.session.currentEmotion.primary, 'delay:', emotionalDelay);
                } catch (err) {
                    console.log('[ExChat] Emotional processing failed, using default delay');
                    emotionalDelay = calculateInitialDelay(currentInput, profileData.profile?.attachmentStyle, profileData.profile?.emotionalTone);
                }
            } else {
                emotionalDelay = calculateInitialDelay(currentInput, profileData.profile?.attachmentStyle, profileData.profile?.emotionalTone);
            }

            // Use the calculated delay (2-6 seconds)
            await new Promise(resolve => setTimeout(resolve, emotionalDelay));

            updatedMessages[updatedMessages.length - 1].seen = true;
            setMessages([...updatedMessages]);
            setIsTyping(true);

            // NEW: Retry logic for API calls
            let fullText = '';
            let lastError: any = null;
            const MAX_RETRIES = 3;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    // Limit context to avoid token overflow
                    const MAX_PROMPT_LENGTH = 20000; // ~5000 tokens
                    let limitedPrompt = systemPrompt;
                    if (systemPrompt.length > MAX_PROMPT_LENGTH) {
                        // Keep the most recent context, trim old messages
                        limitedPrompt = systemPrompt.slice(-MAX_PROMPT_LENGTH);
                        console.log(`[ExChat] Prompt truncated from ${systemPrompt.length} to ${MAX_PROMPT_LENGTH} chars`);
                    }

                    const result = await model.generateContent(limitedPrompt);
                    const response = await result.response;
                    fullText = response.text();
                    lastError = null;
                    break; // Success, exit retry loop
                } catch (err: any) {
                    lastError = err;
                    console.log(`[ExChat] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
                    if (attempt < MAX_RETRIES) {
                        // Wait before retrying (exponential backoff)
                        await new Promise(r => setTimeout(r, 1000 * attempt));
                    }
                }
            }

            if (lastError) {
                throw lastError;
            }

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
            console.error('[ExChat] Error after retries:', error);
            let errorText = '❌ Error de conexión. ';
            let canRetry = true;

            if (error.message === 'API_KEY_MISSING') {
                errorText = '⚠️ Falta la clave API de Gemini. Contacta a soporte.';
                canRetry = false;
            } else if (error.message?.includes('API key')) {
                errorText = '🔑 Error de autenticación API.';
                canRetry = false;
            } else if (error.message?.includes('quota')) {
                errorText = '📊 Límite de API excedido. Intenta en unos minutos.';
            } else if (error.message?.includes('context') || error.message?.includes('token')) {
                errorText = '📝 Conversación muy larga. Se resumirá el contexto automáticamente.';
            } else {
                errorText += 'Toca aquí para reintentar.';
            }

            const errorMessage: Message = {
                role: 'assistant',
                content: errorText,
                timestamp: new Date(),
                seen: false
            };
            setMessages([...updatedMessages, errorMessage]);

            // If can retry, show alert with option
            if (canRetry && error.message !== 'API_KEY_MISSING') {
                Alert.alert(
                    'Error de conexión',
                    '¿Quieres intentar enviar el mensaje de nuevo?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Reintentar', onPress: () => {
                                setInputText(inputText || currentInput);
                                // Will retry on next sendMessage call
                            }
                        }
                    ]
                );
            }
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
                {/* Premium Upgrade Banner - only for free users */}
                {!isPremium && <UpgradeBanner variant="minimal" />}
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
                {/* Message counter for free users */}
                {!isPremium && (
                    <Text style={styles.messageCounter}>
                        {FREE_MESSAGE_LIMIT - userMessageCount > 0
                            ? `${FREE_MESSAGE_LIMIT - userMessageCount} mensajes restantes`
                            : 'Sin mensajes restantes'}
                    </Text>
                )}
            </View>

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
                    <View style={styles.modalContent}>
                        <Text style={styles.upgradeEmoji}>🔥</Text>
                        <Text style={styles.modalTitle}>Has llegado al límite</Text>
                        <Text style={styles.modalText}>
                            Has enviado {FREE_MESSAGE_LIMIT} mensajes en esta simulación.
                            Para continuar chateando sin límites, actualiza a Premium.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalPrimaryBtn}
                            onPress={() => {
                                setShowUpgradeModal(false);
                                router.push('/paywall');
                            }}
                        >
                            <Text style={styles.modalPrimaryText}>Ver planes Premium</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalSecondaryBtn}
                            onPress={() => setShowUpgradeModal(false)}
                        >
                            <Text style={styles.modalSecondaryText}>Quizás después</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    messageCounter: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 6,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    modalIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    upgradeEmoji: {
        fontSize: 50,
        marginBottom: 12,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    modalPrimaryBtn: {
        backgroundColor: '#a855f7',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        marginBottom: 10,
    },
    modalPrimaryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalSecondaryBtn: {
        paddingHorizontal: 28,
        paddingVertical: 12,
    },
    modalSecondaryText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});
