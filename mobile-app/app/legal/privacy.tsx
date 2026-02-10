import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../lib/ThemeContext';
import { useLanguage } from '../../lib/i18n';

export default function PrivacyPolicy() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { t } = useLanguage();

    const openExternalPolicy = () => {
        Linking.openURL('https://doc-hosting.flycricket.io/remi-privacy-policy/05311c5a-0b5e-4454-8c86-d6176c777cd4/privacy');
    };

    return (
        <View style={[styles.container, !isDark && { backgroundColor: '#f9fafb' }]}>
            <SafeAreaView edges={['top']} style={[styles.header, !isDark && { backgroundColor: '#fff', borderBottomColor: '#e5e7eb' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={!isDark ? '#000' : 'white'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, !isDark && { color: '#000' }]}>{t('privacy_title')}</Text>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Header Icon */}
                <View style={styles.iconHeader}>
                    <View style={styles.iconCircle}>
                        <Shield size={32} color="#10b981" />
                    </View>
                </View>

                {/* Main Card */}
                <View style={[styles.card, !isDark && { backgroundColor: '#fff', borderColor: '#e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }]}>
                    <Text style={styles.updateText}>
                        {t('privacy_last_updated')}
                    </Text>

                    <TouchableOpacity onPress={openExternalPolicy} style={styles.externalButton}>
                        <Text style={styles.externalButtonText}>🌐 {t('privacy_official_btn')}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, !isDark && { color: '#111' }]}>{t('privacy_section_1_title')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_1_item_1')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_1_item_2')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_1_item_3')}</Text>

                    <Text style={[styles.sectionTitle, !isDark && { color: '#111' }]}>{t('privacy_section_2_title')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_2_item_1')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_2_item_2')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_2_item_3')}</Text>

                    <Text style={[styles.sectionTitle, !isDark && { color: '#111' }]}>{t('privacy_section_3_title')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>
                        {t('privacy_section_3_google')}
                    </Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>
                        {t('privacy_section_3_supabase')}
                    </Text>
                    <Text style={[styles.bulletPoint, styles.importantText]}>
                        ❌ {t('privacy_section_3_warning')}
                    </Text>

                    <Text style={[styles.sectionTitle, !isDark && { color: '#111' }]}>{t('privacy_section_4_title')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_4_item_1')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_4_item_2')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_4_item_3')}</Text>
                    <Text style={[styles.bulletPoint, !isDark && { color: '#4b5563' }]}>• {t('privacy_section_4_item_4')}</Text>

                    <Text style={[styles.sectionTitle, !isDark && { color: '#111' }]}>Seguridad</Text>
                    <Text style={[styles.paragraph, !isDark && { color: '#4b5563' }]}>
                        Usamos encriptación TLS/SSL para proteger tus datos. Sin embargo, ningún sistema es 100% seguro.
                    </Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightBoxText}>
                            ✅ Los chats que subes se ELIMINAN después del análisis. Solo guardamos el perfil analizado, NO los mensajes originales.
                        </Text>
                    </View>
                </View>

                <Text style={styles.footer}>
                    Cumplimos con GDPR (Europa), CCPA (California) y LFPDPPP (México).
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0c', // Darker background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#0a0a0c',
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
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
        marginBottom: 24,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    card: {
        backgroundColor: '#18181b', // Zinc 900
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 20,
    },
    updateText: {
        color: '#71717a', // Zinc 500
        fontSize: 12,
        marginBottom: 20,
        textAlign: 'center',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
    },
    bulletPoint: {
        color: '#d4d4d8', // Zinc 300
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
    paragraph: {
        color: '#d4d4d8',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 12,
    },
    highlight: {
        color: '#a855f7', // Purple
        fontWeight: '700',
    },
    bold: {
        color: '#fff',
        fontWeight: '700',
    },
    importantText: {
        color: '#ef4444',
        fontWeight: '700',
    },
    highlightBox: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    highlightBoxText: {
        color: '#34d399', // Emerald 400
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '500',
    },
    externalButton: {
        backgroundColor: '#10b981',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    externalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        color: '#52525b', // Zinc 600
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
});
