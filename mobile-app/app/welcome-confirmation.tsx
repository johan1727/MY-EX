import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/i18n';

export default function WelcomeConfirmationScreen() {
    const router = useRouter();

    const { isDark } = useTheme();
    const { t } = useLanguage();

    const handleContinue = () => {
        router.replace('/');
    };

    const bgColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const subTextColor = isDark ? '#9CA3AF' : '#4b5563';
    const cardBg = isDark ? '#1A1A1A' : '#f3f4f6';
    const cardBorder = isDark ? '#333' : '#e5e7eb';
    const cardTextColor = isDark ? '#d1d5db' : '#374151';
    const cardBoldColor = isDark ? '#fff' : '#111';

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Header */}
                    <Text style={[styles.title, { color: textColor }]}>{t('welcome_conf_title')}</Text>
                    <Text style={[styles.subtitle, { color: subTextColor }]}>{t('welcome_conf_subtitle')}</Text>

                    {/* Warning Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <AlertTriangle size={24} color="#f59e0b" />
                            <Text style={styles.cardTitle}>{t('welcome_conf_important')}</Text>
                        </View>
                        <Text style={[styles.cardText, { color: cardTextColor }]}>
                            {t('welcome_conf_ai_desc')}
                        </Text>
                        <Text style={[styles.cardTextBold, { color: cardBoldColor }]}>
                            {t('welcome_conf_not_therapy')}
                        </Text>
                    </View>

                    {/* Privacy Card */}
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <View style={styles.cardHeader}>
                            <Shield size={24} color="#10b981" />
                            <Text style={[styles.cardTitle, { color: '#10b981' }]}>{t('welcome_conf_privacy')}</Text>
                        </View>
                        <Text style={[styles.cardText, { color: cardTextColor }]}>
                            {t('welcome_conf_privacy_desc')}
                            <Text style={{ fontWeight: '700', color: cardBoldColor }}> {t('welcome_conf_no_storage')}</Text>, solo el análisis resultante.
                        </Text>
                    </View>

                    <View style={{ flex: 1 }} />

                    {/* Footer / Terms */}
                    <Text style={[styles.footerText, { color: subTextColor }]}>
                        {t('welcome_conf_terms')}{' '}
                        <Text style={styles.link} onPress={() => router.push('/terms')}>{t('pref_terms')}</Text>
                        {' '}y{' '}
                        <Text style={styles.link} onPress={() => router.push('/privacy')}>{t('pref_privacy_policy')}</Text>.
                    </Text>

                    {/* Continue Button */}
                    <TouchableOpacity style={[styles.button, isDark ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#111827' }]} onPress={handleContinue}>
                        <Text style={[styles.buttonText, isDark ? { color: '#000000' } : { color: '#FFFFFF' }]}>{t('welcome_conf_button')}</Text>
                        <ArrowRight size={20} color={isDark ? "#000" : "#fff"} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 40,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f59e0b',
    },
    cardText: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
    cardTextBold: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '600',
    },
    footerText: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    link: {
        color: '#A855F7',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        gap: 12,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '700',
    },
});
