import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface UpgradeBannerProps {
    variant?: 'minimal' | 'full';
}

export default function UpgradeBanner({ variant = 'minimal' }: UpgradeBannerProps) {
    const router = useRouter();

    const handleUpgrade = () => {
        router.push('/premium' as any);
    };

    if (variant === 'full') {
        return (
            <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.9}>
                <LinearGradient
                    colors={['rgba(168, 85, 247, 0.15)', 'rgba(99, 102, 241, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fullBanner}
                >
                    <View style={styles.fullContent}>
                        <View style={styles.iconContainer}>
                            <Sparkles size={20} color="#a855f7" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.fullTitle}>Desbloquea REMI Premium</Text>
                            <Text style={styles.fullSubtitle}>
                                Mensajes ilimitados, análisis profundo y más
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color="#a855f7" />
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    // Minimal variant - ChatGPT style pill
    return (
        <TouchableOpacity onPress={handleUpgrade} style={styles.minimalBanner} activeOpacity={0.8}>
            <View style={styles.sparkleWrapper}>
                <Sparkles size={14} color="#a855f7" />
            </View>
            <Text style={styles.minimalText}>Obtener Premium</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // Minimal (ChatGPT style pill)
    minimalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        gap: 6,
    },
    sparkleWrapper: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    minimalText: {
        color: '#a855f7',
        fontSize: 13,
        fontWeight: '600',
    },
    // Full banner
    fullBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
    },
    fullContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    fullTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    fullSubtitle: {
        color: '#9ca3af',
        fontSize: 13,
    },
});
