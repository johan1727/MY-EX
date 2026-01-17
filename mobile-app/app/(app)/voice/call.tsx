import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { elevenLabsService } from '../../../lib/ElevenLabsService';
import { callLimitService } from '../../../lib/CallLimitService';
import { supabase } from '../../../lib/supabase';
import OrganicOrb from '../../../components/OrganicOrb'; // Re-using the nice Orb
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

// --- HELPER: Pulse Rings for Visual Depth ---
const PulseRings = () => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        scale.value = withRepeat(withTiming(1.8, { duration: 2500, easing: Easing.out(Easing.ease) }), -1, false);
        opacity.value = withRepeat(withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }), -1, false);
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View
                    style={[
                        { width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                        style
                    ]}
                />
            </View>
        </View>
    );
};

// --- HELPER: Typewriter Component with Smooth Fade ---
const TypewriterText = ({ text, style, speed = 30 }: { text: string, style: any, speed?: number }) => {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayed(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text]);

    return (
        <Animated.Text entering={FadeIn.duration(400)} style={style}>
            {displayed}
            {/* Blinking Cursor - Classic Console Style but slimmer */}
            <Text style={{ opacity: 0.5, color: '#34d399', fontWeight: '200' }}>|</Text>
        </Animated.Text>
    );
};

