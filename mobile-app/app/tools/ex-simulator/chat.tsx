import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native'; // Removed Modal import
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Sparkles, Image as ImageIcon, X, MoreVertical, Trash2, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/i18n';
import { storage } from '../../../lib/storage';
import { loadProfiles, type ExProfile as SyncedProfile } from '../../../lib/profileSync';
import { simulateResponse, ParsedMessage, ExProfile } from '../../../lib/exSimulator';
// Import component relative to this file
import PersonalitySelector from '../../../components/PersonalitySelector';

interface Message {
    _id: string;
    text: string;
    createdAt: Date | number;
    user: {
        _id: number | string;
        name: string;
    };
    image?: string;
}

export default function ExChatScreen() {
    const { profile_id } = useLocalSearchParams();
    const router = useRouter();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const scrollViewRef = useRef<ScrollView>(null);

    const [profile, setProfile] = useState<SyncedProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false); // For resetting/deleting

    // Load profile and messages
    useEffect(() => {
        const load = async () => {
            if (!profile_id) return;

            try {
                // Load all profiles to find the right one (local first)
                const profiles = await loadProfiles();
                const found = profiles.find(p => p.id === profile_id || p.supabaseId === profile_id);

                if (found) {
                    setProfile(found);

                    // Load conversation history
                    const historyKey = `exSimulator_conversation_${found.id}`;
                    const savedHistory = await storage.getItem(historyKey);
                    if (savedHistory) {
                        setMessages(JSON.parse(savedHistory));
                    }
                } else {
                    Alert.alert('Error', 'Perfil no encontrado');
                    router.back();
                }
            } catch (e) {
                console.error('Error loading chat:', e);
            }
        };
        load();
    }, [profile_id]);

    // Save messages on change (keep only last 100 to prevent storage bloat)
    useEffect(() => {
        if (profile && messages.length > 0) {
            const historyKey = `exSimulator_conversation_${profile.id}`;
            const toSave = messages.slice(-100); // Fix #1: limit to 100 messages
            storage.setItem(historyKey, JSON.stringify(toSave));
        }
    }, [messages, profile]);

    const handleSendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || isTyping || !profile) return;

        const newMessage: Message = {
            _id: Math.random().toString(36).substring(7),
            text: inputText.trim(),
            createdAt: Date.now(),
            user: { _id: 1, name: 'User' },
            image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);

        // Fix #7: Realistic delay before showing typing indicator (like WhatsApp)
        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));

        // Auto scroll
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Convert to format expected by simulator
            const conversationHistory: ParsedMessage[] = updatedMessages.map(m => ({
                timestamp: new Date(m.createdAt).toISOString(),
                sender: m.user._id === 1 ? 'user' : profile.exName,
                content: m.text,
                hasMedia: !!m.image
            }));

            // Simulate response
            const { response } = await simulateResponse(
                newMessage.text,
                selectedImage, // Pass base64 image if any
                profile.profile || profile, // Handle nested profile object structure if needed
                conversationHistory
            );

            const replyMessage: Message = {
                _id: Math.random().toString(36).substring(7),
                text: response,
                createdAt: Date.now(),
                user: { _id: 2, name: profile.exName }
            };

            setMessages(prev => [...prev, replyMessage]);
            // Auto scroll again
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        } catch (error) {
            Alert.alert('Error', 'No se pudo generar la respuesta. Intenta de nuevo.');
            console.error(error);
        } finally {
            setIsTyping(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true
        });
        if (!result.canceled && result.assets[0].base64) {
            setSelectedImage(result.assets[0].base64);
        }
    };

    const handlePhaseSelect = async (phaseId: string) => {
        if (!profile) return;

        // Update profile with selected phase locally
        const updatedProfile = {
            ...profile,
            profile: {
                ...profile.profile,
                selectedPhase: phaseId // Store in nested profile too for safety
            },
            selectedPhase: phaseId
        };

        // Save to storage via imported helper? Or direct?
        // PersonalitySelector saves to 'exSimulator_currentProfile', but we use 'profile_id' based storage.
        // Let's update our state locally. 
        setProfile(updatedProfile);

        // Persist selection logic is handled inside PersonalitySelector (it saves to 'currentProfile')
        // But we should ensuring syncing if possible. 
        // For now, local state update allows UI to switch to chat.
    };

    const clearChat = () => {
        Alert.alert('Borrar Chat', '¿Estás seguro? No se podrá deshacer.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Borrar',
                style: 'destructive',
                onPress: () => {
                    setMessages([]);
                    if (profile) storage.removeItem(`exSimulator_conversation_${profile.id}`);
                    setShowConfig(false);
                }
            }
        ]);
    };

    if (!profile) {
        return (
            <View style={[styles.container, styles.center, isDark && { backgroundColor: '#000' }]}>
                <ActivityIndicator size="large" color="#a855f7" />
                <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 10 }}>Cargando perfil...</Text>
            </View>
        );
    }

    // CHECK PHASE SELECTION 
    // If profile doesn't have selectedPhase (and it's not checked already), show selector
    // Note: profile.selectedPhase might be on the root or inside profile.profile depending on saving logic
    const hasPhase = (profile as any).selectedPhase || (profile.profile as any)?.selectedPhase;

    // TEMPORARILY: Always show selector if messages are empty? 
    // Or just rely on the flag.
    if (!hasPhase && messages.length === 0) {
        return (
            <PersonalitySelector
                profileData={profile}
                onSelect={handlePhaseSelect}
            />
        );
    }

    return (
        <View style={[styles.container, isDark && { backgroundColor: '#000' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={22} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>

                    <View>
                        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {profile.exName}
                        </Text>
                        {isTyping ? (
                            <Text style={{ fontSize: 10, color: '#a855f7' }}>Escribiendo...</Text>
                        ) : (
                            <Text style={{ fontSize: 10, color: isDark ? '#888' : '#666' }}>En línea</Text>
                        )}
                    </View>

                    <TouchableOpacity onPress={() => setShowConfig(!showConfig)} style={styles.backButton}>
                        <MoreVertical size={22} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                </View>

                {showConfig && (
                    <View style={[styles.configMenu, isDark && { backgroundColor: '#1a1a1a', borderColor: '#333' }]}>
                        <TouchableOpacity onPress={clearChat} style={styles.configItem}>
                            <RotateCcw size={16} color={isDark ? '#fff' : '#000'} />
                            <Text style={[styles.configText, isDark && { color: '#fff' }]}>Reiniciar Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            // Reset phase
                            const p = { ...profile };
                            if ((p as any).selectedPhase) delete (p as any).selectedPhase;
                            if ((p.profile as any).selectedPhase) delete (p.profile as any).selectedPhase;
                            setProfile(p);
                            setShowConfig(false);
                        }} style={styles.configItem}>
                            <Sparkles size={16} color="#a855f7" />
                            <Text style={[styles.configText, isDark && { color: '#fff' }]}>Cambiar Personalidad</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                >
                    {messages.map((msg, idx) => {
                        const isUser = msg.user._id === 1;
                        return (
                            <View key={idx} style={[
                                styles.messageRow,
                                isUser ? styles.userRow : styles.assistantRow
                            ]}>
                                {!isUser && (
                                    <View style={styles.avatar}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{profile.exName?.[0] || '?'}</Text>
                                    </View>
                                )}

                                <View style={[
                                    styles.bubble,
                                    isUser ? styles.userBubble : [styles.assistantBubble, isDark && { backgroundColor: '#262626', borderColor: '#404040' }]
                                ]}>
                                    {msg.image && (
                                        <Image source={{ uri: msg.image }} style={{ width: 200, height: 150, borderRadius: 10, marginBottom: 5 }} />
                                    )}
                                    <Text style={isUser ? styles.userText : [styles.assistantText, isDark && { color: '#fff' }]}>
                                        {msg.text}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: isUser ? 'rgba(255,255,255,0.5)' : '#9ca3af', marginTop: 4, alignSelf: 'flex-end' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                <SafeAreaView edges={['bottom']} style={[styles.inputContainer, isDark && { backgroundColor: '#000', borderTopColor: '#333' }]}>
                    {selectedImage && (
                        <View style={{ position: 'absolute', bottom: '100%', left: 20, backgroundColor: isDark ? '#1a1a1a' : '#fff', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}>
                            <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} style={{ width: 60, height: 60, borderRadius: 5 }} />
                            <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10 }}>
                                <X size={12} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity onPress={pickImage} style={{ padding: 8 }}>
                            <ImageIcon size={24} color="#a855f7" />
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.input, isDark && { backgroundColor: '#1a1a1a', color: '#fff', borderColor: '#333' }]}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={t('write_message')}
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={handleSendMessage}
                            disabled={isTyping || (!inputText.trim() && !selectedImage)}
                            style={[styles.sendButton, (!inputText.trim() && !selectedImage) && { opacity: 0.5 }]}
                        >
                            <Send size={20} color="#fff" />
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
        backgroundColor: '#fff',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerSafe: {
        backgroundColor: 'transparent',
        zIndex: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'transparent'
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    configMenu: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
        width: 200
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8
    },
    configText: {
        fontSize: 14
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%'
    },
    userRow: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end'
    },
    assistantRow: {
        alignSelf: 'flex-start'
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#a855f7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 4
    },
    bubble: {
        padding: 12,
        borderRadius: 20
    },
    userBubble: {
        backgroundColor: '#a855f7',
        borderBottomRightRadius: 4
    },
    assistantBubble: {
        backgroundColor: '#f3f4f6',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    userText: {
        color: '#fff',
        fontSize: 16
    },
    assistantText: {
        color: '#000',
        fontSize: 16
    },
    inputContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: '#fff'
    },
    input: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#a855f7',
        alignItems: 'center',
        justifyContent: 'center'
    }
});
