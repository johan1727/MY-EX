import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight, MessageSquare, BookOpen, Sparkles, ArrowLeft, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ExportGuideProps {
    onClose?: () => void;
    onBack?: () => void;
}

export default function ExportGuide({ onClose, onBack }: ExportGuideProps) {
    const whatsappSteps = [
        { title: 'Abre el chat', desc: 'Ve a la conversación en WhatsApp que quieres analizar.' },
        { title: 'Menú de opciones', desc: 'Toca los 3 puntos (⋮) en la esquina superior derecha.' },
        { title: 'Exportar chat', desc: 'Selecciona "Más" → "Exportar chat".' },
        { title: 'Sin archivos', desc: 'MUY IMPORTANTE: Elige "Sin archivos multimedia".', highlight: true },
        { title: 'Compartir a REMI', desc: 'Busca "REMI" en la lista de apps para compartir.' },
        { title: '¿No ves REMI?', desc: 'Desliza a la derecha o toca "Más" (...) para ver todas las apps disponibles.', isHint: true },
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
                    <View style={styles.headerIconContainer}>
                        <MessageSquare size={24} color="#22c55e" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>WhatsApp</Text>
                        <Text style={styles.headerSubtitle}>Paso a paso</Text>
                    </View>
                </View>

                {/* Vertical Steps Card */}
                <View style={styles.stepsCard}>
                    {whatsappSteps.map((step, idx) => (
                        <View key={idx} style={styles.stepRow}>
                            {/* Vertical Line Connector */}
                            {idx !== whatsappSteps.length - 1 && <View style={styles.stepLine} />}

                            {/* Step Number Bubble */}
                            <View style={[
                                styles.stepNumber,
                                step.highlight ? styles.stepNumberRed :
                                    step.isHint ? styles.stepNumberYellow : styles.stepNumberGreen
                            ]}>
                                <Text style={[
                                    styles.stepNumberText,
                                    step.highlight ? { color: '#ef4444' } :
                                        step.isHint ? { color: '#fbbf24' } : { color: '#4ade80' }
                                ]}>{idx + 1}</Text>
                            </View>

                            {/* Content */}
                            <View style={styles.stepContent}>
                                <Text style={[
                                    styles.stepTitle,
                                    step.highlight ? { color: '#fff' } :
                                        step.isHint ? { color: '#fbbf24' } : { color: '#fff' }
                                ]}>{step.title}</Text>
                                <Text style={styles.stepDesc}>{step.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Footer Note */}
                <View style={styles.footerNote}>
                    <Text style={styles.footerTitle}>¿REMI no aparece en la lista?</Text>
                    <View style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.footerText}>Si REMI no aparece, guarda el archivo .txt en tu dispositivo.</Text>
                    </View>
                    <View style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.footerText}>Luego abre REMI y sube el archivo desde aquí.</Text>
                    </View>
                </View>

                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.startButton}>
                        <Text style={styles.startButtonText}>Entendido, Empezar</Text>
                    </TouchableOpacity>
                )}
                <View style={{ height: 40 }} />
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
        padding: 20,
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
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(34,197,94,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.2)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: '#22c55e',
        fontSize: 14,
        fontWeight: '500',
    },
    stepsCard: {
        // No background, just transparent container for steps
        marginBottom: 24,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 24, // Increased spacing
        position: 'relative',
    },
    stepLine: {
        position: 'absolute',
        left: 14, // Center of circle (30px width / 2 might be 15, adjusting visually)
        top: 30,
        bottom: -24,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        zIndex: 10,
        borderWidth: 1,
        backgroundColor: '#050505', // Mask the line behind
    },
    stepNumberGreen: {
        borderColor: 'rgba(34,197,94,0.5)',
    },
    stepNumberRed: {
        borderColor: 'rgba(239,68,68,0.5)',
        backgroundColor: 'rgba(239,68,68,0.1)',
    },
    stepNumberYellow: {
        borderColor: 'rgba(251,191,36,0.5)',
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: '700',
    },
    stepContent: {
        flex: 1,
        paddingTop: 4, // Align text with number
    },
    stepTitle: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    stepDesc: {
        color: '#9ca3af',
        fontSize: 14,
        lineHeight: 20,
    },
    footerNote: {
        backgroundColor: '#0f172a', // Dark blue-ish
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    footerTitle: {
        color: '#60a5fa', // Blue-400
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 12,
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    bulletDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#60a5fa',
        marginTop: 8,
        marginRight: 10,
    },
    footerText: {
        color: '#93c5fd', // Blue-300
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    startButton: {
        marginTop: 32,
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
});
