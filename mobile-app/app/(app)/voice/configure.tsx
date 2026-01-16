import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withDelay, FadeIn } from 'react-native-reanimated';
import { elevenLabsService } from '../../../lib/ElevenLabsService';
import { callLimitService } from '../../../lib/CallLimitService';
import { supabase } from '../../../lib/supabase';
import { AudioLines, Sparkles, CloudUpload, Info, CheckCircle2, ChevronLeft, Mic } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB Limit

// Enhanced Neural Orb
const PremiumOrb = ({ isActive }: { isActive: boolean }) => {
    // Shared values for 3 distinct rings
    const scale1 = useSharedValue(1);
    const scale2 = useSharedValue(1);
    const scale3 = useSharedValue(1);

    useEffect(() => {
        if (isActive) {
            scale1.value = withRepeat(withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true);
            scale2.value = withDelay(400, withRepeat(withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true));
            scale3.value = withDelay(800, withRepeat(withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true));
        } else {
            scale1.value = withTiming(1);
            scale2.value = withTiming(1);
            scale3.value = withTiming(1);
        }
    }, [isActive]);

    const s1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }], opacity: 0.3 }));
    const s2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }], opacity: 0.2 }));
    const s3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }], opacity: 0.1 }));

    return (
        <View style={styles.orbWrapper}>
            <Animated.View style={[styles.ring, { width: 100, height: 100, backgroundColor: '#3b82f6' }, s3]} />
            <Animated.View style={[styles.ring, { width: 80, height: 80, backgroundColor: '#8b5cf6' }, s2]} />
            <Animated.View style={[styles.ring, { width: 60, height: 60, backgroundColor: '#ec4899' }, s1]} />

            {/* Core */}
            <LinearGradient
                colors={['#3b82f6', '#8b5cf6']}
                style={styles.core}
            >
                <Mic size={24} color="white" />
            </LinearGradient>
        </View>
    );
};

