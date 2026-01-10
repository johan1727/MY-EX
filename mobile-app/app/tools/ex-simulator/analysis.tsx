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
    Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';

export default function AnalysisScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Live analysis states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
    const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

    // Animated progress for smooth bar
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const [validationWarning, setValidationWarning] = useState<any>(null);

    // Premium Modal State
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [premiumModalData, setPremiumModalData] = useState<any>({});

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
        setCustomAlert({
            visible: true,
            title,
            message,
            buttons,
            type
        });
    };

    const closeAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };


    // Use focus effect to check for data whenever the screen comes into focus
    // This is critical because router.push might rely on existing mounted component
    useFocusEffect(
        useCallback(() => {
            console.log('[AnalysisScreen] Screen focused, checking for data...');
            checkForAnalysisOrProfile();
        }, [])
    );

    const checkForAnalysisOrProfile = async () => {
        try {
            // Check if we need to START a new analysis
            // Retry logic to handle potential race conditions with AsyncStorage
            let analyzeData = await storage.getItem('exSimulator_analyzeData');
            if (!analyzeData) {
                // Retry once after a short delay
                await new Promise(resolve => setTimeout(resolve, 500));
                analyzeData = await storage.getItem('exSimulator_analyzeData');
            }

            if (analyzeData) {
                // Check if using chunked storage (new format) or legacy format
                const metadata = JSON.parse(analyzeData);
                let parsedMessages: any[];
                let exName: string;
                let relationshipType: string;
                let userName: string | undefined;

                if (metadata.totalChunks) {
                    // NEW: Chunked storage format - reassemble messages from chunks
                    console.log(`[AnalysisScreen] Reading ${metadata.totalChunks} chunks (${metadata.totalMessages} messages)`);
                    parsedMessages = [];

                    for (let i = 0; i < metadata.totalChunks; i++) {
                        const chunkData = await storage.getItem(`exSimulator_chunk_${i}`);
                        if (chunkData) {
                            const chunk = JSON.parse(chunkData);
                            parsedMessages.push(...chunk);
                            // Clean up chunk AFTER successful processing, not during read
                            // await storage.removeItem(`exSimulator_chunk_${i}`); 
                        }
                    }

                    exName = metadata.exName;
                    relationshipType = metadata.relationshipType;
                    userName = metadata.userName;
                    console.log(`[AnalysisScreen] Reassembled ${parsedMessages.length} messages from chunks`);
                } else {
                    // LEGACY: Old format with parsedMessages directly in storage
                    parsedMessages = metadata.parsedMessages;
                    exName = metadata.exName;
                    relationshipType = metadata.relationshipType;
                    userName = metadata.userName;
                }

                // VALIDATION: Ensure we have data before proceeding
                if (!parsedMessages || parsedMessages.length === 0) {
                    console.error('[AnalysisScreen] Failed to load messages from storage. Metadata:', metadata);
                    Alert.alert('Error', 'No se pudieron cargar los mensajes para el análisis. Por favor intenta importar el chat nuevamente.');
                    return;
                }

                // DO NOT DELETE metadata yet. Only delete after successful profile creation.
                // await storage.removeItem('exSimulator_analyzeData'); 

                // 🔒 CHECK MONTHLY PROFILE LIMIT BEFORE PROCEEDING
                const { data: { user } } = await supabase.auth.getUser();
                let subscriptionTier = 'survivor'; // default
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('subscription_tier')
                        .eq('id', user.id)
                        .single();
                    subscriptionTier = profile?.subscription_tier || 'survivor';
                }

                const limitCheck = await canCreateProfileThisMonth(subscriptionTier);
                if (!limitCheck.canCreate) {
                    setLoading(false);
                    setPremiumModalData({
                        currentTier: subscriptionTier,
                        limitType: 'profiles',
                        currentCount: limitCheck.currentCount,
                        maxAllowed: limitCheck.maxAllowed
                    });
                    setShowPremiumModal(true);
                    return;
                }

                setIsAnalyzing(true);
                setLoading(false);

                // Start background analysis with progress tracking
                const profileId = `profile_${Date.now()}`;

                // Subscribe to progress updates
                const unsubscribe = BackgroundAnalysisManager.onProgressUpdate(profileId, (state) => {
                    setAnalysisState(state);
                    setAnalysisLogs(state.logs || []);

                    if (state.status === 'completed') {
                        setIsAnalyzing(false);
                        // Flatten the result so UI can access properties directly
                        const finalProfile = state.result;
                        // Fix for type error: explicitly cast or check property existence if needed
                        const profileData = (finalProfile as any).profile || finalProfile;
                        setProfile(profileData ? { ...finalProfile, ...profileData } : finalProfile);

                        // INCREMENT GUEST USAGE
                        supabase.auth.getUser().then(({ data: { user } }) => {
                            if (!user) {
                                storage.getItem('guest_analysis_count').then(current => {
                                    const newVal = (current ? parseInt(current) : 0) + 1;
                                    storage.setItem('guest_analysis_count', newVal.toString());
                                });
                            }
                        });

                        // 📊 INCREMENT MONTHLY PROFILE COUNT (limits per plan)
                        incrementMonthlyProfileCount()
                            .then(() => console.log('[AnalysisScreen] Monthly profile count incremented'))
                            .catch(err => console.error('[AnalysisScreen] Failed to increment profile count:', err));

                        // 🧹 CLEANUP: Remove analysis data to prevent restarts on return
                        storage.removeItem('exSimulator_analyzeData').catch(err => console.warn('Failed to cleanup analyzeData:', err));

                        // Navigate to chat after completion
                        // setTimeout(() => {
                        //     router.replace('/');
                        // }, 1000); 
                        // Instead of auto-redirect, we stay in 'completed' state to show the Success Screen
                    }

                    if (state.status === 'error') {
                        setIsAnalyzing(false);
                        showAlert('Error', state.error || 'Error en el análisis', [{ text: 'OK' }], 'error');
                    }
                });

                // ✨ VALIDATE RELATIONSHIP TYPE - DISABLED TO PREVENT "DOUBLE PREVIEW"
                // The user already selected the relationship type in the Import screen.
                // We trust the user's selection over the AI heuristic here.
                await BackgroundAnalysisManager.startAnalysis(
                    profileId,
                    parsedMessages,
                    exName,
                    relationshipType || 'ex'
                );

                return;
            }

            // No new analysis - try to load existing profile
            let stored = await storage.getItem('analysis_view_profile');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Flatten: merge inner profile properties to top level
                setProfile(parsed.profile ? { ...parsed, ...parsed.profile } : parsed);
            } else {
                stored = await storage.getItem('exSimulator_currentProfile');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setProfile(parsed.profile ? { ...parsed, ...parsed.profile } : parsed);
                } else {
                    // NO PROFILE FOUND - Redirect to import instead of showing "No hay perfiles"
                    console.log('[Analysis] No profile data found, redirecting to import...');
                    router.replace('/tools/ex-simulator/import');
                    return;
                }
            }
        } catch (error: any) {
            console.error('Error loading:', error);
            setLoadError(error.message || 'Error desconocido');
            Alert.alert('Error', ' Detalles: ' + (error.message || 'Desconocido'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#a855f7" />
                </View>
            </View>
        );
    }

    // === VALIDATION WARNING REMOVED ===

    // === SUCCESS SCREEN ===
    if (analysisState?.status === 'completed') {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 24
                    }}>
                        <Sparkles size={48} color="#22c55e" />
                    </View>

                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                        ¡Análisis Completado!
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 16, marginBottom: 40, textAlign: 'center' }}>
                        Hemos procesado {(analysisState as any).totalMessages || 'miles de'} mensajes y detectado los patrones de comportamiento.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.replace('/')}
                        style={{
                            backgroundColor: '#22c55e',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 12,
                            width: '100%',
                            alignItems: 'center',
                            shadowColor: '#22c55e',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                            Hablar con la IA
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        );
    }

    // === ANALYSIS IN PROGRESS SCREEN ===
    if (isAnalyzing && analysisState) {
        const progress = analysisState.progress || 0;
        const currentPhase = analysisState.currentPhase || 'personality';

        // Animate progress smoothly
        Animated.timing(animatedProgress, {
            toValue: progress,
            duration: 500,
            useNativeDriver: false,
        }).start();

        const phases = [
            { id: 'init', label: 'Iniciando análisis...', done: progress > 5 },
            { id: 'psych', label: 'Analizando psicología...', done: progress > 30 },
            { id: 'prompt', label: 'Generando sistema maestro...', done: progress > 75 },
            { id: 'saving', label: 'Guardando perfil...', done: progress > 90 },
        ];


        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    {/* Brain Icon */}
                    <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 24
                    }}>
                        <Brain size={48} color="#a855f7" />
                    </View>

                    {/* Title */}
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
                        Analizando
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>
                        Esto puede tomar hasta 5 minutos...
                    </Text>

                    {/* Progress Bar - Animated for smooth transitions */}
                    <View style={{ width: '100%', marginBottom: 8 }}>
                        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <Animated.View style={{
                                height: '100%',
                                width: animatedProgress.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                }),
                                backgroundColor: '#22c55e',
                                borderRadius: 4
                            }} />
                        </View>
                    </View>
                    <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '600', marginBottom: 32 }}>
                        {Math.round(progress)}%
                    </Text>

                    {/* Phases Checklist */}
                    <View style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 16, padding: 16, width: '100%', marginBottom: 24
                    }}>
                        {phases.map((phase, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: phase.done ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                    alignItems: 'center', justifyContent: 'center', marginRight: 12
                                }}>
                                    {phase.done && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                                </View>
                                <Text style={{
                                    color: phase.done ? '#fff' : '#6b7280',
                                    fontSize: 14
                                }}>
                                    {phase.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Engine Label */}
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>
                        REMI AI ENGINE 2.0
                    </Text>

                    {/* DEBUG PANEL REMOVED */}
                </SafeAreaView>
            </View>
        );
    }

    // === ANALYSIS ERROR SCREEN ===
    // Show this if analysis failed (before checking for profile)
    if (analysisState?.status === 'error') {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 24
                    }}>
                        <AlertTriangle size={48} color="#ef4444" />
                    </View>

                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                        Error en el Análisis
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24, textAlign: 'center', paddingHorizontal: 16 }}>
                        {analysisState.error || 'Ocurrió un error durante el análisis. Por favor intenta de nuevo.'}
                    </Text>

                    {/* Debug logs for troubleshooting */}
                    {analysisLogs.length > 0 && (
                        <View style={{
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: 12, padding: 16, width: '100%', marginBottom: 24, maxHeight: 150
                        }}>
                            <Text style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
                                📋 Últimos pasos antes del error:
                            </Text>
                            <ScrollView style={{ maxHeight: 100 }}>
                                {analysisLogs.slice(-5).map((log, i) => (
                                    <Text key={i} style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>
                                        {log}
                                    </Text>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={{ width: '100%', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => router.replace('/tools/ex-simulator/import')}
                            style={{
                                backgroundColor: '#7c3aed',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                Intentar de Nuevo
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/')}
                            style={{
                                backgroundColor: 'transparent',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: '#374151'
                            }}
                        >
                            <Text style={{ color: '#9ca3af', fontSize: 16 }}>
                                Volver al Inicio
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Análisis</Text>
                    <View style={styles.headerSpacer} />
                </SafeAreaView>
                <View style={styles.emptyContainer}>
                    {loadError ? (
                        <>
                            <AlertTriangle size={64} color="#ef4444" />
                            <Text style={[styles.emptyText, { color: '#ef4444', marginTop: 16 }]}>Error: {loadError}</Text>
                            <TouchableOpacity
                                onPress={() => { setLoadError(null); setLoading(true); checkForAnalysisOrProfile(); }}
                                style={{ marginTop: 20, backgroundColor: '#374151', padding: 12, borderRadius: 8 }}
                            >
                                <Text style={{ color: '#fff' }}>Reintentar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Brain size={64} color="#6b7280" />
                            <Text style={styles.emptyText}>No hay perfil para analizar</Text>
                            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 10, textAlign: 'center' }}>Debug: IsAnalyzing={String(isAnalyzing)}{'\n'}Loading={String(loading)}</Text>
                        </>
                    )}
                </View>

                <PremiumUpgradeModal
                    visible={showPremiumModal}
                    onClose={() => {
                        setShowPremiumModal(false);
                        router.back();
                    }}
                    onUpgrade={() => {
                        setShowPremiumModal(false);
                        router.push('/paywall');
                    }}
                    {...premiumModalData}
                />
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
        analysisData.profile?.communicationStyle ||
        linguistics.overallStyle ||
        (analysisData.communication && analysisData.communication.style) ||
        'No disponible';

    // Helper: Determine Emotional Pattern
    // Order of preference:
    // 1. eq.emotionalRange
    // 2. inferred from dominantPartner boolean
    const emotionalPattern = eq.emotionalRange ||
        analysisData.emotionalPattern ||
        analysisData.profile?.emotionalTone ||
        (dynamics.dominantPartner ? 'variable' : 'estable');

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
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Análisis de {name}</Text>
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
                <View style={styles.simpleCard}>
                    <View style={styles.simpleCardHeader}>
                        <MessageCircle size={18} color="#6366f1" />
                        <Text style={[styles.simpleCardTitle, { color: '#6366f1' }]}>
                            Estilo de Comunicación
                        </Text>
                    </View>
                    <Text style={styles.simpleCardValue}>
                        {communicationStyle}
                    </Text>
                </View>

                {/* Emotional Patterns */}
                <View style={styles.simpleCard}>
                    <View style={styles.simpleCardHeader}>
                        <Heart size={18} color="#ec4899" />
                        <Text style={[styles.simpleCardTitle, { color: '#ec4899' }]}>
                            Patrones Emocionales
                        </Text>
                    </View>
                    <Text style={styles.simpleCardValue}>
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
                            {attachment.style || analysisData.attachmentStyle || analysisData.profile?.attachment?.style || 'No disponible'}
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
                        {dynamics.conflictStyle || analysisData.conflictManagement || analysisData.profile?.relationshipDynamics?.conflictStyle || 'No disponible'}
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
    },
    contentContainer: {
        padding: 16,
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
