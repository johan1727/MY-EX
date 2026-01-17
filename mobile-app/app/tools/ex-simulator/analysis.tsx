import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ArrowLeft,
    Brain,
    Heart,
    MessageCircle,
    AlertTriangle,
    Sparkles,
    Users,
    Lightbulb,
    Zap,
    Trash2,
    X,
    HelpCircle,
    LogOut,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { BackgroundAnalysisManager, type AnalysisState } from '@/lib/BackgroundAnalysisManager';
import { validateRelationshipType, formatValidationMessage } from '@/lib/relationshipTypeValidator';
import { canCreateProfileThisMonth, incrementMonthlyProfileCount } from '@/lib/exSimulator';
import { useSubscription } from '@/lib/SubscriptionContext';

import { useTheme } from '@/lib/ThemeContext';
import AnalysisLoadingPremium from '@/components/AnalysisLoadingPremium';

export default function AnalysisScreen() {
    const router = useRouter();
    const { isDark } = useTheme(); // Global Theme
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    // Live analysis states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
    const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

    // Animated progress for smooth bar
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const [validationWarning, setValidationWarning] = useState<any>(null);

    // Custom Alert State
    interface AlertConfig {
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' | 'confirm' }[];
        type?: 'success' | 'error' | 'info' | 'warning';
    }
    const [customAlert, setCustomAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons'], type: AlertConfig['type'] = 'info') => {
        setCustomAlert({ visible: true, title, message, buttons, type });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };

    // Check for params in route (passed from import.tsx)
    const { update_profile_id, profile_id } = useLocalSearchParams<{ update_profile_id?: string; profile_id?: string }>();

    useEffect(() => {
        checkForAnalysisOrProfile();

        // Subscribe to background analysis events
        const unsubscribe = BackgroundAnalysisManager.onAnalysisCompleted(async (data) => {
            console.log('[AnalysisScreen] Analysis completed event received:', data);
            // Reload to show results
            await loadProfile(data.profileId);
            setIsAnalyzing(false);
            setLoading(false);
        });

        // Also subscribe to specific progress updates if we know the ID
        // (This gets refined inside checkForAnalysisOrProfile)

        return () => {
            unsubscribe();
        };
    }, []);

    const checkForAnalysisOrProfile = async () => {
        try {
            setLoading(true);

            // 1. Check if we have an analysis running in background
            const activeAnalyses = await BackgroundAnalysisManager.getActiveAnalyses();
            console.log('[AnalysisScreen] Active analyses:', activeAnalyses);

            // Determine relevant profile ID:
            // - Priority 1: Explicit profile_id from route params
            // - Priority 2: update_profile_id (for updates)
            // - Priority 3: Currently running analysis
            // - Priority 4: Current active profile in storage
            let targetProfileId = profile_id || update_profile_id;

            if (!targetProfileId && activeAnalyses.length > 0) {
                targetProfileId = activeAnalyses[0]; // Take the first active one
            }

            if (targetProfileId) {
                // Check status
                const analysisState = await BackgroundAnalysisManager.getState(targetProfileId);

                if (analysisState && (analysisState.status === 'running' || analysisState.status === 'paused')) {
                    console.log('[AnalysisScreen] Found active analysis:', targetProfileId);
                    setupAnalysisSubscription(targetProfileId);
                    return; // EXIT: We are analyzing
                } else if (analysisState && analysisState.status === 'completed') {
                    console.log('[AnalysisScreen] Analysis completed for:', targetProfileId);
                    await loadProfile(targetProfileId);
                    return; // EXIT: Loaded result
                }
            }

            // 2. If no active analysis, check if we have PENDING chunks from import.tsx
            // This happens when we just navigated from Import
            const chunksKeys = await AsyncStorage.getAllKeys();
            const chunkKey = chunksKeys.find(k => k.startsWith('chat_import_chunk_')); // Look for any chunk

            if (chunkKey) {
                console.log('[AnalysisScreen] Found pending chat chunks. Starting analysis...');
                setIsAnalyzing(true); // Show loading UI immediately

                // Reassemble messages
                let allMessages: any[] = [];
                const allChunkKeys = chunksKeys.filter(k => k.startsWith('chat_import_chunk_')).sort();

                for (const key of allChunkKeys) {
                    const chunk = await AsyncStorage.getItem(key);
                    if (chunk) {
                        allMessages = [...allMessages, ...JSON.parse(chunk)];
                        // Cleanup as we go (or after)
                        await AsyncStorage.removeItem(key);
                    }
                }

                // Get Metadata
                const metaJson = await AsyncStorage.getItem('chat_import_metadata');
                if (metaJson) {
                    const meta = JSON.parse(metaJson);
                    await AsyncStorage.removeItem('chat_import_metadata'); // Cleanup

                    // Generate a new ID if not updating
                    const idToUse = update_profile_id || crypto.randomUUID();

                    // START BACKGROUND MANAGER
                    // (This handles the heavy lifting)
                    await BackgroundAnalysisManager.startAnalysis(
                        idToUse,
                        allMessages,
                        meta.exName,
                        meta.relationshipType,
                        update_profile_id
                    );

                    setupAnalysisSubscription(idToUse);
                    return;
                }
            }

            // 3. Last fallback: Load current viewed profile
            await loadProfile();

        } catch (error) {
            console.error('[AnalysisScreen] Error verifying state:', error);
            setLoading(false);
        }
    };

    const setupAnalysisSubscription = (id: string) => {
        setIsAnalyzing(true);
        setLoading(false); // Show the analysis UI instead of spinner

        // Initial state
        BackgroundAnalysisManager.getState(id).then(state => {
            if (state) setAnalysisState(state);
        });

        // Subscribe
        const unsub = BackgroundAnalysisManager.onProgressUpdate(id, (state) => {
            setAnalysisState(state);
            if (state.status === 'completed') {
                setIsAnalyzing(false);
                loadProfile(id);
            }
        });

        // Cleanup this specific sub when component unmounts is tricky inside function,
        // but global load will handle 'completed' event. 
        // We rely on the setIsAnalyzing(false) to switch views.
    };

    const loadProfile = async (specificId?: string) => {
        try {
            setLoading(true);
            let profileToLoad: any = null;

            if (specificId) {
                // If we know the ID (e.g. just finished analyzing)
                // Try to get from BackgroundManager result first (most fresh)
                const state = await BackgroundAnalysisManager.getState(specificId);
                if (state?.result) {
                    profileToLoad = state.result;
                } else {
                    // Or fetch from DB/Storage
                    const stored = await storage.getItem(`profile_${specificId}`); // Generic getter if you have one
                    // Fallback check 'exSimulator_currentProfile'
                    const currentVar = await storage.getItem('exSimulator_currentProfile');
                    if (currentVar && JSON.parse(currentVar).id === specificId) {
                        profileToLoad = JSON.parse(currentVar);
                    }
                }
            }

            if (!profileToLoad) {
                // Default behavior: load 'current'
                const storedProfile = await storage.getItem('exSimulator_currentProfile'); // OR 'analysis_view_profile'
                if (storedProfile) {
                    profileToLoad = JSON.parse(storedProfile);
                }
            }

            if (profileToLoad) {
                console.log('[AnalysisScreen] Loaded profile:', profileToLoad.exName);

                // DATA MIGRATION / NORMALIZATION
                // Ensure we have a consistent structure between 'profile' and result
                setProfile(profileToLoad);

                // Check validation warnings (e.g. weak analysis)
                if (profileToLoad.profile?.validationWarning) {
                    setValidationWarning({
                        validation: profileToLoad.profile.validationWarning,
                        onConfirm: () => setValidationWarning(null),
                        onCancel: () => {
                            setValidationWarning(null);
                            router.back();
                        }
                    });
                }
            } else {
                console.log('[AnalysisScreen] No profile found.');
                // Don't auto-redirect back, just show empty state
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, !isDark && { backgroundColor: '#ffffff' }]}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#a855f7" />
                    <Text style={{
                        marginTop: 20,
                        color: isDark ? '#aaa' : '#555',
                        fontStyle: 'italic'
                    }}>Verificando estado...</Text>
                </View>
            </View>
        );
    }

    // === VALIDATION WARNING (Anti-Crash for Web) ===
    if (validationWarning) {
        return (
            <View style={[styles.container, !isDark && { backgroundColor: '#ffffff' }]}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <View style={{
                        width: 80, height: 80, borderRadius: 40,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 24
                    }}>
                        <AlertTriangle size={40} color="#ef4444" />
                    </View>

                    <Text style={{ color: isDark ? '#fff' : '#111', fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
                        ⚠️ Tipo de Relación Dudoso
                    </Text>

                    <View style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                        padding: 16, borderRadius: 12, width: '100%', marginBottom: 32
                    }}>
                        <Text style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
                            {formatValidationMessage(validationWarning.validation)}
                        </Text>
                        <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 14, marginTop: 16, textAlign: 'center' }}>
                            ¿Quieres continuar de todos modos?
                        </Text>
                    </View>

                    <View style={{ width: '100%', gap: 12 }}>
                        <TouchableOpacity
                            onPress={validationWarning.onConfirm}
                            style={{
                                backgroundColor: '#7c3aed',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                Continuar Análisis
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={validationWarning.onCancel}
                            style={{
                                backgroundColor: 'transparent',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#d1d5db'
                            }}
                        >
                            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 16 }}>
                                Cancelar y Corregir
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // === ANALYSIS IN PROGRESS SCREEN ===
    if (isAnalyzing) {
        // Fallback for initialization race condition
        const progress = analysisState?.progress || 0;
        // Use logs if available, or default message
        const statusMessage = analysisState?.logs?.slice(-1)[0] || 'Iniciando motor de IA...';

        return <AnalysisLoadingPremium progress={progress} currentStage={statusMessage} />;
    }

    if (!profile) {
        return (
            <View style={[styles.container, !isDark && { backgroundColor: '#ffffff' }]}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <SafeAreaView style={[styles.header, !isDark && { borderBottomColor: '#e5e7eb', backgroundColor: '#fff' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, !isDark && { color: '#000' }]}>Análisis</Text>
                    <View style={styles.headerSpacer} />
                </SafeAreaView>
                <View style={styles.emptyContainer}>
                    <Brain size={64} color="#6b7280" />
                    <Text style={[styles.emptyText, !isDark && { color: '#374151' }]}>No hay perfil para analizar</Text>



                    <TouchableOpacity
                        onPress={() => {
                            setLoading(true);
                            checkForAnalysisOrProfile();
                        }}
                        style={{
                            marginTop: 24,
                            backgroundColor: '#a855f7',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Get data from the new profile structure
    // Note: Analysis data is stored in profile.profile from import.tsx
    console.log('[Analysis] Profile structure:', JSON.stringify(profile, null, 2).substring(0, 500));

    const analysisData = profile.profile || profile; // Handle both nested and flat structures
    const name = profile.exName || analysisData.exName || 'Persona';
    const messageCount = profile.messageCount || analysisData.messageCount || 0;

    console.log('[Analysis] Profile keys:', Object.keys(profile));
    console.log('[Analysis] AnalysisData keys:', Object.keys(analysisData));
    console.log('[Analysis] Has bigFive:', !!analysisData.bigFive);
    console.log('[Analysis] Has attachment:', !!analysisData.attachment);
    console.log('[Analysis] Has profile:', !!profile.profile);

    // If structure is completely empty, show helpful error with delete option
    if (!analysisData || Object.keys(analysisData).length === 0) {
        const handleDeleteAndRetry = async () => {
            try {
                // Delete from local storage
                await storage.removeItem('analysis_view_profile');
                await storage.removeItem('exSimulator_currentProfile');

                // Try to delete from Supabase if we have the ID
                if (profile.supabaseId || profile.id) {
                    await supabase
                        .from('ex_profiles')
                        .delete()
                        .eq('id', profile.supabaseId || profile.id);
                }

                showAlert(
                    '✅ Perfil eliminado',
                    'El perfil corrupto ha sido eliminado. Ahora puedes crear uno nuevo.',
                    [{ text: 'Aceptar', onPress: () => { closeAlert(); router.replace('/tools/ex-simulator/import'); } }],
                    'success'
                );
            } catch (error) {
                console.error('Error deleting profile:', error);
                showAlert('Error', 'No se pudo eliminar el perfil. Intenta de nuevo.', [{ text: 'OK' }], 'error');
            }
        };

        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView edges={['top']} style={styles.headerSafe}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Error</Text>
                        <View style={styles.headerSpacer} />
                    </View>
                </SafeAreaView>
                <View style={styles.emptyContainer}>
                    <Brain size={64} color="#ef4444" />
                    <Text style={styles.emptyText}>El perfil está vacío o corrupto</Text>
                    <Text style={{ color: '#6b7280', marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
                        El análisis no se completó correctamente. Elimina este perfil y crea uno nuevo.
                    </Text>

                    <TouchableOpacity
                        onPress={handleDeleteAndRetry}
                        style={{
                            marginTop: 24,
                            backgroundColor: '#ef4444',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <Trash2 size={20} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                            Eliminar y reintentar
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.replace('/tools/ex-simulator/import')}
                        style={{ marginTop: 12 }}
                    >
                        <Text style={{ color: '#a855f7', fontSize: 14 }}>
                            Crear nuevo análisis sin eliminar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- DATA EXTRACTION (Consistent use of analysisData) ---
    // Extract nested data safely with defaults
    const bigFive = analysisData.bigFive || {};
    const attachment = analysisData.attachment || {};
    const loveLanguage = analysisData.loveLanguage || {};
    const eq = analysisData.emotionalIntelligence || {};
    const triggers = analysisData.triggers || {};
    const linguistics = analysisData.linguistics || {};
    const dynamics = analysisData.relationshipDynamics || {};
    const intimateDetails = analysisData.intimateDetails || {};
    const valuesAlignment = analysisData.valuesAlignment || {};
    const topicsOfInterest = analysisData.topicsOfInterest || [];
    const quirks = analysisData.quirks || [];
    const redFlags = analysisData.redFlags || [];

    // Premium / Deep Analysis Data
    const linguisticAnalysis = analysisData.linguisticAnalysis || {};
    const relationshipPsychology = analysisData.relationshipPsychology || {};
    const psychologicalXRay = analysisData.psychologicalXRay || relationshipPsychology.psychologicalXRay || {};

    // Helper: Determine Communication Style
    // Order of preference: 
    // 1. Explicit communicationStyle field
    // 2. linguistics.overallStyle
    // 3. communication.style nested object
    const communicationStyle = analysisData.communicationStyle ||
        linguistics.overallStyle ||
        (analysisData.communication && analysisData.communication.style) ||
        'No disponible';

    // Helper: Determine Emotional Pattern
    // Order of preference:
    // 1. eq.emotionalRange
    // 2. inferred from dominantPartner boolean
    const emotionalPattern = eq.emotionalRange || (dynamics.dominantPartner ? 'variable' : 'estable');

    // Helper: Safely get score (number) from value that might be number or object
    const getScore = (val: any): number => {
        let score: number;
        if (typeof val === 'number') {
            score = val;
        } else if (val && typeof val === 'object' && typeof val.score === 'number') {
            score = val.score;
        } else {
            score = 5; // Default fallback
        }
        // CRITICAL: Validate NaN before returning
        return isNaN(score) ? 0 : score;
    };


    // Helper to render a score bar
    const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
        <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{label}</Text>
            <View style={styles.scoreBarBg}>
                <View style={[styles.scoreBarFill, { width: `${Math.min(10, Math.max(0, score)) * 10}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.scoreValue, { color }]}>{Math.round(score)}/10</Text>
        </View>
    );

    return (
        <View style={[styles.container, !isDark && { backgroundColor: '#ffffff' }]}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <SafeAreaView edges={['top']} style={[styles.headerSafe, !isDark && { backgroundColor: '#fff' }]}>
                <View style={[styles.header, !isDark && { borderBottomColor: '#e5e7eb' }]}>
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
                        <ArrowLeft size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, !isDark && { color: '#000' }]}>Análisis de {name}</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Profile Summary */}
                <LinearGradient
                    colors={['#1f1f3a', '#1a1a2e']}
                    style={styles.summaryCard}
                >
                    <View style={styles.summaryHeader}>
                        <LinearGradient
                            colors={['#a855f7', '#6366f1']}
                            style={styles.avatar}
                        >
                            <Text style={styles.avatarText}>
                                {name.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryName}>{name}</Text>
                            <Text style={styles.summaryStats}>
                                {messageCount.toLocaleString()} mensajes analizados
                            </Text>
                            <View style={styles.badge}>
                                <Sparkles size={12} color="#22c55e" />
                                <Text style={styles.badgeText}>Análisis Profundo IA</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* === SIMPLE SUMMARY CARDS === */}

                {/* Communication Style */}
                <View style={[styles.simpleCard, !isDark && { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }]}>
                    <View style={styles.simpleCardHeader}>
                        <MessageCircle size={18} color="#6366f1" />
                        <Text style={[styles.simpleCardTitle, { color: '#6366f1' }]}>
                            Estilo de Comunicación
                        </Text>
                    </View>
                    <Text style={[styles.simpleCardValue, !isDark && { color: '#1f2937' }]}>
                        {communicationStyle}
                    </Text>
                </View>

                {/* Emotional Patterns */}
                <View style={[styles.simpleCard, !isDark && { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }]}>
                    <View style={styles.simpleCardHeader}>
                        <Heart size={18} color="#ec4899" />
                        <Text style={[styles.simpleCardTitle, { color: '#ec4899' }]}>
                            Patrones Emocionales
                        </Text>
                    </View>
                    <Text style={[styles.simpleCardValue, !isDark && { color: '#1f2937' }]}>
                        {emotionalPattern}
                    </Text>
                </View>

                {/* === NEW: RADIOGRAFÍA PSICOLÓGICA (Gottman + Apego) === */}
                {/* Check psychologicalXRay for data availability */}
                {(psychologicalXRay.fourHorsemen || psychologicalXRay.attachmentStyle) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Zap size={20} color="#f59e0b" />
                            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>
                                Radiografía Psicológica
                            </Text>
                        </View>

                        {/* Los 4 Jinetes (Gottman) */}
                        {psychologicalXRay.fourHorsemen && (
                            <View style={styles.card}>
                                <Text style={styles.cardSubtitle}>
                                    Los 4 Jinetes (Escala de Toxicidad)
                                </Text>
                                <ScoreBar
                                    label="⚔️ Crítica (Ataques)"
                                    score={getScore(psychologicalXRay.fourHorsemen?.criticism?.score || psychologicalXRay.fourHorsemen?.criticism)}
                                    color="#f59e0b"
                                />
                                <ScoreBar
                                    label="🙄 Desprecio (El peor)"
                                    score={getScore(psychologicalXRay.fourHorsemen?.contempt?.score || psychologicalXRay.fourHorsemen?.contempt)}
                                    color="#ef4444"
                                />
                                <ScoreBar
                                    label="🛡️ Defensividad"
                                    score={getScore(psychologicalXRay.fourHorsemen?.defensiveness?.score || psychologicalXRay.fourHorsemen?.defensiveness)}
                                    color="#60a5fa"
                                />
                                <ScoreBar
                                    label="🧱 Indiferencia (Muro)"
                                    score={getScore(psychologicalXRay.fourHorsemen?.stonewalling?.score || psychologicalXRay.fourHorsemen?.stonewalling)}
                                    color="#9ca3af"
                                />
                            </View>
                        )}

                        {/* Estilo de Apego */}
                        {psychologicalXRay.attachmentStyle && (
                            <View style={[styles.card, { marginTop: 12 }]}>
                                <Text style={styles.cardSubtitle}>Estilo de Apego Detectado</Text>
                                <View style={styles.highlightBox}>
                                    <Text style={[styles.highlightValue, { color: '#f59e0b', fontSize: 20 }]}>
                                        {psychologicalXRay.attachmentStyle.type?.toUpperCase()}
                                    </Text>
                                    <Text style={styles.subInfo}>
                                        Confianza del análisis: {psychologicalXRay.attachmentStyle.confidence}%
                                    </Text>
                                </View>
                                {psychologicalXRay.attachmentStyle.manifestations?.map((m: any, i: number) => (
                                    <View key={i} style={styles.rowItem}>
                                        <View style={styles.bullet} />
                                        <Text style={styles.rowText}>
                                            {typeof m === 'string' ? m : m.behavior}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Attachment Style (Legacy Card - Hidden if new one exists) */}
                {!analysisData.psychologicalXRay?.attachmentStyle && (
                    <View style={styles.simpleCard}>
                        <View style={styles.simpleCardHeader}>
                            <Users size={18} color="#f59e0b" />
                            <Text style={[styles.simpleCardTitle, { color: '#f59e0b' }]}>
                                Estilo de Apego
                            </Text>
                        </View>
                        <Text style={styles.simpleCardValue}>
                            {attachment.style || 'No disponible'}
                        </Text>
                    </View>
                )}

                {/* Conflict Management */}
                <View style={styles.simpleCard}>
                    <View style={styles.simpleCardHeader}>
                        <Zap size={18} color="#3b82f6" />
                        <Text style={[styles.simpleCardTitle, { color: '#3b82f6' }]}>
                            Manejo de Conflictos
                        </Text>
                    </View>
                    <Text style={styles.simpleCardValue}>
                        {dynamics.conflictStyle || 'No disponible'}
                    </Text>
                </View>

                {/* === RED FLAGS (Señales de Alerta) === */}
                {redFlags && redFlags.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={20} color="#ef4444" />
                            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>
                                Señales de Alerta
                            </Text>
                        </View>
                        {redFlags.map((flag: string, i: number) => (
                            <View key={i} style={styles.redFlagCard}>
                                <Text style={styles.redFlagText}>{flag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* === PREMIUM: INTIMATE DETAILS & NICKNAMES === */}
                {intimateDetails && (intimateDetails.nicknames || intimateDetails.insideJokes?.length > 0) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Heart size={20} color="#ec4899" />
                            <Text style={[styles.sectionTitle, { color: '#ec4899' }]}>
                                Detalles Íntimos & Apodos
                            </Text>
                        </View>

                        {/* Nicknames */}
                        {intimateDetails.nicknames?.fromExToUser?.length > 0 && (
                            <View style={styles.highlightBox}>
                                <Text style={styles.highlightLabel}>Te decía:</Text>
                                <Text style={styles.highlightValue}>
                                    {intimateDetails.nicknames.fromExToUser.join(', ')}
                                </Text>
                            </View>
                        )}
                        {intimateDetails.nicknames?.fromUserToEx?.length > 0 && (
                            <View style={styles.subInfo}>
                                <Text style={{ color: '#9ca3af' }}>Tú le decías: </Text>
                                <Text style={styles.bold}>{intimateDetails.nicknames.fromUserToEx.join(', ')}</Text>
                            </View>
                        )}

                        {/* Inside Jokes */}
                        {intimateDetails.insideJokes?.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.triggerLabel}>🎭 Chistes Internos:</Text>
                                <View style={styles.tagRow}>
                                    {intimateDetails.insideJokes.map((joke: string, i: number) => (
                                        <View key={i} style={styles.tagSuccess}>
                                            <Text style={styles.tagTextSuccess}>{joke}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}



                        {/* Specific Love Language */}
                        {intimateDetails.loveLanguageSpecifics?.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.triggerLabel}>💝 Gestos de Amor Específicos:</Text>
                                <View style={styles.tagRow}>
                                    {intimateDetails.loveLanguageSpecifics.map((gesture: any, i: number) => (
                                        <View key={i} style={styles.tagPositive}>
                                            <Text style={styles.tagTextPositive}>
                                                {typeof gesture === 'string' ? gesture : gesture.action}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* === PREMIUM: RELATIONSHIP PSYCHOLOGY === */}
                {relationshipPsychology && (relationshipPsychology.reciprocityScore !== undefined) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Users size={20} color="#f472b6" />
                            <Text style={[styles.sectionTitle, { color: '#f472b6' }]}>
                                {profile.relationshipType === 'friend' ? 'Dinámica de Amistad' :
                                    profile.relationshipType === 'family' ? 'Dinámica Familiar' :
                                        profile.relationshipType === 'deceased' ? 'Legado Emocional' :
                                            'Psicología de la Relación'}
                            </Text>
                        </View>

                        {/* Reciprocity & Power */}
                        <ScoreBar
                            label="Reciprocidad"
                            score={getScore(relationshipPsychology.reciprocityScore) / 10}
                            color="#f472b6"
                        />
                        <View style={styles.highlightBox}>
                            <Text style={styles.highlightLabel}>Balance de Poder</Text>
                            <Text style={styles.highlightValue}>
                                {relationshipPsychology.powerBalance === 'balanced' ? '⚖️ Equilibrado' :
                                    relationshipPsychology.powerBalance === 'user-dominant' ? '👑 Tú dominas' :
                                        '🚩 Dominante'}
                            </Text>
                        </View>

                        {/* Specific Flags */}
                        {relationshipPsychology.breakupPatterns?.quietQuitting && (
                            <View style={styles.redFlagCard}>
                                <Text style={styles.redFlagText}>⚠️ "Quiet Quitting" detectado (se alejó emocionalmente antes de terminar).</Text>
                            </View>
                        )}
                        {relationshipPsychology.frenemyScore > 50 && (
                            <View style={styles.redFlagCard}>
                                <Text style={styles.redFlagText}>🐍 Alerta de Frenemy (Envidia/Competencia detectada).</Text>
                            </View>
                        )}
                        {relationshipPsychology.emotionalBlackmail && (
                            <View style={styles.redFlagCard}>
                                <Text style={styles.redFlagText}>🕸️ Chantaje Emocional detectado.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* === PREMIUM: LINGUISTIC DNA === */}
                {linguisticAnalysis && linguisticAnalysis.subtext && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Brain size={20} color="#60a5fa" />
                            <Text style={[styles.sectionTitle, { color: '#60a5fa' }]}>
                                ADN Lingüístico 🧬
                            </Text>
                        </View>

                        <View style={styles.simpleCard}>
                            <Text style={[styles.simpleCardTitle, { color: '#93c5fd', marginBottom: 4 }]}>Subtexto Emocional</Text>
                            <Text style={styles.simpleCardValue}>{linguisticAnalysis.subtext}</Text>
                        </View>

                        <ScoreBar
                            label="Intelectualización"
                            score={getScore(linguisticAnalysis.intellectualization)}
                            color="#60a5fa"
                        />

                        {linguisticAnalysis.toneShiftUnderStress && (
                            <Text style={styles.subInfo}>
                                Bajo estrés: <Text style={styles.bold}>{linguisticAnalysis.toneShiftUnderStress}</Text>
                            </Text>
                        )}
                    </View>
                )}

                {/* === BIG FIVE (OCEAN) - Technical Details === */}
                {bigFive.openness && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Brain size={20} color="#a855f7" />
                            <Text style={[styles.sectionTitle, { color: '#a855f7' }]}>
                                Personalidad (Big Five)
                            </Text>
                        </View>
                        <ScoreBar label="Apertura" score={getScore(bigFive.openness)} color="#a855f7" />
                        <ScoreBar label="Responsabilidad" score={getScore(bigFive.conscientiousness)} color="#3b82f6" />
                        <ScoreBar label="Extraversión" score={getScore(bigFive.extraversion)} color="#22c55e" />
                        <ScoreBar label="Amabilidad" score={getScore(bigFive.agreeableness)} color="#ec4899" />
                        <ScoreBar label="Neuroticismo" score={getScore(bigFive.neuroticism)} color="#f59e0b" />
                    </View>
                )}

                {/* === ATTACHMENT STYLE === */}
                {attachment.style && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Heart size={20} color="#ec4899" />
                            <Text style={[styles.sectionTitle, { color: '#ec4899' }]}>
                                Estilo de Apego
                            </Text>
                        </View>
                        <View style={styles.highlightBox}>
                            <Text style={styles.highlightLabel}>Tipo</Text>
                            <Text style={styles.highlightValue}>{attachment.style}</Text>
                        </View>
                        <ScoreBar label="Miedo al abandono" score={getScore(attachment.fearOfAbandonment)} color="#ef4444" />
                        <ScoreBar label="Evita intimidad" score={getScore(attachment.avoidanceOfIntimacy)} color="#6b7280" />
                        <Text style={styles.subInfo}>
                            Necesidad de reafirmación: <Text style={styles.bold}>{attachment.needForReassurance || 'medio'}</Text>
                        </Text>
                    </View>
                )}

                {/* === LOVE LANGUAGE === */}
                {loveLanguage.primary && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Lightbulb size={20} color="#f59e0b" />
                            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>
                                Lenguaje del Amor
                            </Text>
                        </View>
                        <View style={styles.languageRow}>
                            <View style={styles.languageBox}>
                                <Text style={styles.languageLabel}>Primario</Text>
                                <Text style={styles.languageValue}>{loveLanguage.primary}</Text>
                            </View>
                            <View style={styles.languageBox}>
                                <Text style={styles.languageLabel}>Secundario</Text>
                                <Text style={styles.languageValueSecondary}>{loveLanguage.secondary}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* === EMOTIONAL TRIGGERS === */}
                {(triggers.positive?.length > 0 || triggers.negative?.length > 0) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Zap size={20} color="#3b82f6" />
                            <Text style={[styles.sectionTitle, { color: '#3b82f6' }]}>
                                Detonantes Emocionales
                            </Text>
                        </View>

                        {triggers.positive?.length > 0 && (
                            <>
                                <Text style={styles.triggerLabel}>✨ Lo que le alegra:</Text>
                                <View style={styles.tagRow}>
                                    {triggers.positive.slice(0, 3).map((t: string, i: number) => (
                                        <View key={i} style={styles.tagPositive}>
                                            <Text style={styles.tagTextPositive}>{t}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {triggers.negative?.length > 0 && (
                            <>
                                <Text style={[styles.triggerLabel, { marginTop: 12 }]}>⚡ Lo que le molesta:</Text>
                                <View style={styles.tagRow}>
                                    {triggers.negative.slice(0, 3).map((t: string, i: number) => (
                                        <View key={i} style={styles.tagNegative}>
                                            <Text style={styles.tagTextNegative}>{t}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* === COMMUNICATION STYLE === */}
                {profile.communicationStyle && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MessageCircle size={20} color="#6366f1" />
                            <Text style={[styles.sectionTitle, { color: '#6366f1' }]}>
                                Comunicación
                            </Text>
                        </View>
                        <View style={styles.highlightBox}>
                            <Text style={styles.highlightLabel}>Estilo</Text>
                            <Text style={styles.highlightValue}>{profile.communicationStyle}</Text>
                        </View>
                        {dynamics.conflictStyle && (
                            <Text style={styles.subInfo}>
                                En conflictos: <Text style={styles.bold}>{dynamics.conflictStyle}</Text>
                            </Text>
                        )}
                    </View>
                )}

                {/* === EVIDENCE SECTION === */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Sparkles size={20} color="#ec4899" />
                        <Text style={[styles.sectionTitle, { color: '#ec4899' }]}>
                            Detalles Íntimos & Evidencia
                        </Text>
                    </View>

                    {/* Nicknames */}
                    {analysisData.nicknames && analysisData.nicknames.length > 0 && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>💕 Apodos y Nombres Cariñosos</Text>
                            {analysisData.nicknames.map((item: any, i: number) => (
                                <View key={i} style={styles.evidenceItem}>
                                    <Text style={styles.evidenceValue}>"{item.nickname}"</Text>
                                    {item.context && (
                                        <Text style={styles.evidenceContext}>Contexto: {item.context}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Inside Jokes */}
                    {analysisData.insideJokes && analysisData.insideJokes.length > 0 && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>😂 Inside Jokes</Text>
                            {analysisData.insideJokes.map((item: any, i: number) => (
                                <View key={i} style={styles.evidenceItem}>
                                    <Text style={styles.evidenceValue}>{item.joke}</Text>
                                    {item.origin && (
                                        <Text style={styles.evidenceContext}>Origen: {item.origin}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Recurring Complaints */}
                    {analysisData.recurringComplaints && analysisData.recurringComplaints.length > 0 && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>⚠️ Quejas Recurrentes</Text>
                            {analysisData.recurringComplaints.map((item: any, i: number) => (
                                <View key={i} style={styles.evidenceItem}>
                                    <Text style={styles.evidenceValue}>{item.complaint}</Text>
                                    <Text style={styles.evidenceFrequency}>
                                        Frecuencia: {item.frequency} | Intensidad: {item.intensity}/10
                                    </Text>
                                    {item.examples && item.examples.length > 0 && (
                                        <View style={styles.examplesContainer}>
                                            {item.examples.slice(0, 2).map((ex: string, j: number) => (
                                                <Text key={j} style={styles.evidenceExample}>• {ex}</Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Love Language Specifics */}
                    {analysisData.loveLanguageSpecifics && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>❤️ Lenguaje del Amor (Evidencia)</Text>
                            <Text style={styles.evidenceValue}>
                                Principal: {analysisData.loveLanguageSpecifics.primary}
                            </Text>
                            {analysisData.loveLanguageSpecifics.examples && analysisData.loveLanguageSpecifics.examples.length > 0 && (
                                <View style={styles.examplesContainer}>
                                    {analysisData.loveLanguageSpecifics.examples.map((ex: string, i: number) => (
                                        <Text key={i} style={styles.evidenceExample}>• {ex}</Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Linguistic Analysis */}
                    {analysisData.linguisticAnalysis && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>🗣️ Análisis Lingüístico</Text>
                            {analysisData.linguisticAnalysis.vocabulary && (
                                <Text style={styles.evidenceSubtext}>
                                    Vocabulario: {analysisData.linguisticAnalysis.vocabulary}
                                </Text>
                            )}
                            {analysisData.linguisticAnalysis.emoji_usage && (
                                <Text style={styles.evidenceSubtext}>
                                    Emojis favoritos: {analysisData.linguisticAnalysis.emoji_usage}
                                </Text>
                            )}
                            {analysisData.linguisticAnalysis.communication_style && (
                                <Text style={styles.evidenceSubtext}>
                                    Estilo: {analysisData.linguisticAnalysis.communication_style}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Relationship Psychology */}
                    {analysisData.relationshipPsychology && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>🧠 Psicología Relacional</Text>
                            {analysisData.relationshipPsychology.gottman_four_horsemen && (
                                <View style={styles.gottmanContainer}>
                                    <Text style={styles.evidenceSubtitle}>Los Cuatro Jinetes de Gottman:</Text>
                                    {Object.keys(analysisData.relationshipPsychology.gottman_four_horsemen).map((key) => {
                                        const horseman = analysisData.relationshipPsychology.gottman_four_horsemen[key];
                                        if (horseman && horseman.present) {
                                            return (
                                                <View key={key} style={styles.horseman}>
                                                    <Text style={styles.horsemanName}>
                                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                                    </Text>
                                                    {horseman.examples && horseman.examples.slice(0, 2).map((ex: string, i: number) => (
                                                        <Text key={i} style={styles.evidenceExample}>• {ex}</Text>
                                                    ))}
                                                </View>
                                            );
                                        }
                                        return null;
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Fallback for old structure */}
                    {(!analysisData.nicknames && !analysisData.insideJokes) && quirks && quirks.length > 0 && (
                        <View style={styles.evidenceCard}>
                            <Text style={styles.evidenceTitle}>💫 Peculiaridades</Text>
                            {quirks.map((q: string, i: number) => (
                                <View key={i} style={styles.rowItem}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.rowText}>{q}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ⚠️ Este análisis es generado por IA basado en patrones de texto.
                        No reemplaza el consejo de un profesional de salud mental.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Custom Alert Modal */}
            <Modal
                transparent
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.alertOverlay}>
                    <View style={styles.alertBox}>
                        <View style={[
                            styles.alertIconContainer,
                            customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {customAlert.type === 'error' && <X size={32} color="#ef4444" />}
                            {customAlert.type === 'warning' && <LogOut size={32} color="#f59e0b" />}
                            {customAlert.type === 'success' && <Sparkles size={32} color="#22c55e" />}
                            {customAlert.type === 'info' && <HelpCircle size={32} color="#3b82f6" />}
                        </View>
                        <Text style={styles.alertTitle}>{customAlert.title}</Text>
                        <Text style={styles.alertMessage}>
                            {customAlert.message}
                        </Text>
                        <View style={styles.alertButtons}>
                            {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                                <TouchableOpacity
                                    style={[styles.alertButton, styles.alertButtonPrimary]}
                                    onPress={closeAlert}
                                >
                                    <Text style={styles.alertButtonText}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.alertButton,
                                            btn.style === 'cancel' ? styles.alertButtonCancel :
                                                btn.style === 'destructive' ? styles.alertButtonDestructive :
                                                    styles.alertButtonPrimary
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            closeAlert(); // Close alert after button press
                                        }}
                                    >
                                        <Text style={[
                                            styles.alertButtonText,
                                            btn.style === 'destructive' && { color: '#ef4444' }
                                        ]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSafe: {
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
    },
    content: {
        flex: 1,
        // Web: Center alignment for the scroll view itself
        ...(Platform.OS === 'web' ? {
            alignSelf: 'center',
            width: '100%',
            maxWidth: 600,
        } : {}),
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    summaryCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    summaryInfo: {
        marginLeft: 16,
        flex: 1,
    },
    summaryName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    summaryStats: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
        alignSelf: 'flex-start',
        gap: 4,
    },
    badgeText: {
        fontSize: 12,
        color: '#22c55e',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Score bars
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreLabel: {
        width: 100,
        fontSize: 13,
        color: '#9ca3af',
    },
    scoreBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: '#2a2a2a',
        borderRadius: 4,
        marginHorizontal: 8,
    },
    scoreBarFill: {
        height: 8,
        borderRadius: 4,
    },
    scoreValue: {
        width: 40,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },
    // Highlight boxes
    highlightBox: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    highlightLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    highlightValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#a855f7',
        textTransform: 'capitalize',
    },
    subInfo: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    bold: {
        fontWeight: '600',
        color: '#fff',
    },
    // Love language
    languageRow: {
        flexDirection: 'row',
        gap: 12,
    },
    languageBox: {
        flex: 1,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    languageLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginBottom: 4,
    },
    languageValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f59e0b',
        textTransform: 'capitalize',
    },
    languageValueSecondary: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d97706',
        textTransform: 'capitalize',
    },
    // Triggers
    triggerLabel: {
        fontSize: 13,
        color: '#9ca3af',
        marginBottom: 8,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagPositive: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagTextPositive: {
        fontSize: 13,
        color: '#22c55e',
    },
    tagNegative: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagTextNegative: {
        fontSize: 13,
        color: '#ef4444',
    },
    // Tags
    tagContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    tagDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tagTextDanger: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    tagSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagTextSuccess: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '500',
    },
    disclaimer: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
    // NEW: Evidence display styles
    evidenceCard: {
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#a855f7',
    },
    evidenceTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 10,
    },
    evidenceItem: {
        marginBottom: 12,
    },
    evidenceValue: {
        fontSize: 14,
        color: '#e5e7eb',
        fontWeight: '600',
        marginBottom: 4,
    },
    evidenceContext: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginLeft: 8,
    },
    evidenceFrequency: {
        fontSize: 11,
        color: '#fbbf24',
        marginTop: 2,
    },
    examplesContainer: {
        marginTop: 6,
        marginLeft: 12,
    },
    evidenceExample: {
        fontSize: 12,
        color: '#10b981',
        marginBottom: 2,
    },
    evidenceSubtext: {
        fontSize: 13,
        color: '#d1d5db',
        marginBottom: 4,
    },
    evidenceSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fbbf24',
        marginBottom: 8,
    },
    gottmanContainer: {
        marginTop: 8,
    },
    horseman: {
        marginBottom: 10,
    },
    horsemanName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ef4444',
        marginBottom: 4,
    },
    // Simple card styles for summary sections
    simpleCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    simpleCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    simpleCardTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    simpleCardValue: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '400',
    },
    // Red flag cards with gradient background
    redFlagCard: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    redFlagText: {
        fontSize: 14,
        color: '#fca5a5',
        lineHeight: 20,
    },

    // === Psychological X-Ray Styles (Unique) ===
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    // Note: scoreRow, scoreLabel, scoreBarBg, scoreBarFill, scoreValue are already defined above and reused.
    rowItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#cbd5e1',
        marginTop: 7,
        marginRight: 10,
    },
    rowText: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    // Custom Alert Styles
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        backgroundColor: '#1d1d1d',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    alertIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: 15,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertButtonPrimary: {
        backgroundColor: '#fff',
    },
    alertButtonCancel: {
        backgroundColor: '#2d2d2d',
    },
    alertButtonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    alertButtonText: {
        fontWeight: '600',
        fontSize: 15,
        color: '#000',
    },
});
