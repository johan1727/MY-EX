import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, ChevronRight, X, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface UpgradeBannerProps {
    variant?: 'minimal' | 'full' | 'header' | 'limit-warning';
    remainingMessages?: number;
    onDismiss?: () => void;
}

export default function UpgradeBanner({
    variant = 'minimal',
    remainingMessages,
    onDismiss
}: UpgradeBannerProps) {
    const router = useRouter();

    const handleUpgrade = () => {
        router.push('/premium' as any);
    };

    // Header badge style - like ChatGPT "Upgrade to Plus"
    if (variant === 'header') {
        return (
            <TouchableOpacity onPress={handleUpgrade} style={styles.headerBadge} activeOpacity={0.7}>
                <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerGradient}
                >
                    <Sparkles size={12} color="#fff" />
                    <Text style={styles.headerText}>Mejorar plan</Text>
                    <X size={12} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    // Limit warning - when user runs low on messages
    if (variant === 'limit-warning') {
        // Calculate next reset time (midnight local time)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const resetTime = tomorrow.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.limitWarning}>
                <LinearGradient
                    colors={['rgba(245, 158, 11, 0.15)', 'rgba(249, 115, 22, 0.15)']}
                    style={styles.limitGradient}
                >
                    <View style={styles.limitContent}>
                        <Crown size={18} color="#f59e0b" />
                        <View style={styles.limitTextContainer}>
                            <Text style={styles.limitTitle}>
                                {remainingMessages === 0
                                    ? 'Se acabaron tus créditos'
                                    : `Te quedan ${remainingMessages} mensajes`}
                            </Text>
                            <Text style={styles.limitSubtitle}>
                                {remainingMessages === 0
                                    ? `Disponibles de nuevo a las ${resetTime}`
                                    : 'Obtén más con Premium'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleUpgrade} style={styles.limitButton}>
                        <Text style={styles.limitButtonText}>Mejorar</Text>
                    </TouchableOpacity>
                    {onDismiss && (
                        <TouchableOpacity onPress={onDismiss} style={styles.limitDismiss}>
                            <X size={16} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            </View>
        );
    }

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
    // Header badge - ChatGPT style
    headerBadge: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    headerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 6,
        borderRadius: 16,
    },
    headerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Limit warning
    limitWarning: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    limitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 12,
        gap: 8,
    },
    limitContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    limitTextContainer: {
        flex: 1,
    },
    limitTitle: {
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: '600',
    },
    limitSubtitle: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    limitButton: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    limitButtonText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '700',
    },
    limitDismiss: {
        padding: 4,
    },
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
