import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/lib/storage';

export default function AnalysisScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Try analysis_view_profile first (from sidebar click)
            let stored = await storage.getItem('analysis_view_profile');
            if (stored) {
                setProfile(JSON.parse(stored));
            } else {
                // Fallback to current profile
                stored = await storage.getItem('exSimulator_currentProfile');
                if (stored) {
                    setProfile(JSON.parse(stored));
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
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
                    <Brain size={64} color="#6b7280" />
                    <Text style={styles.emptyText}>No hay perfil para analizar</Text>
                </View>
            </View>
        );
    }

    // Get data from the new profile structure
    // Note: Analysis data is stored in profile.profile from import.tsx
    const analysisData = profile.profile || profile; // Handle both nested and flat structures
    const name = profile.exName || analysisData.exName || 'Persona';
    const messageCount = profile.messageCount || analysisData.messageCount || 0;

    console.log('[Analysis] Profile keys:', Object.keys(profile));
    console.log('[Analysis] AnalysisData keys:', Object.keys(analysisData));

    // Big Five
    const bigFive = analysisData.bigFive || {};

    // Attachment
    const attachment = analysisData.attachment || {};

    // Love Language
    const loveLanguage = analysisData.loveLanguage || {};

    // Emotional Intelligence
    const eq = analysisData.emotionalIntelligence || {};

    // Triggers
    const triggers = analysisData.triggers || {};

    // Linguistics
    const linguistics = analysisData.linguistics || {};

    // Relationship Dynamics
    const dynamics = analysisData.relationshipDynamics || {};

    // Red Flags & Topics
    const redFlags = analysisData.redFlags || [];
    const topicsOfInterest = analysisData.topicsOfInterest || [];

    // Communication style (can be in different places)
    const communicationStyle = analysisData.communicationStyle ||
        linguistics.overallStyle ||
        (analysisData.communication && analysisData.communication.style) ||
        'No disponible';

    // Helper to render a score bar
    const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
        <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{label}</Text>
            <View style={styles.scoreBarBg}>
                <View style={[styles.scoreBarFill, { width: `${score * 10}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.scoreValue, { color }]}>{score}/10</Text>
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
                        {eq.emotionalRange || (dynamics.dominantPartner ? 'variable' : 'estable')}
                    </Text>
                </View>

                {/* Attachment Style */}
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

                {/* === BIG FIVE (OCEAN) - Technical Details === */}
                {bigFive.openness && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Brain size={20} color="#a855f7" />
                            <Text style={[styles.sectionTitle, { color: '#a855f7' }]}>
                                Personalidad (Big Five)
                            </Text>
                        </View>
                        <ScoreBar label="Apertura" score={bigFive.openness || 5} color="#a855f7" />
                        <ScoreBar label="Responsabilidad" score={bigFive.conscientiousness || 5} color="#3b82f6" />
                        <ScoreBar label="Extraversión" score={bigFive.extraversion || 5} color="#22c55e" />
                        <ScoreBar label="Amabilidad" score={bigFive.agreeableness || 5} color="#ec4899" />
                        <ScoreBar label="Neuroticismo" score={bigFive.neuroticism || 5} color="#f59e0b" />
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
                        <ScoreBar label="Miedo al abandono" score={attachment.fearOfAbandonment || 5} color="#ef4444" />
                        <ScoreBar label="Evita intimidad" score={attachment.avoidanceOfIntimacy || 5} color="#6b7280" />
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

                {/* === TOPICS OF INTEREST === */}
                {topicsOfInterest && topicsOfInterest.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Sparkles size={20} color="#22c55e" />
                            <Text style={[styles.sectionTitle, { color: '#22c55e' }]}>
                                Temas de Interés
                            </Text>
                        </View>
                        <View style={styles.tagRow}>
                            {topicsOfInterest.slice(0, 5).map((topic: string, i: number) => (
                                <View key={i} style={styles.tagSuccess}>
                                    <Text style={styles.tagTextSuccess}>{topic}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ⚠️ Este análisis es generado por IA basado en patrones de texto.
                        No reemplaza el consejo de un profesional de salud mental.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSafe: {
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
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
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
    },
    disclaimerText: {
        fontSize: 13,
        color: '#f59e0b',
        lineHeight: 20,
        textAlign: 'center',
    },
    // Simple card styles for summary sections
    simpleCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
});
