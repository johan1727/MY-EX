import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, FileText, Mail, ExternalLink, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyLegalScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacidad y Legal</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    {/* Mental Health Warning */}
                    <View style={styles.warningCard}>
                        <View style={styles.warningIcon}>
                            <Heart size={28} color="#ec4899" />
                        </View>
                        <Text style={styles.warningTitle}>Aviso de Salud Mental</Text>
                        <Text style={styles.warningText}>
                            Esta aplicación es una herramienta de práctica y autoconocimiento. No reemplaza la terapia profesional. Si experimentas pensamientos de autolesión, por favor busca ayuda profesional inmediatamente.
                        </Text>
                    </View>

                    {/* Legal Section */}
                    <Text style={styles.sectionLabel}>Legal</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/legal/privacy')}
                    >
                        <View style={styles.menuItemLeft}>
                            <Shield size={20} color="#9ca3af" />
                            <Text style={styles.menuItemText}>Política de Privacidad</Text>
                        </View>
                        <ExternalLink size={18} color="#6b7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/legal/terms')}
                    >
                        <View style={styles.menuItemLeft}>
                            <FileText size={20} color="#9ca3af" />
                            <Text style={styles.menuItemText}>Términos de Servicio</Text>
                        </View>
                        <ExternalLink size={18} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Contact Section */}
                    <Text style={styles.sectionLabel}>Contacto</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => Linking.openURL('mailto:soporte@soyremi.com')}
                    >
                        <View style={styles.menuItemLeft}>
                            <Mail size={20} color="#9ca3af" />
                            <Text style={styles.menuItemText}>Contactar Soporte</Text>
                        </View>
                        <ExternalLink size={18} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerVersion}>REMI v1.0.0</Text>
                        <Text style={styles.footerCopyright}>© 2024 REMI. Todos los derechos reservados.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    safeArea: {
        flex: 1,
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    warningCard: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.2)',
    },
    warningIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ec4899',
        marginBottom: 12,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 14,
        color: '#d1d5db',
        lineHeight: 22,
        textAlign: 'center',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    footer: {
        marginTop: 48,
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerVersion: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    footerCopyright: {
        fontSize: 12,
        color: '#4b5563',
    },
});
