import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight, MessageSquare, Send, Camera, BookOpen, Sparkles, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExportGuideProps {
    onClose?: () => void;
    onBack?: () => void;
}

export default function ExportGuide({ onClose, onBack }: ExportGuideProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('whatsapp');

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const whatsappSteps = [
        { title: 'Abre el chat', desc: 'Ve a la conversación en WhatsApp.' },
        { title: 'Menú', desc: 'Toca los 3 puntos (⋮) arriba a la derecha.' },
        { title: 'Exportar', desc: 'Selecciona "Más" → "Exportar chat".' },
        { title: 'Sin Archivos', desc: 'IMPORTANTE: Elige "Sin archivos".' },
        { title: 'Guardar', desc: 'Guarda el .txt y súbelo aquí.' }
    ];

    const telegramSteps = [
        { title: 'Abre el chat', desc: 'Ve a la conversación en Telegram.' },
        { title: 'Opciones', desc: 'Toca los 3 puntos (⋮) arriba a la derecha.' },
        { title: 'Exportar historial', desc: 'Selecciona la opción de exportar.' },
        { title: 'Formato JSON', desc: 'Selecciona "JSON" como formato.' },
    ];

    return (
        <ScrollView style={styles.container}>
            <LinearGradient colors={['#1a1a2e', '#050505']} style={styles.gradientBg}>
                {/* Header */}
                <View style={styles.header}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <ArrowLeft size={20} color="white" />
                        </TouchableOpacity>
                    )}
                    <LinearGradient
                        colors={['#8b5cf6', '#ec4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <BookOpen size={20} color="white" />
                    </LinearGradient>
                    <View>
                        <Text style={styles.headerTitle}>Guía</Text>
                        <Text style={styles.headerSubtitle}>Simulación</Text>
                    </View>
                </View>

                {/* WhatsApp Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('whatsapp')} style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={[styles.sectionIcon, styles.sectionIconWhatsApp]}>
                                <MessageSquare size={24} color="#22c55e" />
                            </View>
                            <View>
                                <Text style={styles.sectionTitle}>WhatsApp</Text>
                                <Text style={[styles.sectionBadge, { color: 'rgba(34,197,94,0.8)' }]}>Recomendado</Text>
                            </View>
                        </View>
                        {expandedSection === 'whatsapp' ? (
                            <ChevronDown size={24} color="#4b5563" />
                        ) : (
                            <ChevronRight size={24} color="#4b5563" />
                        )}
                    </TouchableOpacity>

                    {expandedSection === 'whatsapp' && (
                        <View style={styles.sectionContent}>
                            <View style={styles.divider} />
                            {whatsappSteps.map((step, idx) => (
                                <View key={idx} style={styles.stepRow}>
                                    {idx !== whatsappSteps.length - 1 && <View style={styles.stepLine} />}
                                    <View style={[styles.stepNumber, styles.stepNumberWhatsApp]}>
                                        <Text style={[styles.stepNumberText, { color: '#4ade80' }]}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepTitle}>{step.title}</Text>
                                        <Text style={styles.stepDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Telegram Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('telegram')} style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={[styles.sectionIcon, styles.sectionIconTelegram]}>
                                <Send size={24} color="#3b82f6" />
                            </View>
                            <View>
                                <Text style={styles.sectionTitle}>Telegram</Text>
                                <Text style={styles.sectionBadge}>Formato JSON</Text>
                            </View>
                        </View>
                        {expandedSection === 'telegram' ? (
                            <ChevronDown size={24} color="#4b5563" />
                        ) : (
                            <ChevronRight size={24} color="#4b5563" />
                        )}
                    </TouchableOpacity>

                    {expandedSection === 'telegram' && (
                        <View style={styles.sectionContent}>
                            <View style={styles.divider} />
                            {telegramSteps.map((step, idx) => (
                                <View key={idx} style={styles.stepRow}>
                                    {idx !== telegramSteps.length - 1 && <View style={styles.stepLine} />}
                                    <View style={[styles.stepNumber, styles.stepNumberTelegram]}>
                                        <Text style={[styles.stepNumberText, { color: '#60a5fa' }]}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepTitle}>{step.title}</Text>
                                        <Text style={styles.stepDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Screenshots Section */}
                <View style={styles.sectionCard}>
                    <TouchableOpacity onPress={() => toggleSection('screenshots')} style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={[styles.sectionIcon, styles.sectionIconScreenshots]}>
                                <Camera size={24} color="#a855f7" />
                            </View>
                            <View>
                                <Text style={styles.sectionTitle}>Screenshots</Text>
                                <Text style={[styles.sectionBadge, { color: 'rgba(168,85,247,0.8)' }]}>Experimental</Text>
                            </View>
                        </View>
                        {expandedSection === 'screenshots' ? (
                            <ChevronDown size={24} color="#4b5563" />
                        ) : (
                            <ChevronRight size={24} color="#4b5563" />
                        )}
                    </TouchableOpacity>

                    {expandedSection === 'screenshots' && (
                        <View style={styles.sectionContent}>
                            <View style={styles.divider} />
                            <View style={styles.screenshotNote}>
                                <Text style={styles.screenshotNoteText}>
                                    Esta opción usa OCR para leer tus capturas. Es útil si no puedes exportar el archivo, pero es menos precisa.
                                </Text>
                            </View>
                            <View style={styles.bulletRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>Toma capturas claras y legibles.</Text>
                            </View>
                            <View style={styles.bulletRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>Sube hasta 20 imágenes.</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Pro Tips */}
                <LinearGradient colors={['rgba(139,92,246,0.12)', 'rgba(59,130,246,0.12)']} style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <Sparkles size={20} color="#fbbf24" />
                        <Text style={styles.tipsTitle}>Tips para mejores resultados</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Text style={styles.tipCheck}>✓</Text>
                        <Text style={styles.tipText}>Cuantos <Text style={styles.tipBold}>más mensajes, mejor</Text> (10k, 50k, 200k+).</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Text style={styles.tipCheck}>✓</Text>
                        <Text style={styles.tipText}>Incluye charlas variadas: felices, discusiones, cotidianas.</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Text style={styles.tipCheck}>✓</Text>
                        <Text style={styles.tipText}>No edites el archivo de texto manualmente.</Text>
                    </View>
                </LinearGradient>

                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.startButton}>
                        <Text style={styles.startButtonText}>Entendido, Empezar</Text>
                    </TouchableOpacity>
                )}
                <View style={{ height: 80 }} />
            </LinearGradient>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    gradientBg: {
        padding: 24,
        minHeight: '100%',
        paddingTop: 48,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 1,
    },
    sectionCard: {
        marginBottom: 16,
        overflow: 'hidden',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#0f0f11',
    },
    sectionHeader: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIcon: {
        padding: 12,
        borderRadius: 999,
        marginRight: 16,
        borderWidth: 1,
    },
    sectionIconWhatsApp: {
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderColor: 'rgba(34,197,94,0.2)',
    },
    sectionIconTelegram: {
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderColor: 'rgba(59,130,246,0.2)',
    },
    sectionIconScreenshots: {
        backgroundColor: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.2)',
    },
    sectionTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
    },
    sectionBadge: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 1,
    },
    sectionContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 16,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 16,
        position: 'relative',
    },
    stepLine: {
        position: 'absolute',
        left: 11,
        top: 24,
        bottom: -20,
        width: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        zIndex: 10,
        borderWidth: 1,
    },
    stepNumberWhatsApp: {
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderColor: 'rgba(34,197,94,0.5)',
    },
    stepNumberTelegram: {
        backgroundColor: 'rgba(59,130,246,0.2)',
        borderColor: 'rgba(59,130,246,0.5)',
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: '700',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    stepDesc: {
        color: '#9ca3af',
        fontSize: 14,
        lineHeight: 20,
    },
    screenshotNote: {
        backgroundColor: 'rgba(168,85,247,0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.2)',
        marginBottom: 16,
    },
    screenshotNoteText: {
        color: '#c4b5fd',
        fontSize: 14,
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    bullet: {
        color: '#fff',
        fontWeight: '700',
        marginRight: 8,
    },
    bulletText: {
        color: '#d1d5db',
    },
    tipsCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 8,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    tipsTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginLeft: 8,
    },
    tipRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    tipCheck: {
        color: '#a855f7',
        fontWeight: '700',
        marginRight: 8,
    },
    tipText: {
        color: '#d1d5db',
        flex: 1,
    },
    tipBold: {
        color: '#fff',
        fontWeight: '700',
    },
    startButton: {
        marginTop: 32,
        backgroundColor: '#fff',
        paddingVertical: 20,
        borderRadius: 999,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 2,
    },
});
