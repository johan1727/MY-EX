import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions, Platform, ActionSheetIOS } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withDelay, FadeIn, withSequence } from 'react-native-reanimated';
import { elevenLabsService } from '../../../lib/ElevenLabsService';
import { callLimitService } from '../../../lib/CallLimitService';
import { supabase } from '../../../lib/supabase';
import { AudioLines, Sparkles, CloudUpload, Info, CheckCircle2, ChevronLeft, Mic, Play, MoreVertical, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../../lib/ThemeContext';
import { useLanguage } from '../../../lib/i18n';

const { width } = Dimensions.get('window');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB Limit

// === COMPONENTS ===

/**
 * Premium Waveform Visualizer
 * Replaces the old Orb with a digital audio frequency visualization
 */
const WaveformVisualizer = ({ isActive }: { isActive: boolean }) => {
    // Generate 5 bars for the waveform
    const bars = [0, 1, 2, 3, 4];

    return (
        <View style={styles.waveformContainer}>
            {bars.map((i) => {
                const height = useSharedValue(10);

                useEffect(() => {
                    if (isActive) {
                        // Randomize heights for active state
                        height.value = withRepeat(
                            withSequence(
                                withTiming(Math.random() * 40 + 20, { duration: 200 + i * 50 }),
                                withTiming(10, { duration: 200 + i * 50 })
                            ),
                            -1,
                            true
                        );
                    } else {
                        height.value = withTiming(10);
                    }
                }, [isActive]);

                const style = useAnimatedStyle(() => ({
                    height: height.value,
                    opacity: isActive ? 1 : 0.5
                }));

                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.waveformBar,
                            style,
                            { backgroundColor: isActive ? '#a855f7' : '#4b5563' }
                        ]}
                    />
                );
            })}
        </View>
    );
};

