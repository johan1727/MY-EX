import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight, MessageSquare, BookOpen, Sparkles, ArrowLeft, Share2 } from 'lucide-react-native';
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
        { title: 'Abre el chat', desc: 'Ve a la conversación en WhatsApp que quieres analizar.' },
        { title: 'Menú de opciones', desc: 'Toca los 3 puntos (⋮) en la esquina superior derecha.' },
        { title: 'Exportar chat', desc: 'Selecciona "Más" → "Exportar chat".' },
        { title: '🔴 Sin archivos', desc: 'MUY IMPORTANTE: Elige "Sin archivos multimedia".' },
        { title: 'Compartir a REMI', desc: 'Busca "REMI" en la lista de apps para compartir.' },
        { title: '💡 ¿No ves REMI?', desc: 'Desliza a la derecha o toca "Más" (...) para ver todas las apps disponibles.' },
    ];

    const alternativeSteps = [
        { title: 'Opción alternativa', desc: 'Si REMI no aparece, guarda el archivo .txt en tu dispositivo.' },
        { title: 'Subir manualmente', desc: 'Luego abre REMI y sube el archivo desde aquí.' },
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
                        <Text style={styles.headerTitle}>Cómo Exportar</Text>
                        <Text style={styles.headerSubtitle}>Tu chat de WhatsApp</Text>
                    </View>
                </View>

                {/* Feature: Share directly to REMI */}
                <View style={styles.featureCard}>
                    <View style={styles.featureHeader}>
                        <Share2 size={24} color="#22c55e" />
                        <Text style={styles.featureTitle}>¡Nuevo! Comparte directo a REMI</Text>
                    </View>
                    <Text style={styles.featureDesc}>
                        Al exportar tu chat, busca "REMI" en la lista de apps para compartir. ¡Es la forma más fácil!
                    </Text>
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
                                <Text style={[styles.sectionBadge, { color: 'rgba(34,197,94,0.8)' }]}>Paso a paso</Text>
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

                            {/* Alternative method */}
                            <View style={styles.alternativeContainer}>
                                <Text style={styles.alternativeTitle}>¿REMI no aparece en la lista?</Text>
                                {alternativeSteps.map((step, idx) => (
                                    <View key={idx} style={styles.alternativeStep}>
                                        <Text style={styles.alternativeBullet}>•</Text>
                                        <Text style={styles.alternativeText}>{step.desc}</Text>
                                    </View>
                                ))}
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
                    <View style={styles.tipRow}>
                        <Text style={styles.tipCheck}>✓</Text>
                        <Text style={styles.tipText}>Exporta <Text style={styles.tipBold}>SIN archivos multimedia</Text>.</Text>
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
    featureCard: {
        backgroundColor: 'rgba(34,197,94,0.1)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.3)',
    },
    featureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureTitle: {
        color: '#22c55e',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 12,
    },
    featureDesc: {
        color: '#86efac',
        fontSize: 14,
        lineHeight: 20,
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
    alternativeContainer: {
        backgroundColor: 'rgba(59,130,246,0.1)',
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(59,130,246,0.2)',
    },
    alternativeTitle: {
        color: '#60a5fa',
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 8,
    },
    alternativeStep: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    alternativeBullet: {
        color: '#60a5fa',
        marginRight: 8,
    },
    alternativeText: {
        color: '#93c5fd',
        fontSize: 13,
        flex: 1,
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