// --- CONFIG ---
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

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
    const [systemPrompt, setSystemPrompt] = useState('');

    // Usage Tracking State
    const sessionSeconds = useRef(0);
    const lastLoggedSeconds = useRef(0);
    const usageTimer = useRef<NodeJS.Timeout | null>(null);

    // Lifecycle
    useEffect(() => {
        const setup = async () => {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            await loadProfileData();
            await checkLimits(); // Initial check
        };
        setup();

        // Start Usage Timer (Every 10 seconds check validity, Every minute log)
        usageTimer.current = setInterval(() => {
            sessionSeconds.current += 10;
            checkTimeAndLog();
        }, 10000); // 10s interval

        return () => {
            if (sound) sound.unloadAsync();
            if (usageTimer.current) clearInterval(usageTimer.current);

            // Log remaining unlogged time on exit (Best Effort)
            const pending = sessionSeconds.current - lastLoggedSeconds.current;
            if (pending > 0 && profileId) {
                const effectiveProfileId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId) ? profileId : '00000000-0000-0000-0000-000000000000';
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) callLimitService.logUsage(user.id, effectiveProfileId, pending);
                });
            }
        };
    }, []);

    const checkTimeAndLog = async () => {
        const pending = sessionSeconds.current - lastLoggedSeconds.current;

        // Log every 30 seconds to be safe
        if (pending >= 30) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const effectiveProfileId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId) ? profileId : '00000000-0000-0000-0000-000000000000';
                await callLimitService.logUsage(user.id, effectiveProfileId, pending);
                lastLoggedSeconds.current = sessionSeconds.current;

                // Refresh Status
                const status = await callLimitService.checkUsageStatus(user.id);
                setUsagePercent(status.usagePercent);
                if (!status.canCall) {
                    Alert.alert('Tiempo Agotado', 'Has alcanzado tu límite mensual.', [
                        { text: 'OK', onPress: () => disconnect() }
                    ]);
                    disconnect();
                } else if (status.minutesRemaining <= 2) {
                    setStatusText(`⚠️ Quedan ${status.minutesRemaining.toFixed(1)} min`);
                }
            }
        }
    };

    // Load Profile Data
    const loadProfileData = async () => {
        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
            let data = null;

            if (isUUID) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', profileId)
                    .single();
                data = profileData;
            }

            if (!data) {
                setSystemPrompt(`Actúa como mi Ex pareja. Tu nombre es ${name || 'Ex'}.`);
                return;
            }

            const relType = data.relationship_type || 'ex';
            const baseMap: Record<string, string> = {
                'ex': 'Actúa como mi Ex pareja.',
                'partner': 'Actúa como mi Pareja actual.',
                'crush': 'Actúa como mi Crush (interés romántico).',
                'friend': 'Actúa como mi mejor amigo/a.',
                'family': 'Actúa como un familiar cercano.',
                'fallecido': 'Actúa como una persona fallecida muy querida.'
            };

            const coreInstruction = baseMap[relType] || baseMap['ex'];
            const personality = data.master_prompt
                ? `PERSONALIDAD: ${data.master_prompt.substring(0, 500)}...`
                : 'Personalidad: Sarcástica y directa.';

            setSystemPrompt(`
                ${coreInstruction}
                Tu nombre es ${data.name || name}.
                ${personality}
                
                CONTEXTO: Conversación TELEFÓNICA REAL TIEMPO REAL.
                
                INSTRUCCIONES CRÍTICAS DE FORMATO:
                1. SOLO TEXTO HABLADO. NUNCA escribas acciones entre paréntesis ni corchetes.
                   - MAL: "(suspiro) Hola..." o "[tono molesto] ¿Qué quieres?" o "*Cuelga*"
                   - BIEN: "¿Qué quieres?"
                2. RESPUESTAS CORTAS (1-2 frases máximo). Es un chat de voz fluido.
                3. Tono: ${data.master_prompt ? 'Usa la personalidad definida.' : 'Sarcástica y directa.'}
                
                IMPORTANTE: Si el usuario no dice nada o hay ruido, di "¿Hola?" o "¿Sigues ahí?". NO inventes una conversación.
            `);

        } catch (e) {
            console.error('Error constructing prompt', e);
        }
    };

    const checkLimits = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        let userId = session?.user?.id;
        if (!userId && __DEV__) userId = 'mock_user_id_dev';
        if (!userId) return;
        if (userId === 'mock_user_id_dev') return;

        const status = await callLimitService.checkUsageStatus(userId);
        setUsagePercent(status.usagePercent);

        if (!status.canCall) {
            if (Platform.OS !== 'web') {
                Alert.alert('Límite Alcanzado', 'Tu plan no tiene minutos disponibles o se han agotado.', [
                    { text: 'Entendido', onPress: () => disconnect() }
                ]);
            } else {
                // For web, use Alert.alert which will show a better modal
                Alert.alert(
                    'Límite Alcanzado',
                    'Tu plan no tiene minutos disponibles o se han agotado. Por favor actualiza tu plan.',
                    [{ text: 'Entendido', onPress: () => disconnect() }]
                );
            }
        }
    };

    const startRecording = async () => {
        try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.metering) setCurrentVolume(status.metering);
                },
                100
            );
            setRecording(recording);
            setCallState('listening');
            setStatusText('Escuchando...');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setCallState('thinking');
        setStatusText('Pensando...');

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
            await processAudioResponse(uri);
        }
    };

    const processAudioResponse = async (audioUri: string) => {
        try {
            let base64Audio = '';
            if (Platform.OS === 'web') {
                const res = await fetch(audioUri);
                const blob = await res.blob();
                base64Audio = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                base64Audio = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const finalPrompt = `
                ${systemPrompt || 'Actúa como mi Ex.'}
                HISTORIAL RECIENTE: ${conversationHistory.current.join(' | ')}
                
                Instrucción: El usuario te acaba de enviar un audio. Responde de forma hablada y natural.
            `;

            const result = await model.generateContent([
                finalPrompt,
                { inlineData: { data: base64Audio, mimeType: 'audio/m4a' } }
            ]);

            const cleanReply = result.response.text()
                .replace(/[\(\[\{].*?[\)\]\}]/g, '') // Remove (text), [text], {text}
                .replace(/\*.*?\*/g, '')             // Remove *text*
                .trim();

            conversationHistory.current.push(`Ex: ${cleanReply}`);
            if (conversationHistory.current.length > 4) conversationHistory.current.shift();

            // Start TTS with CLEAN text
            const audioPath = await elevenLabsService.streamTextToSpeech(cleanReply, voiceId);
            await playResponse(audioPath, cleanReply);

        } catch (error: any) {
            console.error('Process Error:', error);
            setStatusText('Error de conexión');
            setCallState('idle');
        }
    };

    const playResponse = async (uri: string, text: string) => {
        try {
            setCallState('speaking');
            setStatusText(text); // Pass full text, UI will type it out

            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const { sound: playbackSound, status } = await Audio.Sound.createAsync({ uri });
            setSound(playbackSound);

            // @ts-ignore
            const durationSec = status.durationMillis ? (status.durationMillis / 1000) : 0;
            await playbackSound.playAsync();

            playbackSound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setCallState('idle');
                    setStatusText('Tu turno...');
                }
            });

        } catch (error) {
            console.error('Playback Error', error);
            setCallState('idle');
        }
    };

    const disconnect = () => {
        if (sound) sound.unloadAsync();
        if (router.canGoBack()) {
            router.back();
        } else {
            if (Platform.OS === 'web') window.history.back();
            else router.replace('/');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#09090b', '#18181b', '#000000']}
                locations={[0, 0.4, 0.9]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <BlurView intensity={20} tint="dark" style={styles.liveTagContainer}>
                    <View style={[styles.dot, Platform.OS === 'web' && { backgroundColor: '#10b981' }]} />
                    <Text style={styles.liveText}>REMI LIVE</Text>
                </BlurView>
            </View>

            {/* Main Visualizer */}
            <View style={styles.centerContent}>
                {callState === 'speaking' && <PulseRings />}
                <OrganicOrb state={callState} volume={currentVolume} />

                {/* Floating Glass Card for Text */}
                <View style={styles.textCard}>
                    {callState === 'speaking' ? (
                        <TypewriterText
                            text={statusText}
                            style={styles.mainStatus}
                            speed={35}
                        />
                    ) : (
                        <Text style={[styles.mainStatus, { opacity: 0.6, fontSize: 16 }]}>
                            {statusText === 'Thinking...' ? 'Pensando...' : statusText}
                        </Text>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.bottomBar}>
                <View style={{ width: 60 }} />

                {/* Talk Button (Hold) */}
                <TouchableOpacity
                    style={[
                        styles.talkButton,
                        callState === 'listening' ? styles.talkButtonActive : null
                    ]}
                    onPressIn={() => callState === 'idle' && startRecording()}
                    onPressOut={() => callState === 'listening' && stopRecording()}
                    disabled={callState === 'thinking' || callState === 'speaking'}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={callState === 'thinking' ? "ellipsis-horizontal" : "mic"}
                        size={32}
                        color="white"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={disconnect} style={styles.hangupButton}>
                    <Ionicons name="close" size={28} color="white" />
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
    liveTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden'
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 8 },
    liveText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase'
    },

    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 5
    },
    textCard: {
        marginTop: 50,
        width: '90%',
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100
    },
    mainStatus: {
        color: 'white',
        fontSize: 20,
        fontWeight: '500', // Cleaner weight
        textAlign: 'center',
        lineHeight: 28,
        //Clean Sans-Serif system font
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
    talkButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    talkButtonActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        transform: [{ scale: 1.05 }]
    },
    hangupButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
