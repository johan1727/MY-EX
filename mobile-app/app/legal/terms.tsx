import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/i18n';

export default function TermsOfService() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { t } = useLanguage();

    const bgColor = isDark ? '#000' : '#f9fafb';
    const textColor = isDark ? '#fff' : '#111';
    const subTextColor = isDark ? '#9ca3af' : '#4b5563';
    const cardBg = isDark ? '#1a1a1a' : '#ffffff';
    const cardBorder = isDark ? '#333' : '#e5e7eb';
    const headerBg = isDark ? '#000' : '#fff';
    const headerBorder = isDark ? '#333' : '#e5e7eb';

    const openExternalTerms = () => {
        Linking.openURL('https://doc-hosting.flycricket.io/remi-terms-of-use/2c7da39a-0b5d-4b93-81dd-4be8290ef358/terms');
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={isDark ? "white" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>{t('terms_title')}</Text>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Header Icon */}
                <View style={styles.iconHeader}>
                    <View style={styles.iconCircle}>
                        <FileText size={32} color="#a855f7" />
                    </View>
                </View>

                {/* Crisis Warning */}
                <View style={[styles.warningBox, !isDark && { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.warningText}>
                        {t('terms_crisis_warning')}
                    </Text>
                </View>

                {/* Main Card */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, !isDark && { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
                    <Text style={styles.updateText}>
                        {t('terms_last_updated')}
                    </Text>

                    <TouchableOpacity onPress={openExternalTerms} style={styles.externalButton}>
                        <Text style={styles.externalButtonText}>{t('terms_external_link')}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('terms_section_1_title')}</Text>
                    <Text style={[styles.paragraph, { color: subTextColor }]}>
                        {t('terms_section_1_text')}
                    </Text>

                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('terms_section_2_title')}</Text>
                    <Text style={[styles.paragraph, { color: subTextColor }]}>
                        {t('terms_section_2_text')}
                    </Text>

                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('terms_section_3_title')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_3_point_1')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_3_point_2')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_3_point_3')}</Text>

                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('terms_section_4_title')}</Text>
                    <Text style={[styles.paragraph, { color: subTextColor }]}>
                        {t('terms_section_4_text')}
                    </Text>

                    <Text style={[styles.sectionTitle, { color: textColor }]}>{t('terms_section_5_title')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_5_point_1')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_5_point_2')}</Text>
                    <Text style={[styles.bulletPoint, { color: subTextColor }]}>{t('terms_section_5_point_3')}</Text>
                </View>

                <Text style={[styles.footer, { color: subTextColor }]}>
                    {t('terms_footer')}
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    iconHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        gap: 12,
    },
    warningText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 20,
    },
    updateText: {
        color: '#6b7280',
        fontSize: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 12,
    },
    bulletPoint: {
        color: '#9ca3af',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 6,
    },
    paragraph: {
        color: '#9ca3af',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 12,
    },
    redText: {
        color: '#ef4444',
        fontWeight: '700',
    },
    externalButton: {
        backgroundColor: '#a855f7',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    externalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        color: '#4b5563',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 40,
    },
});