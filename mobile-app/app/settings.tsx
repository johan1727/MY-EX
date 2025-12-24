import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, FileText, Heart, Mail, ExternalLink } from 'lucide-react-native';

export default function SettingsScreen() {
    const router = useRouter();

    const sections = [
        {
            title: 'Legal',
            items: [
                { icon: Shield, label: 'Política de Privacidad', action: () => Linking.openURL('https://github.com/yourrepo/privacy-policy') },
                { icon: FileText, label: 'Términos de Servicio', action: () => Linking.openURL('https://github.com/yourrepo/terms') },
            ]
        },
        {
            title: 'Contacto',
            items: [
                { icon: Mail, label: 'Contactar Soporte', action: () => Linking.openURL('mailto:support@exsimulator.com') },
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacidad y Legal</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Heart size={24} color="#ec4899" />
                    <Text style={styles.disclaimerTitle}>Aviso de Salud Mental</Text>
                    <Text style={styles.disclaimerText}>
                        Esta aplicación es una herramienta de práctica y autoconocimiento.
                        No reemplaza la terapia profesional. Si experimentas pensamientos
                        de autolesión, por favor busca ayuda profesional inmediatamente.
                    </Text>
                </View>

                {sections.map((section, i) => (
                    <View key={i} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.items.map((item, j) => (
                            <TouchableOpacity key={j} style={styles.menuItem} onPress={item.action}>
                                <item.icon size={20} color="#6b7280" />
                                <Text style={styles.menuItemLabel}>{item.label}</Text>
                                <ExternalLink size={16} color="#6b7280" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>Ex Simulator v1.0.0</Text>
                    <Text style={styles.appCopyright}>© 2024 Johan. Todos los derechos reservados.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    disclaimerBox: {
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    disclaimerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ec4899',
        marginTop: 12,
        marginBottom: 8,
    },
    disclaimerText: {
        fontSize: 14,
        color: '#d1d5db',
        textAlign: 'center',
        lineHeight: 22,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 1,
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    menuItemLabel: {
        flex: 1,
        fontSize: 15,
        color: '#e5e7eb',
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    appName: {
        fontSize: 14,
        color: '#6b7280',
    },
    appCopyright: {
        fontSize: 12,
        color: '#4b5563',
        marginTop: 4,
    },
});
