import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, withDelay, FadeIn } from 'react-native-reanimated';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { elevenLabsService } from '../../../lib/ElevenLabsService';
import { callLimitService, VOICE_LIMITS_MINUTES } from '../../../lib/CallLimitService';
import { supabase } from '../../../lib/supabase';

// --- CONFIG ---
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// --- PREMIUM ORB COMPONENT ---
// --- PREMIUM ORB COMPONENT ---
const PremiumOrb = ({ state, volume = 0 }: { state: 'idle' | 'listening' | 'thinking' | 'speaking', volume?: number }) => {
    // Shared values for 3 distinct rings
    const scale1 = useSharedValue(1);
    const scale2 = useSharedValue(1);
    const scale3 = useSharedValue(1);
    const coreColor = useSharedValue('#8b5cf6');

    // React to Volume (Metering) when Listening
    useEffect(() => {
        if (state === 'listening') {
            // Map volume (-160dB to 0dB) to scale multiplier (1.0 to 2.5)
            // Typical speech is around -40dB to -10dB. Silence is -160dB.
            // Normalize: (volume + 160) / 160 -> 0 to 1.
            // But usually we get values like -50 (quiet) to -10 (loud).
            // Let's ensure volume is a number. Expo metering is usually float.

            // For visual pop:
            const raw = Math.max(volume, -60); // Clamp bottom
            const normalized = (raw + 60) / 60; // 0 to 1 range approx for active speech
            const pop = 1 + (normalized * 0.8); // 1.0 to 1.8

            scale1.value = withSpring(pop, { damping: 10, stiffness: 100 });
            scale2.value = withDelay(50, withSpring(pop * 0.9, { damping: 10, stiffness: 100 }));
            scale3.value = withDelay(100, withSpring(pop * 0.8, { damping: 10, stiffness: 100 }));
            coreColor.value = withTiming('#ef4444'); // Red
            return;
        }

        switch (state) {
            case 'idle':
                scale1.value = withRepeat(withTiming(1.2, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true);
                scale2.value = withDelay(400, withRepeat(withTiming(1.2, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true));
                scale3.value = withDelay(800, withRepeat(withTiming(1.3, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true));
                coreColor.value = withTiming('#8b5cf6'); // Violet
                break;
            case 'thinking':
                scale1.value = withRepeat(withTiming(0.9, { duration: 300 }), -1, true);
                scale2.value = withRepeat(withTiming(0.95, { duration: 350 }), -1, true);
                scale3.value = withRepeat(withTiming(1.0, { duration: 400 }), -1, true);
                coreColor.value = withTiming('#3b82f6'); // Blue
                break;
            case 'speaking':
                scale1.value = withRepeat(withTiming(1.8, { duration: 800 }), -1, true);
                scale2.value = withRepeat(withTiming(1.6, { duration: 900 }), -1, true);
                scale3.value = withRepeat(withTiming(1.4, { duration: 1000 }), -1, true);
                coreColor.value = withTiming('#10b981'); // Green
                break;
        }
    }, [state, volume]);

    const s1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }], opacity: 0.3, backgroundColor: coreColor.value }));
    const s2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }], opacity: 0.2, backgroundColor: coreColor.value }));
    const s3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }], opacity: 0.1, backgroundColor: coreColor.value }));
    const coreStyle = useAnimatedStyle(() => ({ backgroundColor: coreColor.value }));

    return (
        <View style={styles.orbWrapper}>
            <Animated.View style={[styles.ring, { width: 100, height: 100 }, s3]} />
            <Animated.View style={[styles.ring, { width: 80, height: 80 }, s2]} />
            <Animated.View style={[styles.ring, { width: 60, height: 60 }, s1]} />

            {/* Core */}
            <Animated.View style={[styles.core, coreStyle]}>
                <Ionicons name="mic" size={32} color="white" />
            </Animated.View>
        </View>
    );
};

