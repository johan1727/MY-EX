import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MessageSquare, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ExportGuideProps {
    onClose?: () => void;
    onBack?: () => void;
}

export default function ExportGuide({ onClose, onBack }: ExportGuideProps) {
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const whatsappSteps = Platform.OS === 'web' ? [
        { title: t('guide_web_1_title'), desc: t('guide_web_1_desc') },
        { title: t('guide_web_2_title'), desc: t('guide_web_2_desc') },
        { title: t('guide_web_3_title'), desc: t('guide_web_3_desc'), highlight: true },
        { title: t('guide_web_4_title'), desc: t('guide_web_4_desc') },
        { title: t('guide_web_5_title'), desc: t('guide_web_5_desc') },
        { title: t('guide_web_6_title'), desc: t('guide_web_6_desc'), isHint: true },
    ] : [
        { title: t('guide_mob_1_title'), desc: t('guide_mob_1_desc') },
        { title: t('guide_mob_2_title'), desc: t('guide_mob_2_desc') },
        { title: t('guide_mob_3_title'), desc: t('guide_mob_3_desc') },
        { title: t('guide_mob_4_title'), desc: t('guide_mob_4_desc'), highlight: true },
        { title: t('guide_mob_5_title'), desc: t('guide_mob_5_desc') },
        { title: t('guide_mob_6_title'), desc: t('guide_mob_6_desc'), isHint: true },
    ];

    return (
        // Outer container is NOT a ScrollView — it's a View so the button stays fixed
        <View style={[styles.outerContainer, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
            {/* Scrollable content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient colors={isDark ? ['#1a1a2e', '#050505'] : ['#fafafa', '#fff']} style={styles.gradientBg}>
                    {/* Header */}
                    <View style={styles.header}>
                        {onBack && (
                            <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <ArrowLeft size={20} color={isDark ? "white" : "black"} />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)', borderColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.3)' }]}>
                            <MessageSquare size={24} color="#22c55e" />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>{t('guide_whatsapp_title')}</Text>
                            <Text style={styles.headerSubtitle}>{t('guide_step_by_step')}</Text>
                        </View>
                    </View>

                    {/* Vertical Steps Card */}
                    <View style={styles.stepsCard}>
                        {whatsappSteps.map((step, idx) => (
                            <View key={idx} style={styles.stepRow}>
                                {/* Vertical Line Connector */}
                                {idx !== whatsappSteps.length - 1 && <View style={[styles.stepLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />}

                                {/* Step Number Bubble */}
                                <View style={[
                                    styles.stepNumber,
                                    { backgroundColor: isDark ? '#050505' : '#fff' },
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
                                        { color: isDark ? '#fff' : '#000' },
                                        step.highlight ? { color: isDark ? '#fff' : '#ef4444' } :
                                            step.isHint ? { color: '#fbbf24' } : {}
                                    ]}>{step.title}</Text>
                                    <Text style={[styles.stepDesc, { color: isDark ? '#9ca3af' : '#666' }]}>{step.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Footer Note */}
                    <View style={[styles.footerNote, { backgroundColor: isDark ? '#0f172a' : '#e0f2fe', borderColor: isDark ? '#1e293b' : '#bae6fd' }]}>
                        <Text style={[styles.footerTitle, { color: isDark ? '#60a5fa' : '#0369a1' }]}>{t('guide_footer_title')}</Text>
                        <View style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: isDark ? '#60a5fa' : '#0369a1' }]} />
                            <Text style={[styles.footerText, { color: isDark ? '#93c5fd' : '#0c4a6e' }]}>{t('guide_footer_1')}</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: isDark ? '#60a5fa' : '#0369a1' }]} />
                            <Text style={[styles.footerText, { color: isDark ? '#93c5fd' : '#0c4a6e' }]}>{t('guide_footer_2')}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </ScrollView>

            {/* STICKY BUTTON — always visible at bottom */}
            {onClose && (
                <SafeAreaView edges={['bottom']} style={[styles.stickyFooter, { backgroundColor: isDark ? '#000' : '#fff', borderTopColor: isDark ? '#222' : '#e5e7eb' }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.startButton, { backgroundColor: isDark ? '#fff' : '#000' }]}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.startButtonText, { color: isDark ? '#000' : '#fff' }]}>{t('guide_btn_start')}</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
    },
    gradientBg: {
        padding: 20,
        paddingTop: 48,
        paddingBottom: 24,
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
        marginBottom: 24,
    },
    stepRow: {
        flexDirection: 'row',
        marginBottom: 24,
        position: 'relative',
    },
    stepLine: {
        position: 'absolute',
        left: 14,
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
        backgroundColor: '#050505',
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
        paddingTop: 4,
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
        backgroundColor: '#0f172a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    footerTitle: {
        color: '#60a5fa',
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
        color: '#93c5fd',
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    // Sticky footer button
    stickyFooter: {
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    startButton: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
});
