import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
    const router = useRouter();

    const openExternalPolicy = () => {
        Linking.openURL('https://soyremi.com/privacy');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Política de Privacidad</Text>
            </SafeAreaView>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Header Icon */}
                <View style={styles.iconHeader}>
                    <View style={styles.iconCircle}>
                        <Shield size={32} color="#10b981" />
                    </View>
                </View>

                {/* Main Card */}
                <View style={styles.card}>
                    <Text style={styles.updateText}>
                        Última actualización: 23 de diciembre de 2025
                    </Text>

                    <Text style={styles.sectionTitle}>Información que Recopilamos</Text>
                    <Text style={styles.bulletPoint}>• Email y nombre (para tu cuenta)</Text>
                    <Text style={styles.bulletPoint}>• Conversaciones con la IA</Text>
                    <Text style={styles.bulletPoint}>• Datos de uso de la app</Text>

                    <Text style={styles.sectionTitle}>Cómo Usamos tus Datos</Text>
                    <Text style={styles.bulletPoint}>• Generar respuestas personalizadas de IA</Text>
                    <Text style={styles.bulletPoint}>• Mejorar el servicio</Text>
                    <Text style={styles.bulletPoint}>• Procesar suscripciones</Text>

                    <Text style={styles.sectionTitle}>Compartir con Terceros</Text>
                    <Text style={styles.bulletPoint}>
                        <Text style={styles.highlight}>Google Gemini AI:</Text> Tus conversaciones se envían a Google para generar respuestas
                    </Text>
                    <Text style={styles.bulletPoint}>
                        <Text style={styles.highlight}>Supabase:</Text> Almacenamiento y autenticación
                    </Text>
                    <Text style={[styles.bulletPoint, styles.importantText]}>
                        ❌ NO VENDEMOS tus datos a terceros
                    </Text>

                    <Text style={styles.sectionTitle}>Tus Derechos (LFPDPPP)</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Acceso:</Text> Ver tus datos</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Rectificación:</Text> Corregir datos</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Cancelación:</Text> Eliminar cuenta</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Oposición:</Text> Limitar uso de datos</Text>

                    <Text style={styles.sectionTitle}>Seguridad</Text>
                    <Text style={styles.paragraph}>
                        Usamos encriptación TLS/SSL para proteger tus datos. Sin embargo, ningún sistema es 100% seguro.
                    </Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightBoxText}>
                            ✅ Los chats que subes se ELIMINAN después del análisis. Solo guardamos el perfil analizado, NO los mensajes originales.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity onPress={openExternalPolicy} style={styles.externalButton}>
                    <Text style={styles.externalButtonText}>Ver Política Completa</Text>
                </TouchableOpacity>

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
        marginBottom: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
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
    highlight: {
        color: '#a855f7',
        fontWeight: '600',
    },
    bold: {
        color: '#fff',
        fontWeight: '600',
    },
    importantText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    highlightBox: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    highlightBoxText: {
        color: '#10b981',
        fontSize: 14,
        lineHeight: 22,
    },
    externalButton: {
        backgroundColor: '#10b981',
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