export default function ActiveCallScreen() {
    const router = useRouter();
    const { profileId, name, voiceId } = useLocalSearchParams<{ profileId: string, name: string, voiceId: string }>();

    // States
    const [callState, setCallState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [statusText, setStatusText] = useState('Mantén presionado para hablar');
    const [usagePercent, setUsagePercent] = useState(0);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentVolume, setCurrentVolume] = useState(-160); // Metering dB

    // Context/Memory (Last 2 exchanges for context)
    const conversationHistory = useRef<string[]>([]);

    // Dynamic Logic
    const [systemPrompt, setSystemPrompt] = useState('');

    // Lifecycle
    useEffect(() => {
        const setup = async () => {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            await loadProfileData();
            checkLimits(); // Initial check
        };
        setup();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    // Load Profile Data (Master Prompt & Relationship)
    const loadProfileData = async () => {
        try {
            // VALIDATION: Check if profileId is a valid UUID (UUID pattern)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);

            let data = null;

            if (isUUID) {
                // Safe Select: Try to get data, handle missing columns gracefully
                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select('*') // Select all to avoid column errors
                    .eq('id', profileId)
                    .single();

                if (!error) data = profileData;
                else console.warn('Supabase Load Error:', error.message);
            } else {
                console.warn('[Call] Using Non-UUID Profile ID (Mock/Dev):', profileId);
            }

            if (!data) {
                // Fallback for dev/mock profiles
                setSystemPrompt(`
                    Actúa como mi Ex pareja.
                    Tu nombre es ${name || 'Ex'}.
                    Personalidad: Sarcástica, directa pero con momentos de vulnerabilidad.
                `);
                return;
            }

            // Construct Dynamic Prompt
            const relType = data.relationship_type || 'ex';
            const baseMap: Record<string, string> = {
                'ex': 'Actúa como mi Ex pareja.',
                'partner': 'Actúa como mi Pareja actual.',
                'crush': 'Actúa como mi Crush (interés romántico).',
                'friend': 'Actúa como mi mejor amigo/a.',
                'family': 'Actúa como un familiar cercano.',
                'fallecido': 'Actúa como una persona fallecida muy querida (simulación de memoria).'
            };

            const coreInstruction = baseMap[relType] || baseMap['ex'];
            const personality = data.master_prompt
                ? `PERSONALIDAD PROFUNDA (EXTRACTO): ${data.master_prompt.substring(0, 500)}...`
                : 'Personalidad: Sarcástica y directa.';

            setSystemPrompt(`
                ${coreInstruction}
                Tu nombre es ${data.name || name}.
                ${personality}
                
                CONTEXTO: Estás en una LLAMADA TELEFÓNICA con el usuario.
                INSTRUCCIONES CLAVE:
                1. TUS RESPUESTAS DEBEN SER CORTAS (Máximo 2 o 3 oraciones). Es una charla hablada, no un email.
                2. Actúa natural, usa muletillas si cuadra con la personalidad ("este...", "o sea").
                3. Reacciona al tono de voz del usuario (si suena triste, sé empático/a; si suena feliz, síguele el rollo).
            `);

        } catch (e) {
            console.error('Error constructing prompt', e);
            // Emergency Fallback
            setSystemPrompt(`Actúa como mi Ex pareja. Tu nombre es ${name}.`);
        }
    };

    // 1. Check Limits
    const checkLimits = async () => {
        // Mock Session if needed logic is upstream usually, but safe check here
        const { data: { session } } = await supabase.auth.getSession();
        let userId = session?.user?.id;

        if (!userId && __DEV__) userId = 'mock_user_id_dev'; // Bypass

        if (!userId) return;

        // Bypass check strict for mock
        if (userId === 'mock_user_id_dev') {
            setUsagePercent(10);
            return;
        }

        const status = await callLimitService.checkUsageStatus(userId);
        setUsagePercent(status.usagePercent);

        if (!status.canCall) {
            // Keep alert for mobile, but mostly just route back
            if (Platform.OS !== 'web') Alert.alert('Límite Alcanzado', 'Has usado todos tus minutos.');
            console.warn('Limit Reached');
            // router.back(); // Optional: Don't kick out immediately in dev
            return;
        }

        // Warnings
        if (status.usagePercent >= 90) setStatusText('⚠️ ALERTA: 90% de uso. Te queda poco.');
        else if (status.usagePercent >= 70) setStatusText('Nota: 70% de tus minutos usados.');
    };

    // 2. Start Recording (Tap Down)
    const startRecording = async () => {
        try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setCallState('listening');
            setStatusText('Escuchando...');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    // 3. Stop Recording & Process (Tap Up)
    const stopRecording = async () => {
        if (!recording) return;
        setCallState('thinking');
        setStatusText('Procesando...');

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
            await processAudioResponse(uri);
        }
    };

    // 4. THE BRAIN: Send Audio to Gemini -> Get Text -> Send to ElevenLabs
    const processAudioResponse = async (audioUri: string) => {
        try {
            // A. Audio to Text + Brain (Gemini 1.5 Flash accepts audio!)
            let base64Audio = '';

            if (Platform.OS === 'web') {
                // WEB FIX: Read Blob URL -> Base64
                const res = await fetch(audioUri);
                const blob = await res.blob();
                base64Audio = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                // NATIVE: FileSystem
                base64Audio = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            }

            // UPGRADE: Using Gemini 2.0 Flash (Experimental) for speed/quality
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            // Contexto mínimo para no gastar tokens
            const finalPrompt = `
                ${systemPrompt || 'Actúa como mi Ex.'}
                
                HISTORIAL RECIENTE: ${conversationHistory.current.join(' | ')}
                
                INSTRUCCIÓN: Usuario te dice algo (en el audio adjunto). RESPÓNDELE CORTANTE Y REALISTA (Max 2 frases).
            `;

            const result = await model.generateContent([
                finalPrompt,
                { inlineData: { data: base64Audio, mimeType: 'audio/m4a' } } // Expo records m4a usually
            ]);

            const replyText = result.response.text();
            console.log('Gemini Reply:', replyText);

            // Update History
            conversationHistory.current.push(`Ex: ${replyText}`);
            if (conversationHistory.current.length > 4) conversationHistory.current.shift();

            // B. Text to Speech (ElevenLabs Turbo)
            const audioPath = await elevenLabsService.streamTextToSpeech(replyText, voiceId);

            // C. Play Audio
            await playResponse(audioPath, replyText);

        } catch (error: any) {
            console.error('Process Error:', error);
            setStatusText('Error de conexión ❌');
            setCallState('idle');
            Alert.alert('Error', error.message || 'Error procesando respuesta');
        }
    };

    // 5. Play Response & Count Usage
    const playResponse = async (uri: string, text: string) => {
        try {
            setCallState('speaking');
            setStatusText(text.substring(0, 30) + '...'); // Subtitles roughly

            // Configure for playback
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

            const { sound: playbackSound, status } = await Audio.Sound.createAsync({ uri });
            setSound(playbackSound);

            // Get duration for billing
            // @ts-ignore
            const durationSec = status.durationMillis ? (status.durationMillis / 1000) : 0;

            await playbackSound.playAsync();

            // When done
            playbackSound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setCallState('idle');
                    setStatusText('Tu turno...');

                    // BILLING: Log usage (skip if mock)
                    const { data: { session } } = await supabase.auth.getSession();
                    const userId = session?.user?.id;
                    if (userId && userId !== 'mock_user_id_dev') {
                        await callLimitService.logUsage(userId, profileId, durationSec);
                        checkLimits(); // Re-check limits
                    }
                }
            });

        } catch (error) {
            console.error('Playback Error', error);
            setCallState('idle');
        }
    };

    const disconnect = () => {
        if (sound) sound.unloadAsync();
        router.back();
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#1F1F2E', '#312e81']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.profileContainer}>
                    {/* Placeholder Avatar */}
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{name?.[0] || 'E'}</Text>
                    </View>
                    <Text style={styles.nameText}>{name || 'Ex Desconocido'}</Text>
                    <View style={styles.liveBadge}>
                        <View style={styles.dot} />
                        <Text style={styles.liveText}>LLAMADA EN VIVO</Text>
                    </View>
                </View>
            </View>

            {/* Main Visualizer */}
            <View style={styles.visualizer}>
                <PremiumOrb state={callState} />
            </View>

            {/* Usage Warning */}
            {usagePercent > 50 && (
                <View style={styles.warningPill}>
                    <Text style={[styles.warningText, usagePercent > 90 && { color: '#EF4444' }]}>
                        Uso: {usagePercent.toFixed(1)}%
                    </Text>
                </View>
            )}

            {/* Status Text */}
            <Text style={styles.statusTextMain}>{statusText}</Text>

            {/* Controls */}
            <View style={styles.controls}>
                {/* Hangup */}
                <TouchableOpacity onPress={disconnect} style={styles.hangupButton}>
                    <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>

                {/* Talk Button (Hold) */}
                <TouchableOpacity
                    style={[styles.talkButton, callState === 'listening' ? styles.talkButtonActive : null]}
                    onPressIn={() => callState === 'idle' && startRecording()}
                    onPressOut={() => callState === 'listening' && stopRecording()}
                    disabled={callState === 'thinking' || callState === 'speaking'}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={callState === 'thinking' ? "ellipsis-horizontal" : "mic"}
                        size={40}
                        color="white"
                    />
                </TouchableOpacity>

                {/* Mute (Dummy for UI balance) */}
                <TouchableOpacity style={styles.secondaryButton}>
                    <Ionicons name="mic-off-outline" size={28} color="#64748B" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black', justifyContent: 'space-between' },
    header: { paddingTop: 60, alignItems: 'center' },
    profileContainer: { alignItems: 'center' },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    avatarText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    nameText: { color: 'white', fontSize: 24, fontWeight: '600', letterSpacing: 0.5 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    liveText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },

    visualizer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Premium Orb Styles
    orbWrapper: { width: 300, height: 300, justifyContent: 'center', alignItems: 'center' },
    ring: { position: 'absolute', borderRadius: 150 }, // radius = width/2
    core: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#fff', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },

    statusTextMain: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 18, marginBottom: 20, paddingHorizontal: 40, fontWeight: '500' },

    warningPill: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, marginBottom: 10 },
    warningText: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold' },

    controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 50, paddingHorizontal: 20 },
    hangupButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    talkButton: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    talkButtonActive: { backgroundColor: 'rgba(239, 68, 68, 0.4)', borderColor: '#ef4444', transform: [{ scale: 1.1 }] },
    secondaryButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }
});
