import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function SuccessPage() {
    const router = useRouter();
    const { session_id } = useLocalSearchParams();

    useEffect(() => {
        // Redirect to home after 3 seconds
        const timeout = setTimeout(() => {
            router.replace('/(tabs)');
        }, 3000);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <LinearGradient
            colors={['#0f0f23', '#1a0a2e', '#2d1b4e']}
            style={styles.container}
        >
            <StatusBar style="light" />

            <View style={styles.content}>
                <CheckCircle size={80} color="#22c55e" />

                <Text style={styles.title}>¡Suscripción exitosa!</Text>

                <Text style={styles.subtitle}>
                    Tu plan ha sido activado correctamente
                </Text>

                <Text style={styles.info}>
                    Redirigiendo al inicio...
                </Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        marginTop: 24,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 32,
    },
    info: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
    },
});
