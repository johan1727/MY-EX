import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Star, Zap, Flame, Sparkles, ArrowRight } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { SubscriptionTier, SUBSCRIPTION_CONFIG } from '@/lib/subscriptions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PurchaseSuccessModalProps {
    visible: boolean;
    tier: SubscriptionTier;
    onClose: () => void;
}

// Plan icons and colors
const PLAN_VISUALS: Record<string, { icon: React.ReactNode; colors: [string, string]; accent: string }> = {
    [SubscriptionTier.EXPLORER]: {
        icon: <Star size={40} color="#fff" fill="#fff" />,
        colors: ['#06b6d4', '#0891b2'],
        accent: '#06b6d4',
    },
    [SubscriptionTier.WARRIOR]: {
        icon: <Zap size={40} color="#fff" fill="#fff" />,
        colors: ['#3b82f6', '#2563eb'],
        accent: '#3b82f6',
    },
    [SubscriptionTier.PHOENIX]: {
        icon: <Flame size={40} color="#fff" fill="#fff" />,
        colors: ['#f97316', '#ea580c'],
        accent: '#f97316',
    },
};

export default function PurchaseSuccessModal({ visible, tier, onClose }: PurchaseSuccessModalProps) {
    const confettiRef = useRef<ConfettiCannon>(null);
    const plan = SUBSCRIPTION_CONFIG[tier];
    const visuals = PLAN_VISUALS[tier] || PLAN_VISUALS[SubscriptionTier.EXPLORER];

    useEffect(() => {
        if (visible) {
            // Trigger haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Fire confetti after a brief delay
            setTimeout(() => {
                confettiRef.current?.start();
            }, 200);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                {/* Confetti */}
                <ConfettiCannon
                    ref={confettiRef}
                    count={150}
                    origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
                    autoStart={false}
                    fadeOut={true}
                    fallSpeed={3000}
                    explosionSpeed={350}
                    colors={['#a855f7', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#eab308', '#fff']}
                />

                <View style={styles.modal}>
                    {/* Plan Icon with gradient background */}
                    <LinearGradient
                        colors={visuals.colors}
                        style={styles.iconContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {visuals.icon}
                    </LinearGradient>

                    {/* Success Message */}
                    <Text style={styles.title}>¡Bienvenido!</Text>
                    <Text style={[styles.planName, { color: visuals.accent }]}>
                        {plan?.name || tier}
                    </Text>

                    {/* Simple confirmation */}
                    <Text style={styles.subtitle}>
                        Tu suscripción está activa
                    </Text>

                    {/* Continue Button */}
                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <LinearGradient
                            colors={visuals.colors}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>Continuar</Text>
                            <ArrowRight size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: SCREEN_WIDTH * 0.85,
        maxWidth: 340,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    planName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 28,
    },
    button: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
