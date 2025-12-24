import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfService() {
    const router = useRouter();

    const openExternalTerms = () => {
        Linking.openURL('https://soyremi.com/terms');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Términos de Servicio</Text>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Header Icon */}
                <View style={styles.iconHeader}>
                    <View style={styles.iconCircle}>
                        <FileText size={32} color="#a855f7" />
                    </View>
                </View>

                {/* Crisis Warning */}
                <View style={styles.warningBox}>
                    <AlertTriangle size={20} color="#ef4444" />
                    <Text style={styles.warningText}>
                        Si estás en crisis: Llama al 911 (MX) o 988 (US)
                    </Text>
                </View>

                {/* Main Card */}
                <View style={styles.card}>
                    <Text style={styles.updateText}>
                        Última actualización: 23 de diciembre de 2025
                    </Text>

                    <Text style={styles.sectionTitle}>1. Descargo de Responsabilidad</Text>
                    <Text style={styles.paragraph}>
                        SOYREMI <Text style={styles.redText}>NO ES</Text> un servicio médico ni psicológico. Es una herramienta de apoyo emocional y coaching de relaciones. No reemplaza la terapia profesional.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Contenido Generado por IA</Text>
                    <Text style={styles.paragraph}>
                        Esta app usa Google Gemini AI. La IA puede cometer errores o generar información inexacta. NO es un terapeuta humano y no puede diagnosticar condiciones de salud mental.
                    </Text>

                    <Text style={styles.sectionTitle}>3. Suscripciones y Pagos</Text>
                    <Text style={styles.bulletPoint}>• Los pagos se procesan via Google Play Store</Text>
                    <Text style={styles.bulletPoint}>• Reembolsos solo en las primeras 48 horas</Text>
                    <Text style={styles.bulletPoint}>• SOYREMI no gestiona reembolsos directamente</Text>

                    <Text style={styles.sectionTitle}>4. Limitación de Responsabilidad</Text>
                    <Text style={styles.paragraph}>
                        NO somos responsables por decisiones tomadas basándose en el contenido de la app, ni por daños emocionales, psicológicos o financieros derivados del uso.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Uso Aceptable</Text>
                    <Text style={styles.bulletPoint}>• No usar para acosar o dañar a otros</Text>
                    <Text style={styles.bulletPoint}>• No compartir contenido ilegal</Text>
                    <Text style={styles.bulletPoint}>• Ser mayor de 18 años</Text>
                </View>

                <TouchableOpacity onPress={openExternalTerms} style={styles.externalButton}>
                    <Text style={styles.externalButtonText}>Ver Términos Completos</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>
                    Al usar SOYREMI, aceptas estos Términos de Servicio.
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
        borderBottomColor: 'rgba(255,255,255,0.1)',
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
        borderColor: 'rgba(255,255,255,0.1)',
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
