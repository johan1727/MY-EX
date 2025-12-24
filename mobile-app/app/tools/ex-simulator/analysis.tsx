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
    TrendingUp,
    AlertTriangle,
    Sparkles,
    Clock,
    Users,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/lib/storage';

interface ExProfile {
    id: string;
    exName: string;
    profile: {
        communicationStyle?: string;
        emotionalPatterns?: string;
        conflictStyle?: string;
        attachmentStyle?: string;
        manipulationTactics?: string[];
        redFlags?: string[];
        positiveTraits?: string[];
        emotionalTone?: string;
    };
    messageCount: number;
    createdAt: string;
    masterPrompt?: string;
}

export default function AnalysisScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ExProfile | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const stored = await storage.getItem('exSimulator_currentProfile');
            if (stored) {
                setProfile(JSON.parse(stored));
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

    const p = profile.profile || {};

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Análisis de {profile.exName}</Text>
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
                                {profile.exName.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryName}>{profile.exName}</Text>
                            <Text style={styles.summaryStats}>
                                {profile.messageCount.toLocaleString()} mensajes analizados
                            </Text>
                            {profile.masterPrompt && (
                                <View style={styles.badge}>
                                    <Sparkles size={12} color="#22c55e" />
                                    <Text style={styles.badgeText}>Análisis Profundo</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* Analysis Sections */}
                <AnalysisSection
                    icon={<MessageCircle size={20} color="#3b82f6" />}
                    title="Estilo de Comunicación"
                    content={p.communicationStyle || 'No disponible'}
                    color="#3b82f6"
                />

                <AnalysisSection
                    icon={<Heart size={20} color="#ec4899" />}
                    title="Patrones Emocionales"
                    content={p.emotionalPatterns || p.emotionalTone || 'No disponible'}
                    color="#ec4899"
                />

                <AnalysisSection
                    icon={<Users size={20} color="#8b5cf6" />}
                    title="Estilo de Apego"
                    content={p.attachmentStyle || 'No disponible'}
                    color="#8b5cf6"
                />

                <AnalysisSection
                    icon={<TrendingUp size={20} color="#f59e0b" />}
                    title="Manejo de Conflictos"
                    content={p.conflictStyle || 'No disponible'}
                    color="#f59e0b"
                />

                {p.redFlags && p.redFlags.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={20} color="#ef4444" />
                            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>
                                Señales de Alerta
                            </Text>
                        </View>
                        <View style={styles.tagContainer}>
                            {p.redFlags.map((flag, i) => (
                                <View key={i} style={[styles.tag, styles.tagDanger]}>
                                    <Text style={styles.tagTextDanger}>{flag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {p.positiveTraits && p.positiveTraits.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Sparkles size={20} color="#22c55e" />
                            <Text style={[styles.sectionTitle, { color: '#22c55e' }]}>
                                Aspectos Positivos
                            </Text>
                        </View>
                        <View style={styles.tagContainer}>
                            {p.positiveTraits.map((trait, i) => (
                                <View key={i} style={[styles.tag, styles.tagSuccess]}>
                                    <Text style={styles.tagTextSuccess}>{trait}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {p.manipulationTactics && p.manipulationTactics.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={20} color="#f59e0b" />
                            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>
                                Tácticas de Manipulación Detectadas
                            </Text>
                        </View>
                        <View style={styles.tagContainer}>
                            {p.manipulationTactics.map((tactic, i) => (
                                <View key={i} style={[styles.tag, styles.tagWarning]}>
                                    <Text style={styles.tagTextWarning}>{tactic}</Text>
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

function AnalysisSection({ icon, title, content, color }: {
    icon: React.ReactNode;
    title: string;
    content: string;
    color: string;
}) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                {icon}
                <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
            </View>
            <Text style={styles.sectionContent}>{content}</Text>
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
    sectionContent: {
        fontSize: 15,
        color: '#d1d5db',
        lineHeight: 22,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    tagTextDanger: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '500',
    },
    tagSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    tagTextSuccess: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '500',
    },
    tagWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    tagTextWarning: {
        color: '#f59e0b',
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
});