export default function VoiceConfigScreen() {
    const router = useRouter();
    const { profileId, name } = useLocalSearchParams<{ profileId: string, name: string }>();
    const [audioFiles, setAudioFiles] = useState<any[]>([]);
    const [isCloning, setIsCloning] = useState(false);
    const [statusText, setStatusText] = useState('Sube 3 audios de WhatsApp');

    // NEW: Existing Voice State
    const [existingVoiceId, setExistingVoiceId] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState(true);

    // Check for existing voice on mount
    useEffect(() => {
        checkExistingVoice();
    }, [profileId]);

    const checkExistingVoice = async () => {
        try {
            console.log('[VoiceConfig] Checking existing voice for profile:', profileId);

            // 1. Check if we have a valid UUID for Supabase
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);

            if (!isUUID) {
                // DEV Mock Logic
                if (__DEV__ && profileId.startsWith('profile_')) {
                    // Check if we "faked" a voice before (could use localstorage, but for now just assume no unless hardcoded)
                    // If you want to persist mock voice, you'd need a store.
                    setLoadingVoice(false);
                    return;
                }
                setLoadingVoice(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('voice_id')
                .eq('id', profileId)
                .single();

            if (data?.voice_id) {
                console.log('[VoiceConfig] Found valid voice_id:', data.voice_id);
                setExistingVoiceId(data.voice_id);
                setStatusText('Voz Activa y Lista');
            }
        } catch (e) {
            console.error('[VoiceConfig] Error checking voice:', e);
        } finally {
            setLoadingVoice(false);
        }
    };

    const navigateToCall = (vId: string) => {
        router.replace({ pathname: '/(app)/voice/call', params: { profileId, name, voiceId: vId } });
    };

    const pickAudio = async () => {
        if (audioFiles.length >= 3) {
            Alert.alert('Límite alcanzado', 'Solo 3 audios son necesarios.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
                multiple: true
            });

            if (!result.canceled && result.assets) {
                // Filter size
                const validFiles = result.assets.filter(f => {
                    if (f.size && f.size > MAX_FILE_SIZE) {
                        Alert.alert('Archivo Muy Grande', `El archivo ${f.name} excede 10MB.`);
                        return false;
                    }
                    return true;
                });

                const newFiles = [...audioFiles, ...validFiles].slice(0, 3);
                setAudioFiles(newFiles);
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...audioFiles];
        newFiles.splice(index, 1);
        setAudioFiles(newFiles);
    };

    const startCloning = async () => {
        console.log('[VoiceConfig] Start Cloning pressed');

        if (audioFiles.length < 1) {
            console.log('[VoiceConfig] No audio files');
            Alert.alert('Falta Audio', 'Sube al menos un audio.');
            return;
        }

        console.log('[VoiceConfig] Getting session...');
        // Use getSession first (faster/local)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Define userId here
        let userId = session?.user?.id;

        if (sessionError) console.error('[VoiceConfig] Session Error:', sessionError);

        // Fallback: Try getUser if session is null (sometimes needed to refresh)
        if (!userId) {
            console.log('[VoiceConfig] No session, trying getUser...');
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (user) userId = user.id;
            if (userError) console.error('[VoiceConfig] GetUser Error:', userError);
        }

        if (!userId) {
            console.error('[VoiceConfig] No user found');
            Alert.alert(
                'Sesión Expirada',
                'No se encontró tu usuario. Por favor cierra sesión y vuelve a entrar.',
                [{ text: 'Entendido' }]
            );
            return;
        }
        console.log('[VoiceConfig] User found:', userId);

        try {
            console.log('[VoiceConfig] Checking usage limits...');

            const usage = await callLimitService.checkUsageStatus(userId);

            console.log('[VoiceConfig] Usage status:', JSON.stringify(usage, null, 2));

            if (!usage.canCall && !__DEV__) {
                console.log('[VoiceConfig] Limit reached or no sub');
                Alert.alert('Requiere Premium', 'Necesitas una suscripción activa.');
                return;
            }

            // Start UI State
            setIsCloning(true);
            setStatusText('Analizando biometría de voz...');

            console.log('[VoiceConfig] Preparing files for ElevenLabs upload...');
            const fileUris = audioFiles.map(f => f.uri);
            console.log('[VoiceConfig] File URIs to upload:', fileUris);

            console.log('[VoiceConfig] Calling ElevenLabsService.cloneVoice...');

            // Call Service
            const result = await elevenLabsService.cloneVoice(name || 'Ex', fileUris);
            console.log('[VoiceConfig] ElevenLabs result:', result);

            setStatusText('¡Voz Sintetizada Correctamente!');

            console.log('[VoiceConfig] Updating Supabase profile with voice_id:', result.voiceId);

            console.log('[VoiceConfig] Updating Supabase profile with voice_id:', result.voiceId);

            // Only update Supabase if real user

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ voice_id: result.voiceId })
                .eq('id', profileId);

            if (updateError) {
                console.error('[VoiceConfig] Supabase update error:', updateError);
            }


            console.log('[VoiceConfig] Naivgating in 1.2s...');

            setTimeout(() => {
                router.replace({ pathname: '/(app)/voice/call', params: { profileId, name, voiceId: result.voiceId } });
            }, 1200);

        } catch (error: any) {
            console.error('[VoiceConfig] Process Failed:', error);
            Alert.alert('Error', error.message || 'Error desconocido al clonar.');
            setIsCloning(false);
            setStatusText('Error en el proceso');
        }
    };

    // Overlay Component
    const LoadingOverlay = () => (
        <Animated.View
            style={[styles.overlay, StyleSheet.absoluteFill]}
            entering={FadeIn.duration(500)}
        >
            <PremiumOrb isActive={true} />
            <Text style={styles.overlayText}>{statusText}</Text>
            <Text style={styles.overlaySubtext}>Conectando con red neuronal...</Text>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            {isCloning && <LoadingOverlay />}

            {/* Deep Space Background */}
            <LinearGradient
                colors={['#000000', '#111827', '#1e1b4b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(139, 92, 246, 0.1)']}
                style={[StyleSheet.absoluteFill, { top: 0, height: 400 }]}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            // Fallback if history is lost (e.g. dev reload)
                            router.replace('/(tabs)');
                        }
                    }}
                    style={styles.backButton}
                >
                    <ChevronLeft size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Voz Neural IA</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Hero Visualizer */}
                <View style={styles.heroSection}>
                    <PremiumOrb isActive={isCloning || !!existingVoiceId} />
                    {!isCloning && (
                        <View style={[styles.statusBadge, existingVoiceId && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            {existingVoiceId ? (
                                <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 6 }} />
                            ) : (
                                <Sparkles size={16} color="#c4b5fd" style={{ marginRight: 6 }} />
                            )}
                            <Text style={[styles.statusText, existingVoiceId && { color: '#10b981' }]}>
                                {existingVoiceId ? 'Voz Activa' : statusText}
                            </Text>
                        </View>
                    )}
                </View>

                {loadingVoice ? (
                    <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
                ) : existingVoiceId ? (
                    // === EXISTING VOICE UI ===
                    <View style={styles.readyContainer}>
                        <View style={styles.glassCard}>
                            <View style={styles.cardHeader}>
                                <CheckCircle2 size={24} color="#10b981" />
                                <Text style={[styles.cardTitle, { color: '#10b981', fontSize: 18 }]}>Voz Configurada</Text>
                            </View>
                            <Text style={styles.cardBody}>
                                La voz de {name} ya está clonada y lista en tu red neuronal. No necesitas subir más audios.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => setExistingVoiceId(null)}
                        >
                            <Text style={styles.resetText}>Recalibrar / Cambiar Voz</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // === SETUP UI ===
                    <>
                        {/* Info Card */}
                        <View style={styles.glassCard}>
                            <View style={styles.cardHeader}>
                                <Info size={18} color="#a78bfa" />
                                <Text style={styles.cardTitle}>Instrucciones de Clonación</Text>
                            </View>
                            <Text style={styles.cardBody}>
                                **Truco Rápido (Sin exportar chat):**
                                {"\n\n"}
                                1. Ve a WhatsApp y busca un audio de **la persona**.
                                {"\n"}
                                2. Mantén presionado → Compartir → Guardar en Archivos.
                                {"\n"}
                                3. **Calidad de Audio:**
                                {"\n"}
                                • Evita ruidos de fondo (viento, música).
                                {"\n"}
                                • Que hable **SOLO esa persona**.
                            </Text>
                        </View>

                        {/* Upload Area */}
                        <View style={styles.uploadSection}>
                            {audioFiles.map((file, index) => (
                                <View key={index} style={styles.fileRow}>
                                    <View style={styles.fileIcon}>
                                        <AudioLines size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                    <TouchableOpacity onPress={() => removeFile(index)}>
                                        <Ionicons name="close-circle" size={22} color="#f87171" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {audioFiles.length < 3 && (
                                <TouchableOpacity
                                    style={styles.uploadButton}
                                    onPress={pickAudio}
                                    disabled={isCloning}
                                >
                                    <LinearGradient
                                        colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                                        style={styles.uploadGradient}
                                    >
                                        <CloudUpload size={24} color="#60a5fa" />
                                        <Text style={styles.uploadText}>Seleccionar Audio</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

            </ScrollView>

            {/* Bottom Floating Button */}
            <View style={styles.footer}>
                {!isCloning && !loadingVoice && (
                    <>
                        <TouchableOpacity
                            onPress={() => existingVoiceId ? navigateToCall(existingVoiceId) : startCloning()}
                            disabled={!existingVoiceId && audioFiles.length === 0}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={
                                    existingVoiceId
                                        ? ['#10b981', '#059669', '#047857'] // Green for Start
                                        : audioFiles.length > 0 ? ['#3b82f6', '#8b5cf6', '#ec4899'] : ['#1e293b', '#334155']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.mainButton}
                            >
                                <Text style={styles.mainButtonText}>
                                    {existingVoiceId ? 'INICIAR LLAMADA' : 'ACTIVAR MODO VOZ'}
                                </Text>
                                {existingVoiceId ? (
                                    <Ionicons name="call" size={20} color="white" style={{ marginLeft: 8 }} />
                                ) : (
                                    <Sparkles size={20} color="white" style={{ marginLeft: 8 }} />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.disclaimer}>Uso responsable únicamente.</Text>
                    </>
                )}
            </View>
        </View>
    );
}

// Premium Black Theme Styles (Spacious)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#1e293b' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginLeft: 16, letterSpacing: 0.5, fontFamily: 'System' },

    scrollContent: { padding: 24, paddingBottom: 180 }, // Extra padding for breathing room

    // Overlay
    overlay: { backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    overlayText: { color: '#c4b5fd', fontSize: 20, fontWeight: '700', marginTop: 40, letterSpacing: 1 },
    overlaySubtext: { color: '#64748b', fontSize: 14, marginTop: 12 },

    // Hero
    heroSection: { alignItems: 'center', marginVertical: 36, marginTop: 16 },
    orbWrapper: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    ring: { position: 'absolute', borderRadius: 100, borderWidth: 1, borderColor: '#334155' }, // Wireframe style
    core: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', borderWidth: 1, borderColor: '#4f46e5', shadowColor: '#4f46e5', shadowOpacity: 0.8, shadowRadius: 20 },

    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: '#1e293b' },
    statusText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

    // Cards (Darker, Minimal)
    glassCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#1e293b' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', marginLeft: 10 },
    cardBody: { color: '#94a3b8', fontSize: 15, lineHeight: 26 },

    // Upload
    uploadSection: { gap: 12 },
    fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
    fileIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fileName: { flex: 1, color: '#f8fafc', fontSize: 14, fontWeight: '500' },

    uploadButton: { borderRadius: 16, overflow: 'hidden', height: 60, marginTop: 8 },
    uploadGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 16 },
    uploadText: { color: '#94a3b8', fontSize: 15, fontWeight: '600', marginLeft: 10 },

    // Footer
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.95)', borderTopWidth: 1, borderTopColor: '#1e293b' },
    mainButton: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 12 },
    mainButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
    disclaimer: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 16 },

    // Ready State
    readyContainer: { alignItems: 'center', marginTop: 0 },
    resetButton: { padding: 16, marginTop: 20 },
    resetText: { color: '#64748b', fontSize: 14, textDecorationLine: 'underline' }
});
