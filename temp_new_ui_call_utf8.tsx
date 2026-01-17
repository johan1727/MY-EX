import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, withDelay, useDerivedValue, interpolate } from 'react-native-reanimated';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BlurView } from 'expo-blur';
import OrganicOrb from '../../../components/OrganicOrb';
import { elevenLabsService } from '../../../lib/ElevenLabsService';
import { callLimitService } from '../../../lib/CallLimitService';
import { supabase } from '../../../lib/supabase';


const { width, height } = Dimensions.get('window');

// --- CONFIG ---
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
const VAD_THRESHOLD = -45; // dB
const SILENCE_DURATION = 1500; // ms to trigger end of speech



export default function ActiveCallScreen() {
    const router = useRouter();
    const { profileId, name, voiceId } = useLocalSearchParams<{ profileId: string, name: string, voiceId: string }>();

    // States
    const [callState, setCallState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [statusText, setStatusText] = useState('Conectando...');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentVolume, setCurrentVolume] = useState(-160);

    // VAD Refs
    const lastSpeechTime = useRef<number>(Date.now());
    const isSpeaking = useRef(false);
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);

    // Context/Memory
    const conversationHistory = useRef<string[]>([]);
    const [systemPrompt, setSystemPrompt] = useState('');

    // State for user ID
    const [userId, setUserId] = useState<string | null>(null);

    const loadChatHistory = async () => {
        try {
            if (!profileId) return;
            const { data, error } = await supabase
                .from('chat_messages')
                .select('is_user, content')
                .eq('profile_id', profileId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                const history = data.reverse().map(msg =>
                    `${msg.is_user ? 'User' : 'Ex'}: ${msg.content}`
                );
                conversationHistory.current = history;
                console.log('[Call] Loaded history context:', history.length, 'messages');
            }
        } catch (e) {
            console.error('[Call] Error loading history:', e);
        }
    };

    // Lifecycle
    useEffect(() => {
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            await loadProfileData();
            await loadChatHistory(); // Load context

            // Auto-start listening after setup only on native
            if (Platform.OS !== 'web') {
                setTimeout(() => startRecording(), 500);
            }
        };
        setup();

        return () => {
            cleanup();
        };
    }, []);

    const cleanup = async () => {
        if (recording) await recording.stopAndUnloadAsync();
        if (sound) await sound.unloadAsync();
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };

    // Load Profile Data
    const loadProfileData = async () => {
        try {
            // ... existing loadProfileData logic (simplified for brevity) ...
            // CORRECTION: Select from ex_profiles
            const { data: profileData } = await supabase
                .from('ex_profiles')
                .select('*')
                .eq('id', profileId)
                .single();

            // Construct Prompt
            let instructions = "Act├║a como mi Ex.";
            if (profileData) {
                // Note: ex_profiles uses 'ex_name', not 'name' in some schemas, but let's check profile_data jsonb too
                const exName = profileData.ex_name || name;
                instructions = `Tu nombre es ${exName}. ${profileData.profile_data?.master_prompt || 'Personalidad: Sarc├ística.'}`;
            }

            setSystemPrompt(`
                 ${instructions}
                 CONTEXTO: LLAMADA DE VOZ (Audio).
                 INSTRUCCIONES:
                 1. Respuestas MUY CORTAS (1-2 oraciones). Conversacional.
                 2. Siente la emoci├│n del usuario.
             `);
        } catch (e) {
            console.log('Error loading profile', e);
        }
    };

    // --- VAD LOGIC ---
    const onAudioStatusUpdate = (status: Audio.RecordingStatus) => {
        if (!status.isRecording) return;

        // WEB FALLBACK: Metering is often unavailable on Web
        if (Platform.OS === 'web' || !status.metering) {
            // Only log once every 50 updates to avoid spam
            if (Math.random() < 0.02) console.log('[Call] VAD: Metering unavailable (Web mode)');
            return;
        }

        const volume = status.metering;
        setCurrentVolume(volume);

        if (volume > VAD_THRESHOLD) {
            // User is speaking
            isSpeaking.current = true;
            lastSpeechTime.current = Date.now();

            if (silenceTimer.current) {
                clearTimeout(silenceTimer.current);
                silenceTimer.current = null;
            }
        } else if (isSpeaking.current) {
            // Silence detected after speech
            const timeSinceSpeech = Date.now() - lastSpeechTime.current;

            if (!silenceTimer.current) {
                silenceTimer.current = setTimeout(() => {
                    console.log('VAD: Silence detected (1.5s), auto-stopping...');
                    stopRecording();
                    isSpeaking.current = false;
                }, SILENCE_DURATION);
            }
        }
    };

    // 2. Start Recording
    const startRecording = async () => {
        try {
            console.log('[Call] Starting recording...');
            if (recording) {
                await recording.stopAndUnloadAsync();
                setRecording(null);
            }
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                onAudioStatusUpdate,
                100
            );

            setRecording(newRecording);
            setCallState('listening');
            setStatusText(Platform.OS === 'web' ? 'Presiona el mic para enviar' : 'Escuchando...');
            isSpeaking.current = false;
            console.log('[Call] Recording started');
        } catch (err) {
            console.error('[Call] Failed to start recording', err);
            Alert.alert('Error Micr├│fono', 'No pudimos acceder al micr├│fono.');
        }
    };

    // 3. Stop & Process
    const stopRecording = async () => {
        if (!recording) return;

        setCallState('thinking');
        setStatusText('Pensando...');

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            console.log('[Call] Recording stopped, URI:', uri);

            if (uri) await processAudioResponse(uri);
        } catch (e) {
            console.error('[Call] Error stopping', e);
            startRecording();
        }
    };

    // Manual Toggle for Web/Override
    const handleMicPress = () => {
        if (callState === 'listening') {
            // If we are listening, STOP and SEND (Manual trigger)
            console.log('[Call] Manual Stop Triggered');
            stopRecording();
        } else if (callState === 'idle') {
            // If idle, START
            startRecording();
        }
    };

    // 4. Process Audio
    const processAudioResponse = async (audioUri: string) => {
        try {
            console.log('[Call] Processing Audio...');
            let base64Audio = '';
            let mimeType = 'audio/m4a';

            if (Platform.OS === 'web') {
                const res = await fetch(audioUri);
                const blob = await res.blob();
                console.log('[Call] Web Blob size:', blob.size, 'Type:', blob.type);
                mimeType = blob.type || 'audio/webm';
                base64Audio = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.readAsDataURL(blob);
                }) as string;
            } else {
                base64Audio = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            }

            console.log('[Call] Sending to Gemini with history...');

            // Build History Text for Context
            const historyText = conversationHistory.current.join('\n');
            const promptConfig = [
                { text: `PREVIOUS CONTEXT (History of chat):\n${historyText}\n\nUSER'S NEW AUDIO INPUT (Repond to this):` },
                { inlineData: { data: base64Audio, mimeType } }
            ];

            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                systemInstruction: systemPrompt
            });

            const result = await model.generateContent(promptConfig as any);
            const replyText = result.response.text();
            console.log('Gemini Reply:', replyText);

            // 1. Update Local History
            conversationHistory.current.push(`User: (Audio Message)`);
            conversationHistory.current.push(`Ex: ${replyText}`);
            if (conversationHistory.current.length > 20) conversationHistory.current = conversationHistory.current.slice(-20);

            // 2. Save to Supabase (Persistence)
            if (userId && profileId) {
                // Insert User Audio Placeholder
                await supabase.from('chat_messages').insert({
                    profile_id: profileId,
                    is_user: true,
                    content: '­ƒÄñ Mensaje de voz enviado',
                });

                // Insert Ex Response
                await supabase.from('chat_messages').insert({
                    profile_id: profileId,
                    is_user: false,
                    content: replyText,
                });
            }

            setStatusText('Sintetizando voz...');
            const audioPath = await elevenLabsService.streamTextToSpeech(replyText, voiceId);
            await playResponse(audioPath, replyText);

        } catch (error: any) {
            console.error('[Call] Processing error', error);
            setStatusText('Error: ' + error.message);
            // Retry logic removed to prevent loops
        }
    };

    // 5. Play Response
    const playResponse = async (uri: string, text: string) => {
        try {
            console.log('[Call] Playing response:', uri);
            setCallState('speaking');
            setStatusText(text);

            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

            // Web Logic: HTML5 Audio might be needed if Expo Sound fails on Blob URLs sometimes, but usually it works.
            const { sound: playbackSound } = await Audio.Sound.createAsync({ uri });
            setSound(playbackSound);

            await playbackSound.playAsync();

            playbackSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    console.log('[Call] Playback finished');
                    setCallState('idle');
                    // Auto-resume listening only on Mobile/Native (where VAD works)
                    if (Platform.OS !== 'web') {
                        setTimeout(() => startRecording(), 500);
                    } else {
                        setStatusText('Presiona para responder');
                    }
                }
            });

        } catch (error) {
            console.error('[Call] Playback error', error);
            startRecording();
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#111827']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <View style={[styles.liveTag, Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <View style={[styles.dot, Platform.OS === 'web' && { backgroundColor: '#fcd34d' }]} />
                    <Text style={styles.liveText}>{Platform.OS === 'web' ? 'WEB MODE' : 'Live'}</Text>
                </View>
            </View>

            <View style={styles.centerContent}>
                <OrganicOrb state={callState} volume={currentVolume} />
                <Text style={[styles.mainStatus, { marginTop: 40 }]}>
                    {statusText}
                </Text>
                {Platform.OS === 'web' && callState === 'listening' && (
                    <Text style={{ color: '#6b7280', marginTop: 10, fontSize: 12 }}>
                        (Presiona para enviar)
                    </Text>
                )}
            </View>

            {/* Subtle Gradient Footer instead of "Box" */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            <View style={styles.bottomBar}>
                {/* Spacer to balance Hangup button */}
                <View style={{ width: 56 }} />

                {/* MIC BUTTON - CENTERED */}
                <TouchableOpacity
                    style={[
                        styles.iconButton,
                        { width: 80, height: 80, borderRadius: 40, backgroundColor: callState === 'listening' ? 'white' : 'rgba(255,255,255,0.1)' }
                    ]}
                    onPress={handleMicPress}
                >
                    <Ionicons
                        name={callState === 'listening' ? "arrow-up" : "mic"}
                        size={36}
                        color={callState === 'listening' ? "black" : "white"}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { cleanup(); router.back(); }} style={styles.hangupButton}>
                    <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 60,
        zIndex: 10
    },
    liveTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
    liveText: { color: 'white', fontSize: 13, fontWeight: '600' },

    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        zIndex: 5
    },
    mainStatus: {
        color: 'white',
        fontSize: 24,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.9,
        lineHeight: 34
    },

    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 50,
        paddingTop: 20,
        zIndex: 20
    },
    iconButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hangupButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
