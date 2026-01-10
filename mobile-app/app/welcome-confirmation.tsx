import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, AlertTriangle, ArrowRight } from 'lucide-react-native';

export default function WelcomeConfirmationScreen() {
    const router = useRouter();

    const handleContinue = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true');
        } catch (e) {
            console.error('Error saving welcome status:', e);
        }
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Header */}
                    <Text style={styles.title}>Bienvenido a SOYREMI</Text>
                    <Text style={styles.subtitle}>Tu espacio seguro de sanación y análisis.</Text>

                    {/* Warning Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <AlertTriangle size={24} color="#f59e0b" />
                            <Text style={styles.cardTitle}>Importante</Text>
                        </View>
                        <Text style={styles.cardText}>
                            SOYREMI utiliza Inteligencia Artificial avanzada para analizar tus conversaciones.
                            Aunque es muy precisa, la IA puede cometer errores.
                        </Text>
                        <Text style={styles.cardTextBold}>
                            Esta herramienta no sustituye la terapia profesional ni el consejo médico.
                        </Text>
                    </View>

                    {/* Privacy Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Shield size={24} color="#10b981" />
                            <Text style={[styles.cardTitle, { color: '#10b981' }]}>Tu Privacidad</Text>
                        </View>
                        <Text style={styles.cardText}>
                            Tus conversaciones son analizadas de forma anónima y segura.
                            <Text style={{ fontWeight: '700', color: '#fff' }}> NO guardamos tus mensajes originales</Text>, solo el análisis resultante.
                        </Text>
                    </View>

                    <View style={{ flex: 1 }} />

                    {/* Footer / Terms */}
                    <Text style={styles.footerText}>
                        Al continuar, aceptas nuestros{' '}
                        <Text style={styles.link} onPress={() => router.push('/terms')}>Términos de Servicio</Text>
                        {' '}y{' '}
                        <Text style={styles.link} onPress={() => router.push('/privacy')}>Política de Privacidad</Text>.
                    </Text>

                    {/* Continue Button */}
                    <TouchableOpacity style={styles.button} onPress={handleContinue}>
                        <Text style={styles.buttonText}>Aceptar y Continuar</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
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
        color: '#FFFFFF',
        marginTop: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#9CA3AF',
        marginBottom: 40,
    },
    card: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
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
        color: '#d1d5db',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 8,
    },
    cardTextBold: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '600',
    },
    footerText: {
        color: '#6b7280',
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
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        gap: 12,
    },
    buttonText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: '700',
    },
});