export default function VoiceConfigScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const { profileId, name, force } = useLocalSearchParams<{ profileId: string, name: string, force?: string }>();
    const [audioFiles, setAudioFiles] = useState<any[]>([]);
    const [isCloning, setIsCloning] = useState(false);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        setStatusText(t('voice_lab_status_waiting'));
    }, [t]);
    const [existingVoiceId, setExistingVoiceId] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState(true);

    // Theme Colors
    const bgMain = isDark ? '#050505' : '#ffffff';
    const textMain = isDark ? '#ffffff' : '#111827';
    const textSub = isDark ? '#9ca3af' : '#6b7280';
    const cardBg = isDark ? '#111' : '#f9fafb';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
    const iconBg = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
    const headerBorder = isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6';

    // Initial Check
    useEffect(() => {
        checkExistingVoice();
    }, [profileId]);

    const checkExistingVoice = async () => {
        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
            if (!isUUID) {
                setLoadingVoice(false);
                return;
            }

            let voiceId: string | null = null;

            // Try Supabase first
            const { data, error } = await supabase
                .from('ex_profiles')
                .select('voice_id')
                .eq('id', profileId)
                .single();

            if (data?.voice_id) {
                voiceId = data.voice_id;
                console.log('[Voice Configure] ✅ Found voice_id in ex_profiles:', voiceId);
            } else if (error) {
                console.log('[Voice Configure] ⚠️ Supabase query failed:', error.message);
            }

            // FALLBACK: Check AsyncStorage if not found in DB
            if (!voiceId) {
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    voiceId = await AsyncStorage.getItem(`voice_${profileId}`);
                    if (voiceId) {
                        console.log('[Voice Configure] ✅ Found voice_id in AsyncStorage:', voiceId);
                    }
                } catch (storageErr) {
                    console.log('[Voice Configure] AsyncStorage check failed:', storageErr);
                }
            }

            if (voiceId) {
                if (force === 'true') {
                    // Recalibration requested, stay here
                    setExistingVoiceId(null);
                    console.log('[Voice Configure] Force recalibration - ignoring saved voice');
                } else {
                    setExistingVoiceId(voiceId);
                    // AUTO REDIRECT
                    console.log('[Voice Configure] Auto-redirecting to call with voice:', voiceId);
                    router.replace({ pathname: '/(app)/voice/call', params: { profileId, name, voiceId } });
                }
            } else {
                console.log('[Voice Configure] No existing voice found - ready for cloning');
            }
        } catch (e) {
            console.error('[Voice Configure] Error checking voice:', e);
        } finally {
            setLoadingVoice(false);
        }
    };

    // --- Actions ---

    const pickAudio = async () => {
        if (audioFiles.length >= 5) return;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
                multiple: true
            });

            if (!result.canceled && result.assets) {
                const validFiles = result.assets.filter(f => {
                    if (f.size && f.size > MAX_FILE_SIZE) {
                        Alert.alert('Archivo muy grande', `${f.name} excede 10MB.`);
                        return false;
                    }
                    return true;
                });
                setAudioFiles(current => [...current, ...validFiles].slice(0, 5));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const removeFile = (index: number) => {
        setAudioFiles(files => files.filter((_, i) => i !== index));
    };

    // Track mount state
    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const startCloning = async () => {
        if (audioFiles.length < 1) {
            Alert.alert('Falta Audio', 'Sube al menos un audio para clonar la voz.');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user && !__DEV__) {
            Alert.alert('Sesión expirada', 'Inicia sesión de nuevo.');
            return;
        }

        try {
            setIsCloning(true);
            setStatusText(t('voice_lab_analyzing'));

            // Simulate "Analyzing" phases for user feedback
            setTimeout(() => { if (isMounted.current) setStatusText(t('voice_lab_training')); }, 2000);

            // --- 1. UPLOAD TO SUPABASE STORAGE (BACKUP) ---
            setStatusText('Guardando respaldo seguro...');
            const uploadedPaths: string[] = [];

            for (const file of audioFiles) {
                try {
                    const ext = file.name ? file.name.split('.').pop() : 'm4a';
                    const path = `${session?.user?.id || 'anon'}/${profileId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

                    // Fetch blob from URI (Works on Expo/RN)
                    const response = await fetch(file.uri);
                    const blob = await response.blob();

                    const { error: uploadError } = await supabase.storage
                        .from('voice_samples')
                        .upload(path, blob, {
                            contentType: file.mimeType || 'audio/m4a',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error('Upload failed:', uploadError);
                        // Convert to string for alert
                        throw new Error(`Error subiendo audio: ${uploadError.message}`);
                    }

                    uploadedPaths.push(path);
                } catch (e) {
                    console.error('File process error:', e);
                    throw e;
                }
            }

            // Save paths to DB immediately
            const { error: dbPathError } = await supabase
                .from('ex_profiles')
                .update({ audio_paths: uploadedPaths })
                .eq('id', profileId);

            if (dbPathError) console.warn('Failed to save audio paths:', dbPathError);
            console.log(`[Voice Configure] Backed up ${uploadedPaths.length} files to Storage.`);

            // --- 2. CLONE VOICE ---
            setTimeout(() => { if (isMounted.current) setStatusText(t('voice_lab_synthesizing')); }, 1000);

            const fileUris = audioFiles.map(f => f.uri);
            // Pass profileId for tracking/tagging
            const result = await elevenLabsService.cloneVoice(name || 'Ex', fileUris, profileId);

            if (!isMounted.current) return;

            console.log('[Voice Configure] Voice cloned successfully:', result.voiceId);

            // Save to DB (with fallback to AsyncStorage for testing)
            try {
                const { error: saveError } = await supabase
                    .from('ex_profiles')
                    .update({ voice_id: result.voiceId })
                    .eq('id', profileId);

                if (saveError) {
                    console.error('[Voice Configure] ⚠️ DB Save failed:', saveError);
                    // FALLBACK: Save to AsyncStorage for testing/offline mode
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem(`voice_${profileId}`, result.voiceId);
                    console.log('[Voice Configure] ✅ Saved to AsyncStorage as fallback');
                } else {
                    console.log('[Voice Configure] ✅ Saved voice_id to Supabase ex_profiles');
                }
            } catch (dbErr) {
                console.error('[Voice Configure] DB Error:', dbErr);
                // Even if DB fails, continue with AsyncStorage fallback
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem(`voice_${profileId}`, result.voiceId);
                console.log('[Voice Configure] ✅ Fallback: Saved to AsyncStorage');
            }

            if (!isMounted.current) return;

            setExistingVoiceId(result.voiceId);
            setStatusText(t('voice_lab_success'));

            // Navigate after short delay
            setTimeout(() => {
                if (isMounted.current) {
                    setIsCloning(false);
                    router.replace({ pathname: '/(app)/voice/call', params: { profileId, name, voiceId: result.voiceId } });
                }
            }, 1000);

        } catch (error: any) {
            if (isMounted.current) {
                setIsCloning(false);
                console.error('[Voice Configure] Cloning failed:', error);
                Alert.alert('Error', error.message || 'No se pudo clonar la voz.');
            }
        }
    };

    const handleMenuPress = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancelar', 'Recalibrar Voz'],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: isDark ? 'dark' : 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleRecalibrate();
                    }
                }
            );
        } else {
            Alert.alert(
                'Opciones',
                '¿Desea volver a entrenar el modelo de voz?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Recalibrar', onPress: handleRecalibrate, style: 'destructive' }
                ]
            );
        }
    };

    const handleRecalibrate = () => {
        setExistingVoiceId(null);
        setAudioFiles([]);
        setStatusText('Reiniciando muestras...');
    };

    // --- UI Renderers ---

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: headerBorder }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: iconBg }]}>
                <ChevronLeft size={24} color={textMain} />
            </TouchableOpacity>
            <View>
                <Text style={[styles.headerTitle, { color: textMain }]}>{t('voice_lab_title')}</Text>
                <Text style={styles.headerSubtitle}>{t('voice_lab_subtitle')}</Text>
            </View>
            {existingVoiceId ? (
                <TouchableOpacity onPress={handleMenuPress} style={[styles.iconButton, { backgroundColor: 'transparent' }]}>
                    <MoreVertical size={24} color={textSub} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 40 }} />
            )}
        </View>
    );

    if (loadingVoice) {
        return (
            <View style={[styles.container, { backgroundColor: bgMain }]}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <ActivityIndicator size="large" color="#a855f7" style={{ flex: 1 }} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgMain }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Background Mesh (Simulated with Gradient) */}
            {isDark && (
                <LinearGradient
                    colors={['#050505', '#0a0a0a', '#111']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {renderHeader()}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Visualizer Area */}
                <View style={[styles.visualizerSection, { borderBottomColor: headerBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'transparent' }]}>
                    <WaveformVisualizer isActive={isCloning || !!existingVoiceId || audioFiles.length > 0} />
                    <Text style={styles.statusMonitor}>{statusText}</Text>
                </View>

                {existingVoiceId ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="small" color="#a855f7" />
                        <Text style={[styles.voiceStatusSub, { marginTop: 16 }]}>Redirigiendo a llamada...</Text>
                    </View>
                ) : (
                    <>
                        {/* Audio Upload Cards */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{t('voice_lab_samples_title')}</Text>
                                <Text style={styles.sectionCounter}>{audioFiles.length}/5</Text>
                            </View>

                            {/* Guidelines Card */}
                            <View style={[styles.guidelineCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.05)' : '#f3e8ff', borderColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#d8b4fe' }]}>
                                <Info size={16} color="#9333ea" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.guidelineText, { color: textSub }]}>
                                        {t('voice_lab_instruction')}
                                    </Text>
                                </View>
                            </View>

                            {/* File List */}
                            {audioFiles.map((file, idx) => (
                                <View key={idx} style={[styles.fileCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
                                    <View style={[styles.fileIcon, !isDark && { backgroundColor: '#f3e8ff' }]}>
                                        <Play size={16} color="#a855f7" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.fileName, { color: textMain }]} numberOfLines={1}>{file.name}</Text>
                                        <Text style={styles.fileType}>Audio Sample {idx + 1}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeFile(idx)} style={styles.removeBtn}>
                                        <X size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Add Button */}
                            {audioFiles.length < 5 && (
                                <TouchableOpacity
                                    style={[styles.addCard, { borderColor: borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb' }]}
                                    onPress={pickAudio}
                                    activeOpacity={0.7}
                                >
                                    <CloudUpload size={24} color={textSub} />
                                    <Text style={[styles.addCardText, { color: textSub }]}>{t('voice_lab_upload_btn')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Bottom Action Footer */}
            {!existingVoiceId && (
                <View style={[styles.footer, { backgroundColor: bgMain, borderTopColor: borderColor }, isCloning && { opacity: 0.5 }]}>
                    <TouchableOpacity
                        style={[styles.mainButton, { backgroundColor: isDark ? '#fff' : '#000' }, audioFiles.length === 0 && styles.disabledButton]}
                        onPress={() => {
                            if (audioFiles.length === 1) {
                                // Warning for single audio sample
                                Alert.alert(
                                    t('voice_lab_warning_title'),
                                    t('voice_lab_warning_msg'),
                                    [
                                        { text: t('alert_cancel'), style: 'cancel' },
                                        { text: t('welcome_conf_button'), onPress: startCloning }
                                    ]
                                );
                            } else {
                                startCloning();
                            }
                        }}
                        disabled={audioFiles.length === 0 || isCloning}
                    >
                        {isCloning ? (
                            <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                        ) : (
                            <>
                                <Text style={[styles.mainButtonText, { color: isDark ? '#000' : '#fff' }]}>{t('voice_lab_clone_btn')}</Text>
                                <Sparkles size={18} color={isDark ? "#000" : "#fff"} style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// === PREMIUM DARK THEME STYLES ===
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 2,
    },
    headerSubtitle: {
        color: '#6b7280',
        fontSize: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // VISUALIZER
    visualizerSection: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 60,
    },
    waveformBar: {
        width: 6,
        borderRadius: 3,
        backgroundColor: '#4b5563',
    },
    statusMonitor: {
        color: '#a855f7',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 24,
        letterSpacing: 1,
    },

    // SECTIONS
    sectionContainer: {
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    sectionCounter: {
        color: '#a855f7',
        fontSize: 12,
        fontWeight: '700',
    },

    // CARDS
    guidelineCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },
    guidelineText: {
        color: '#9ca3af',
        fontSize: 13,
        lineHeight: 20,
    },

    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    fileIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    fileType: {
        color: '#4b5563',
        fontSize: 11,
        marginTop: 2,
    },
    removeBtn: {
        padding: 8,
    },

    addCard: {
        height: 60,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    addCardText: {
        color: '#4b5563',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 10,
    },

    // EXISTING VOICE
    centerContainer: {
        padding: 24,
        alignItems: 'center',
    },
    voiceCard: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    voiceCardGradient: {
        padding: 32,
        alignItems: 'center',
    },
    activeVoiceIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    voiceStatusTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    voiceStatusSub: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 100,
        width: '100%',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    secondaryActionText: {
        color: '#6b7280',
        fontSize: 13,
        textDecorationLine: 'underline',
    },

    // FOOTER
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
        borderTopColor: '#111',
        backgroundColor: '#050505',
    },
    mainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 12,
    },
    disabledButton: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    mainButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    disclaimer: {
        color: '#333',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 16,
        letterSpacing: 1,
    },
});
